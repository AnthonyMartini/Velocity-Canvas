import re
import os
import google.generativeai as genai

api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

SYSTEM_PROMPT = """
You are an AI assistant embedded inside a Power Apps Canvas Test Renderer.
Your job is to help the user build a canvas UI by adding components
based on their natural-language instructions.

You have access to FOUR component types: Button, Label, TextInput, Container.

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
      "type": "Button", // Or Label, TextInput, Container
      "parentId": "<id string of container to insert into>", // Omit if adding to root canvas
      "text": "New Button", // Include ONLY properties that differ from defaults/user specs
      "children": []   // only for Container
    }
  ]
}

RULES:
- To modify an existing component, you MUST include its `id` in `components_to_update` along with only the properties to change. Do NOT put updates in components_to_add.
- To delete a component, include its `id` in `components_to_remove`.
- To add a new component inside an existing Container, set `parentId` to the Container's `id`.
- Output raw JSON only — NO markdown fences.
"""

renderer_chat_model = genai.GenerativeModel(
    model_name="gemini-2.5-flash-lite",
    system_instruction=SYSTEM_PROMPT,
)

canvas_ctx = '''Canvas size: 1300 x 750 px.
Current components on canvas:
- ID: "comp_1", Type: "Button", x=100, y=100, w=160, h=40, text="Button1"'''

full_prompt = f"{canvas_ctx}\n\nUser request: Change the button text to SUBMIT"
print("Calling API...")
response = renderer_chat_model.generate_content(full_prompt)
print(response.text)
