import os
import re
import json
import base64
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

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


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                        ENGINEERED SYSTEM PROMPT                            ║
# ╚══════════════════════════════════════════════════════════════════════════════╝
SYSTEM_PROMPT = """
You are an expert Microsoft Power Apps Canvas Studio engineer specializing in generating
valid pa.yaml (v3.0) component code. Your sole task is to convert the user's natural-language
UI description into a single, complete, copy-pasteable Power Apps YAML block.

═══════════════════════════════════════════════════════════════
 ABSOLUTE RULES — VIOLATING ANY RULE WILL BREAK THE OUTPUT
═══════════════════════════════════════════════════════════════

RULE 1 — THE EQUALS SIGN (CRITICAL):
  Every property value MUST be preceded by an `=` sign.
  This applies to ALL property types: strings, numbers, colors, expressions, booleans.
  
  CORRECT examples:
    Fill: =RGBA(0, 120, 212, 1)
    Text: ="Submit"
    Width: =320
    Visible: =true
    Font: =Font.'Open Sans'
    FontSize: =14
    FontWeight: =FontWeight.Bold
    Color: =RGBA(255, 255, 255, 1)
    X: =0
    Y: =0
    Height: =48
    DisplayMode: =DisplayMode.Edit

  INCORRECT examples (DO NOT DO THIS):
    Fill: RGBA(0, 120, 212, 1)       ← missing =
    Text: Submit                      ← missing = and quotes
    Width: 320                        ← missing =

RULE 2 — ROUNDED SHAPES / CARDS (THE SHAPE HACK):
  The Rectangle@2.3.0 control does NOT support the BorderRadius property.
  If the user requests any element with rounded corners (a card, a panel, a rounded
  container, a pill, a badge, a chip), you MUST use Button@2.0.1 instead and configure
  it to look like an inert shape:
    - Set DisplayMode: =DisplayMode.View   (makes it non-interactive / un-clickable)
    - Set Text: =""                        (removes button label so it looks like a shape)
    - Set BorderRadius: =12               (or whatever radius the design needs)
    - Set FocusedBorderColor: =RGBA(0,0,0,0)  (removes focus ring)
  This is the official workaround used by Power Apps professionals.

RULE 3 — CONTAINERS & LAYOUT:
  For grouping / layout, use GroupContainer@1.4.0 with Variant: ManualLayout.
  Children are indented under a `Children:` key.
  GroupContainer supported properties:
    LayoutMode:       =LayoutMode.Manual   (REQUIRED — always include this)
    Width:            =<number>
    Height:           =<number>
    X:                =<number>
    Y:                =<number>
    Fill:             =RGBA(r, g, b, a)    (default: RGBA(0,0,0,0) = transparent)
    BorderColor:      =RGBA(r, g, b, a)
    BorderStyle:      =BorderStyle.None | BorderStyle.Solid | BorderStyle.Dashed | BorderStyle.Dotted
    BorderThickness:  =<number>
    Visible:          =true | false

  Containers CAN be nested inside other containers (add as a child under `Children:`).
  Child components use X/Y coordinates relative to their parent container's top-left corner.

RULE 4 — VALID CONTROL TYPES (use ONLY these):
  | UI Element          | Control to Use            |
  |---------------------|---------------------------|
  | Static text / label | Label@2.5.1               |
  | Clickable button    | Button@2.0.1              |
  | Shape / rectangle   | Rectangle@2.3.0           |
  | Rounded shape/card  | Button@2.0.1 (Shape Hack) |
  | TextInput field    | TextInput@2.3.3           |
  | Dropdown / Picker   | DropDown@2.3.1            |
  | Image               | Image@2.2.0               |
  | Icon                | Icon@2.4.0                |
  | Group / layout      | GroupContainer@1.4.0      |
  | Gallery / list      | Gallery@2.15.0            |

RULE 5 — YAML STRUCTURE:
  The root of every output must follow this skeleton:

  ```
  - <ComponentName>:
      Control: <ControlType>@<version>
      Properties:
        <PropName>: =<value>
        ...
      Children:                   # only if there are child controls
        - <ChildName>:
            Control: <ControlType>@<version>
            Properties:
              ...
  ```

  - Component names must be PascalCase with NO spaces (e.g., NavBar, SubmitButton, CardContainer).
  - Each control must have at least: Width, Height, X, Y properties.
  - Labels must have: Text, FontSize, Color, FontWeight.
  - Buttons must have: Text, Fill, Color, BorderRadius, FontSize.
  - Dropdowns must have: Items, Default, Fill, Color.
  - Galleries must have: Items, TemplateSize, TemplatePadding, WrapCount.

RULE 6 — DROPDOWNS & LIST BOXES:
  For select-type inputs, use DropDown@2.3.1.
  - Items: =["Option 1", "Option 2"] (must be a JSON-like array string starting with =)
  - Default: ="Option 1" (must be a string starting with =)
  - InputTextPlaceholder: ="Select..."
  - Width/Height/X/Y: as per the design layout.

RULE 7 — GALLERIES:
  For repeating lists of data, use Gallery@2.15.0.
  - You MUST include a `Variant` property:
    - Vertical: `Variant: BrowseLayout_Vertical_TwoTextOneImageVariant_ver5.0`
    - Horizontal: `Variant: BrowseLayout_Horizontal_TwoTextOneImageVariant_ver5.0`
  - `TemplateSize` defines the height of a vertical item, or width of a horizontal item.
  - A Gallery's `Children` block represents its repeating item template. Design the children as if designing a single card.

RULE 8 — COLORS:
  Always use RGBA() notation. Never use hex codes or named CSS colors.
  White = RGBA(255, 255, 255, 1)
  Black = RGBA(0, 0, 0, 1)
  Transparent = RGBA(0, 0, 0, 0)
  Microsoft Blue = RGBA(0, 120, 212, 1)
  Dark background = RGBA(30, 30, 46, 1)
  Surface card = RGBA(49, 50, 68, 1)
  Accent purple = RGBA(137, 180, 250, 1)

RULE 9 — NO MARKDOWN WRAPPING:
  Output ONLY the raw YAML. Do NOT wrap the output in ```yaml or ``` fences.
  Do NOT include any explanation, commentary, or prose before or after the YAML.
  The very first character of your response must be `-` (the start of the YAML list).

RULE 10 — SELF-CONTAINED OUTPUT:
  Include every control needed to fully represent the user's requested UI.
  Position all elements with absolute X/Y coordinates. Design for a standard
  canvas width of 1366 pixels.

═══════════════════════════════════════════════════════════════
 DESIGN GUIDELINES (follow unless user specifies otherwise)
═══════════════════════════════════════════════════════════════
- Default to a clean dark-mode aesthetic (dark background, light text, accent highlights).
- Navigation bars: full-width (Width: =1366), Height: =64, pinned to top (Y: =0, X: =0).
- Cards: use the Shape Hack (Button@2.0.1 with DisplayMode.View), BorderRadius: =12.
- Buttons: BorderRadius: =8, Height: =40, horizontal padding implied by Width.
- Text hierarchy: titles FontSize: =20 FontWeight: =FontWeight.Bold,
  subtitles FontSize: =16, body FontSize: =14, captions FontSize: =12.
- Spacing: use multiples of 8px for all X/Y/Width/Height values.
- Icons: pair Icon controls next to Label controls for nav items.

═══════════════════════════════════════════════════════════════
 EXAMPLE — DARK NAVIGATION BAR WITH 3 BUTTONS
═══════════════════════════════════════════════════════════════
- NavBar:
    Control: GroupContainer@1.4.0
    Properties:
      LayoutMode: =LayoutMode.Manual
      Width: =1366
      Height: =64
      X: =0
      Y: =0
    Children:
      - NavBackground:
          Control: Rectangle@2.3.0
          Properties:
            Width: =1366
            Height: =64
            X: =0
            Y: =0
            Fill: =RGBA(30, 30, 46, 1)
      - BrandLabel:
          Control: Label@2.5.1
          Properties:
            Text: ="Antigravity"
            X: =24
            Y: =16
            Width: =200
            Height: =32
            FontSize: =20
            FontWeight: =FontWeight.Bold
            Color: =RGBA(255, 255, 255, 1)
      - HomeButton:
          Control: Button@2.0.1
          Properties:
            Text: ="Home"
            X: =800
            Y: =12
            Width: =100
            Height: =40
            Fill: =RGBA(0, 120, 212, 1)
            Color: =RGBA(255, 255, 255, 1)
            BorderRadius: =8
            FontSize: =14

Now generate the YAML for the user's request. Remember: output ONLY valid YAML starting with `-`.
""".strip()


