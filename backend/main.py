import os
import re
import json
import base64
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from prompts import SYSTEM_PROMPT, TWEAK_SYSTEM_PROMPT, RENDERER_CHAT_SYSTEM_PROMPT

load_dotenv()

# ── App Setup ────────────────────────────────────────────────────────────────
app = FastAPI(title="Antigravity – Power Apps YAML Generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "https://master.d1heggobl2rm6h.amplifyapp.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Gemini Setup ─────────────────────────────────────────────────────────────
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY environment variable is not set.")



# ── Pydantic Models ───────────────────────────────────────────────────────────
class GenerateRequest(BaseModel):
    prompt: str

class GenerateResponse(BaseModel):
    yaml_code: str

class CanvasComponent(BaseModel):
    id: str | None = None
    type: str

from typing import Dict, Any, Optional

class RendererChatRequest(BaseModel):
    message: str
    canvas_components: list[dict] = []
    canvas_width: int = 1300
    canvas_height: int = 750
    image_data: Optional[str] = None
    image_mime_type: Optional[str] = None

class RendererChatResponse(BaseModel):
    reply: str
    components_to_add: list[Dict[str, Any]] = []
    components_to_update: list[Dict[str, Any]] = []
    components_to_remove: list[str] = []

class TweakComponentRequest(BaseModel):
    prompt: str
    component: Dict[str, Any]
    canvas_width: int = 1300
    canvas_height: int = 750



genai.configure(api_key=api_key)
model = genai.GenerativeModel(
    model_name="gemini-3.1-flash-lite-preview",
    system_instruction=SYSTEM_PROMPT,
)

tweak_model = genai.GenerativeModel(
    model_name="gemini-3.1-flash-lite-preview",
    system_instruction=TWEAK_SYSTEM_PROMPT,
)

renderer_chat_model = genai.GenerativeModel(
    model_name="gemini-3.1-flash-lite-preview",
    system_instruction=RENDERER_CHAT_SYSTEM_PROMPT,
)


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Antigravity API"}


@app.post("/generate", response_model=GenerateResponse)
def generate_yaml(request: GenerateRequest):
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    try:
        response = model.generate_content(request.prompt.strip())
        raw_text: str = response.text

        # Strip any Markdown code fences the model may have added despite instructions
        cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", raw_text.strip())
        cleaned = re.sub(r"\n?```$", "", cleaned.strip())

        return GenerateResponse(yaml_code=cleaned.strip())

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(exc)}")


@app.post("/tweak-component")
def tweak_component(request: TweakComponentRequest):
    import json as json_module

    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    comp_json = json_module.dumps(request.component, indent=2)
    ctx = f"Canvas size: {request.canvas_width} x {request.canvas_height} px.\n"
    
    full_prompt = f"{ctx}\nComponent to tweak:\n{comp_json}\n\nUser request: {request.prompt.strip()}"

    try:
        response = tweak_model.generate_content(full_prompt)
        raw_text: str = response.text

        # Strip fences
        cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", raw_text.strip())
        cleaned = re.sub(r"\n?```$", "", cleaned.strip())

        # Return the modified component object dict directly
        return json_module.loads(cleaned)

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(exc)}")


@app.post("/renderer-chat", response_model=RendererChatResponse)
def renderer_chat(request: RendererChatRequest):
    import json as json_module

    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # Build context about current canvas state
    canvas_ctx = f"Canvas size: {request.canvas_width} x {request.canvas_height} px.\n"
    if request.canvas_components:
        comp_lines = []
        
        def process_component(c, indent=""):
            line = f'{indent}- ID: "{c.get("id")}", Type: "{c.get("type")}", x={c.get("x", 0)}, y={c.get("y", 0)}, w={c.get("width", 0)}, h={c.get("height", 0)}'
            if c.get("text"):
                line += f', text="{c.get("text")}"'
            if c.get("name"):
                line += f', name="{c.get("name")}"'
            comp_lines.append(line)
            for child in c.get("children", []):
                process_component(child, indent + "  ")
                
        for c in request.canvas_components:
            process_component(c)
            
        canvas_ctx += "Current components on canvas:\n" + "\n".join(comp_lines)
    else:
        canvas_ctx += "The canvas is currently empty."

    full_prompt = f"{canvas_ctx}\n\nUser prompt: {request.message.strip()}"

    contents = [full_prompt]
    if request.image_data and request.image_mime_type:
        contents.append({
            "mime_type": request.image_mime_type,
            "data": base64.b64decode(request.image_data)
        })

    try:
        response = renderer_chat_model.generate_content(contents)
        raw_text: str = response.text

        # Strip markdown fences if present
        cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", raw_text.strip())
        cleaned = re.sub(r"\n?```$", "", cleaned.strip())

        parsed = json_module.loads(cleaned)
        return RendererChatResponse(
            reply=parsed.get("reply", ""),
            components_to_add=parsed.get("components_to_add", []),
            components_to_update=parsed.get("components_to_update", []),
            components_to_remove=parsed.get("components_to_remove", []),
        )

    except json_module.JSONDecodeError:
        # If model didn't return valid JSON, treat as a plain reply
        return RendererChatResponse(reply=raw_text.strip(), components_to_add=[], components_to_update=[], components_to_remove=[])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(exc)}")
