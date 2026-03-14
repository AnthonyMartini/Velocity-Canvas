import os
import re
import json
import base64
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import datetime
from typing import Dict, Any, Optional
from prompts import SYSTEM_PROMPT, TWEAK_SYSTEM_PROMPT, RENDERER_CHAT_SYSTEM_PROMPT

# ── Logging Utility ──────────────────────────────────────────────────────────
def log_llm_interaction(endpoint: str, input_prompt: str, response_text: str, usage: Any):
    try:
        # Use absolute path for robustness
        base_dir = os.path.dirname(os.path.abspath(__file__))
        log_dir = os.path.join(base_dir, "logs")
        if not os.path.exists(log_dir):
            os.makedirs(log_dir, exist_ok=True)
            print(f"Created log directory at: {log_dir}")
            
        log_file = os.path.join(log_dir, "llm_trace.jsonl")
        
        log_entry = {
            "timestamp": datetime.datetime.now().isoformat(),
            "endpoint": endpoint,
            "input": input_prompt,
            "output": response_text,
            "usage": {
                "prompt_tokens": usage.prompt_token_count if usage else 0,
                "candidates_tokens": usage.candidates_token_count if usage else 0
            }
        }
        
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry) + "\n")
        print(f"Logged interaction to {log_file}")
    except Exception as e:
        print(f"Failed to log interaction: {e}")

load_dotenv()

# ── App Setup ────────────────────────────────────────────────────────────────
app = FastAPI(title="Antigravity – Power Apps YAML Generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "https://www.velocitycanvas.com"],
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

class UsageMetadata(BaseModel):
    prompt_token_count: int
    candidates_token_count: int

class GenerateResponse(BaseModel):
    yaml_code: str
    usage: UsageMetadata

class CanvasComponent(BaseModel):
    id: str | None = None
    type: str


class RendererChatRequest(BaseModel):
    message: str
    canvas_components: list[dict] = []
    canvas_width: int = 1300
    canvas_height: int = 750
    image_data: Optional[str] = None
    image_mime_type: Optional[str] = None
    chat_history: list[dict] = []

class RendererChatResponse(BaseModel):
    reply: str
    components_to_add: list[Dict[str, Any]] = []
    components_to_update: list[Dict[str, Any]] = []
    components_to_remove: list[str] = []
    usage: UsageMetadata

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

        # Log token usage
        usage = response.usage_metadata
        print(f"Generate YAML Tokens: Input={usage.prompt_token_count}, Output={usage.candidates_token_count}")

        return GenerateResponse(
            yaml_code=cleaned.strip(),
            usage=UsageMetadata(
                prompt_token_count=usage.prompt_token_count,
                candidates_token_count=usage.candidates_token_count
            )
        )

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(exc)}")
    finally:
        if 'response' in locals() and 'raw_text' in locals():
            log_llm_interaction("/generate", request.prompt, raw_text, response.usage_metadata)


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

        # Log token usage
        usage = response.usage_metadata
        print(f"Tweak Component Tokens: Input={usage.prompt_token_count}, Output={usage.candidates_token_count}")

        # Return the modified component object dict directly
        return json_module.loads(cleaned)

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(exc)}")
    finally:
        if 'response' in locals() and 'raw_text' in locals():
            log_llm_interaction("/tweak-component", full_prompt, raw_text, response.usage_metadata)


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

    contents: list[Dict[str, Any]] = []
    
    for msg in request.chat_history:
        role = "user" if msg.get("role") == "user" else "model"
        parts = []
        if msg.get("content"):
            parts.append(msg.get("content"))
        img = msg.get("image")
        if img and isinstance(img, str):
            mime_match = re.search(r"data:(.*?);base64,(.*)", img)
            if mime_match:
                parts.append({
                    "mime_type": mime_match.group(1),
                    "data": base64.b64decode(mime_match.group(2))
                })
        if parts:
            contents.append({"role": role, "parts": parts})

    current_parts = [full_prompt]
    if request.image_data and request.image_mime_type:
        current_parts.append({
            "mime_type": request.image_mime_type,
            "data": base64.b64decode(request.image_data)
        })
    contents.append({"role": "user", "parts": current_parts})

    try:
        response = renderer_chat_model.generate_content(contents)
        raw_text: str = response.text

        # Strip markdown fences if present
        cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", raw_text.strip())
        cleaned = re.sub(r"\n?```$", "", cleaned.strip())

        parsed = json_module.loads(cleaned)
        usage = response.usage_metadata
        return RendererChatResponse(
            reply=parsed.get("reply", ""),
            components_to_add=parsed.get("components_to_add", []),
            components_to_update=parsed.get("components_to_update", []),
            components_to_remove=parsed.get("components_to_remove", []),
            usage=UsageMetadata(
                prompt_token_count=usage.prompt_token_count,
                candidates_token_count=usage.candidates_token_count
            )
        )

    except json_module.JSONDecodeError:
        # Log token usage even on failure if response exists
        usage = response.usage_metadata
        if 'response' in locals():
            print(f"Renderer Chat Tokens (JSON Error): Input={usage.prompt_token_count}, Output={usage.candidates_token_count}")
        
        # If model didn't return valid JSON, treat as a plain reply
        return RendererChatResponse(
            reply=raw_text.strip(), 
            components_to_add=[], 
            components_to_update=[], 
            components_to_remove=[],
            usage=UsageMetadata(
                prompt_token_count=usage.prompt_token_count,
                candidates_token_count=usage.candidates_token_count
            )
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(exc)}")
    finally:
        # Log token usage for successful path
        if 'response' in locals() and 'parsed' in locals():
             usage = response.usage_metadata
             print(f"Renderer Chat Tokens: Input={usage.prompt_token_count}, Output={usage.candidates_token_count}")
             log_llm_interaction("/renderer-chat", full_prompt, raw_text, usage)
        elif 'response' in locals() and 'raw_text' in locals():
             # Case where JSON failed but we have a text reply
             log_llm_interaction("/renderer-chat", full_prompt, raw_text, response.usage_metadata)