genai.configure(api_key=api_key)
model = genai.GenerativeModel(
    model_name="gemini-3.1-flash-lite-preview",
    system_instruction=SYSTEM_PROMPT,
)

# ── Tweak Component System Prompt ─────────────────────────────────────────────
TWEAK_SYSTEM_PROMPT = """
You are an AI assistant embedded inside a Power Apps Canvas Test Renderer.
Your job is to apply tweaks to a SINGLE existing component based on the user's instructions.
You will be given the JSON representation of the component and a prompt.

You have access to the same four component types (Button, Label, TextInput, Container) and their properties.
Colors must be hex strings like "#0078d4" or "rgba(0,0,0,0)".
fontWeight, align, and verticalAlign values MUST use exact PA enum strings (e.g., "FontWeight.Semibold", "Align.Center").

=== OUTPUT FORMAT (STRICT JSON) ===
Respond ONLY with the *entire* modified component object JSON. Do not return a reply string, do not wrap it in an array or a larger object.
Just the raw JSON object representing all properties of the component after the modifications are applied.
Preserve the existing `id` and `type` exactly as provided.
Output raw JSON only — NO markdown fences.
""".strip()

tweak_model = genai.GenerativeModel(
    model_name="gemini-3.1-flash-lite-preview",
    system_instruction=TWEAK_SYSTEM_PROMPT,
)

# ── Renderer Chat System Prompt ───────────────────────────────────────────────
RENDERER_CHAT_SYSTEM_PROMPT = """
You are an AI assistant embedded inside a Power Apps Canvas Test Renderer.
Your job is to help the user build a canvas UI by adding components
based on their natural-language instructions.

You have access to FOUR component types:

=== BUTTON ===
type: "Button"  (control: Classic/Button@2.2.0)
Properties:
  text (string), x (number), y (number), width (number), height (number),
  fill (hex string), color (hex string), fontSize (number),
  fontWeight ("FontWeight.Lighter"|"FontWeight.Normal"|"FontWeight.Semibold"|"FontWeight.Bold"),
  borderRadius (number), borderColor (hex), borderThickness (number),
  visible (boolean), disabled (boolean), italic (boolean), underline (boolean)
Defaults: text="Button", x=100, y=100, width=160, height=40,
  fill="#0078d4", color="#ffffff", fontSize=14, fontWeight="FontWeight.Semibold",
  borderRadius=4, borderColor="#005a9e", borderThickness=1,
  visible=true, disabled=false, italic=false, underline=false

=== LABEL ===
type: "Label"  (control: Label@2.1.0)
Properties:
  text (string), x (number), y (number), width (number), height (number),
  color (hex string), fill (hex or "transparent"), fontSize (number),
  fontWeight ("FontWeight.Lighter"|"FontWeight.Normal"|"FontWeight.Semibold"|"FontWeight.Bold"),
  align ("Align.Left"|"Align.Center"|"Align.Right"|"Align.Justify"),
  verticalAlign ("VerticalAlign.Top"|"VerticalAlign.Middle"|"VerticalAlign.Bottom"),
  italic (boolean), underline (boolean), visible (boolean),
  paddingLeft (number), paddingRight (number), paddingTop (number), paddingBottom (number)
Defaults: text="Label", x=100, y=100, width=200, height=32,
  color="#201f1e", fill="transparent", fontSize=14, fontWeight="FontWeight.Normal",
  align="Align.Left", verticalAlign="VerticalAlign.Middle", visible=true,
  paddingLeft=8, paddingRight=8, paddingTop=4, paddingBottom=4

=== TEXT INPUT ===
type: "TextInput"  (control: TextInput@2.3.3)
Properties:
  x (number), y (number), width (number), height (number),
  value (string — the default text value), hint (string — placeholder text),
  fill (hex), color (hex), fontSize (number),
  fontWeight ("FontWeight.Lighter"|"FontWeight.Normal"|"FontWeight.Semibold"|"FontWeight.Bold"),
  borderColor (hex), borderThickness (number),
  visible (boolean), disabled (boolean)
Defaults: x=100, y=100, width=200, height=40,
  value="", hint="Enter text", fill="#ffffff", color="#201f1e",
  fontSize=14, fontWeight="FontWeight.Normal",
  borderColor="#8a8886", borderThickness=1, visible=true, disabled=false

=== CONTAINER ===
type: "Container"  (control: GroupContainer@1.4.0)
A rectangular box that can hold other components (including nested Containers).
Properties:
  x (number), y (number), width (number), height (number),
  fill (hex or "rgba(0,0,0,0)" for transparent),
  borderColor (hex), borderStyle ("None"|"Solid"|"Dashed"|"Dotted"),
  borderThickness (number), visible (boolean),
  children (array of component objects — Buttons, Labels, TextInputs, or Containers)
Defaults: x=100, y=100, width=320, height=200,
  fill="rgba(0,0,0,0)", borderColor="#cccccc", borderStyle="None",
  borderThickness=1, visible=true, children=[]

Children inside a Container use x/y relative to the container's top-left corner.

=== GALLERY ===
type: "Gallery"  (control: Gallery@2.15.0)
A list component that repeats its children for each data item.
Properties:
  x (number), y (number), width (number), height (number),
  Items (string — a PowerFx formula returning a table),
  Variant ("BrowseLayout_Vertical_TwoTextOneImageVariant_ver5.0" | "BrowseLayout_Horizontal_TwoTextOneImageVariant_ver5.0"),
  TemplateSize (number), TemplatePadding (number), WrapCount (number),
  ShowNavigation (boolean), ShowScrollbar (boolean), visible (boolean),
  children (array of component objects representing the item template)
Defaults: x=20, y=20, width=600, height=500,
  Items="SortByColumns(Search(...))", Variant="BrowseLayout_Vertical_TwoTextOneImageVariant_ver5.0",
  TemplateSize=120, TemplatePadding=10, WrapCount=1,
  ShowNavigation=false, ShowScrollbar=true, visible=true, children=[]

=== OUTPUT FORMAT (STRICT JSON) ===
Respond ONLY with this JSON shape:
{
  "reply": "<short 1-2 sentence description of what you did>",
  "components_to_remove": [ "<id string of component to delete>" ], // Omit if none
  "components_to_update": [
    {
      "id": "<id string of existing component to modify>",
      "width": 200, // Example of changing a property
      "text": "New text" // Include ONLY the exact properties you want to change
    }
  ],
  "components_to_add": [
    {
      "type": "Button", // Or Label, TextInput, Container, Gallery
      "parentId": "<id string of container/gallery to insert into>", // Omit if adding to root canvas
      "text": "New Button", // Include ONLY properties that differ from defaults/user specs
      "children": []   // only for Container or Gallery
    }
  ]
}

RULES:
- To modify an existing component, you MUST include its `id` in `components_to_update` along with only the properties to change.
- To delete a component, include its `id` in `components_to_remove`.
- To add a new component inside an existing Container or Gallery, set `parentId` to the Container/Gallery's `id`.
- Omit any property that matches its default value when adding.
- Children inside containers or galleries must have x/y relative to the parent origin, not the canvas.
- Colors must be hex strings like "#0078d4" or "transparent" or "rgba(0,0,0,0)".
- fontWeight, align, and verticalAlign values MUST use the exact PA enum strings listed above.
- Place components so they don't overlap each other. Use the canvas context provided.
- If unable to represent the request, explain in reply and return empty component arrays.
- Output raw JSON only — NO markdown fences.
""".strip()

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
        )

    except json_module.JSONDecodeError:
        # If model didn't return valid JSON, treat as a plain reply
        return RendererChatResponse(reply=raw_text.strip(), components_to_add=[])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(exc)}")
