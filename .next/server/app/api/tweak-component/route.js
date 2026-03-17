(()=>{var e={};e.id=916,e.ids=[916],e.modules={10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},22918:(e,t,o)=>{"use strict";o.r(t),o.d(t,{patchFetch:()=>m,routeModule:()=>p,serverHooks:()=>h,workAsyncStorage:()=>d,workUnitAsyncStorage:()=>c});var r={};o.r(r),o.d(r,{POST:()=>u});var n=o(42706),a=o(28203),i=o(45994),s=o(39187),l=o(86313);async function u(e){try{let{prompt:t,component:o,canvas_width:r,canvas_height:n}=await e.json();if(!t)return s.NextResponse.json({error:"Prompt is required"},{status:400});let a=JSON.stringify(o,null,2),i=`Canvas size: ${r} x ${n} px.
`,u=`${i}
Component to tweak:
${a}

User request: ${t.trim()}`,p=(await l.Q3.generateContent(u)).response.text().replace(/^```[a-zA-Z]*\n?/,"").replace(/\n?```$/,"").trim();return s.NextResponse.json(JSON.parse(p))}catch(e){return console.error("Gemini API error:",e),s.NextResponse.json({error:e.message},{status:500})}}let p=new n.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/tweak-component/route",pathname:"/api/tweak-component",filename:"route",bundlePath:"app/api/tweak-component/route"},resolvedPagePath:"C:\\Users\\antho\\Documents\\AntiGravity\\Velocity Canvas\\src\\app\\api\\tweak-component\\route.tsx",nextConfigOutput:"",userland:r}),{workAsyncStorage:d,workUnitAsyncStorage:c,serverHooks:h}=p;function m(){return(0,i.patchFetch)({workAsyncStorage:d,workUnitAsyncStorage:c})}},96487:()=>{},78335:()=>{},86313:(e,t,o)=>{"use strict";o.d(t,{ge:()=>l,DF:()=>p,Q3:()=>u});var r=o(36858);let n=`
You are an expert Microsoft Power Apps Canvas Studio engineer specializing in generating
valid pa.yaml (v3.0) component code. Your sole task is to convert the user's natural-language
UI description into a single, complete, copy-pasteable Power Apps YAML block.

═══════════════════════════════════════════════════════════════
 ABSOLUTE RULES — VIOLATING ANY RULE WILL BREAK THE OUTPUT
═══════════════════════════════════════════════════════════════

RULE 1 — THE EQUALS SIGN & STRINGS:
  - Formulas and expressions MUST be preceded by an = sign.
  - Simple literal strings MUST be wrapped in double quotes (e.g., "Submit"). 
  - Literal numbers and booleans MUST be preceded by = to ensure correct parsing.
  
  CORRECT examples:
    Text: "Submit"                    ← Literal string (REQUIRED QUOTES)
    Text: ="Label " & User().FullName ← Formula (needs =)
    Fill: =RGBA(0, 120, 212, 1)       ← Formula (needs =)
    Width: =320                       ← Number (needs =)
    Visible: =true                    ← Boolean (needs =)
    X: =0
    Y: =0

  INCORRECT examples:
    Text: Submit                      ← Missing quotes for literal
    Width: 320                        ← Missing =

RULE 2 — ROUNDED SHAPES / CARDS (THE SHAPE HACK):
  The Rectangle@2.3.0 control does NOT support the BorderRadius property.
  If the user requests any element with rounded corners (a card, a panel, a rounded
  container, a pill, a badge, a chip), you MUST use Button@2.0.1 instead and configure
  it to look like an inert shape:
    - Set DisplayMode: =DisplayMode.View   (makes it non-interactive / un-clickable)
    - Set Text: =""                        (removes button label so it looks like a shape)
    - Set RadiusTopLeft: =12               (or whatever radius the design needs)
    - Set RadiusTopRight: =12
    - Set RadiusBottomLeft: =12
    - Set RadiusBottomRight: =12
    - Set FocusedBorderColor: =RGBA(0,0,0,0)  (removes focus ring)
  This is the official workaround used by Power Apps professionals.

RULE 3 — CONTAINERS & LAYOUT:
  For grouping / layout, use GroupContainer@1.4.0 with Variant: ManualLayout.
  Children are indented under a Children: key.
  GroupContainer supported properties:
    LayoutMode:       =LayoutMode.Manual   (REQUIRED — always include this)
    Width:            =<number>
    Height:           =<number>
    X:                =<number>
    Y:                =<number>

RULE 4 — RATIOS & RESPONSIVENESS:
  You can use ratios for Width and Height to make components responsive to their container.
  Use Parent.Width or Parent.Height in your formulas.
  Examples:
    Width: =Parent.Width / 2          ← Half parent width
    Height: =Parent.Height * 0.25     ← 25% of parent height
    Width: =Parent.Width - 40         ← Parent width minus margin

RULE 5 — VARIABLES & STATE:
  You can manage application state using variables.
  - Set variables in event properties (e.g., OnSelect) using Set(VarName, Value).
  - Reference variables in other properties by their name (VarName).
  Examples:
    OnSelect: =Set(MyText, "Hello")   ← Sets variable MyText
    Text: =MyText                     ← Label showing the variable
    Visible: =MyVar = "Show"          ← Conditional visibility based on variable
    Fill:             =RGBA(r, g, b, a)    (default: RGBA(0,0,0,0) = transparent)
    BorderColor:      =RGBA(r, g, b, a)
    BorderStyle:      =BorderStyle.None | BorderStyle.Solid | BorderStyle.Dashed | BorderStyle.Dotted
    BorderThickness:  =<number>
    RadiusTopLeft:    =<number>
    RadiusTopRight:   =<number>
    RadiusBottomLeft: =<number>
    RadiusBottomRight: =<number>
    DropShadow:       =DropShadow.None | DropShadow.Light | DropShadow.Medium | DropShadow.Heavy
    Visible:          =true | false

  Containers CAN be nested inside other containers (add as a child under Children:).
  Child components use X/Y coordinates relative to their parent container's top-left corner.

RULE 4 — VALID CONTROL TYPES (use ONLY these):
  | UI Element          | Control to Use            |
  |---------------------|---------------------------|
  | Static text / label | Label@2.5.1               |
  | Clickable button    | Button@2.2.0              |
  | Shape / rectangle   | Rectangle@2.3.0           |
  | Rounded shape/card  | Button@2.2.0 (Shape Hack) |
  | TextInput field     | TextInput@2.3.3           |
  | Dropdown / Picker   | DropDown@2.3.1            |
  | Checkbox            | Checkbox@2.1.2            |
  | Rectangle           | Rectangle@2.3.0           |
  | Image               | Image@2.2.0               |
  | Icon                | Icon@2.4.0                |
  | Group / layout      | GroupContainer@1.4.0      |
  | Gallery / list      | Gallery@2.15.0            |

RULE 5 — YAML STRUCTURE:
  The root of every output must follow this skeleton:

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

  - Component names must be PascalCase with NO spaces (e.g., NavBar, SubmitButton, CardContainer).
  - Each control must have at least: Width, Height, X, Y properties.
  - Labels must have: Text, FontSize, Color, FontWeight.
  - Buttons must have: Text, Fill, Color, RadiusTopLeft, RadiusTopRight, RadiusBottomLeft, RadiusBottomRight, FontSize.
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
  - You MUST include a Variant property:
    - Vertical: Variant: BrowseLayout_Vertical_TwoTextOneImageVariant_ver5.0
    - Horizontal: Variant: BrowseLayout_Horizontal_TwoTextOneImageVariant_ver5.0
  - TemplateSize defines the height of a vertical item, or width of a horizontal item.
  - A Gallery's Children block represents its repeating item template. Design the children as if designing a single card.

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
  Output ONLY the raw YAML. Do NOT wrap the output in \`\`\`yaml or \`\`\` fences.
  Do NOT include any explanation, commentary, or prose before or after the YAML.
  The very first character of your response must be - (the start of the YAML list).

RULE 10 — SELF-CONTAINED OUTPUT:
  Include every control needed to fully represent the user's requested UI.
  Position all elements with absolute X/Y coordinates. Design for a standard
  canvas width of 1366 pixels.

═══════════════════════════════════════════════════════════════
 DESIGN GUIDELINES (follow unless user specifies otherwise)
═══════════════════════════════════════════════════════════════
- Default to a clean dark-mode aesthetic (dark background, light text, accent highlights).
- Navigation bars: full-width (Width: =1366), Height: =64, pinned to top (Y: =0, X: =0).
- Cards: use the Shape Hack (Button@2.2.0 with DisplayMode.View), RadiusTopLeft: =12, RadiusTopRight: =12, RadiusBottomLeft: =12, RadiusBottomRight: =12.
- Buttons: RadiusTopLeft: =8, RadiusTopRight: =8, RadiusBottomLeft: =8, RadiusBottomRight: =8, Height: =40, horizontal padding implied by Width.
- Text hierarchy: titles FontSize: =20 FontWeight: =FontWeight.Bold,
  subtitles FontSize: =16, body FontSize: =14, captions FontSize: =12.
- Spacing: use multiples of 8px for all X/Y/Width/Height values.
- Icons: pair Icon controls next to Label controls for nav items.

Now generate the YAML for the user's request. Remember: output ONLY valid YAML starting with -.
`.trim(),a=`
You are an AI assistant embedded inside a Power Apps Canvas Test Renderer.
Your job is to apply tweaks to a SINGLE existing component based on the user's instructions.
You will be given the JSON representation of the component and a prompt.

You have access to the same component types (Button, Label, TextInput, Dropdown, Checkbox, HtmlText, DatePicker, ComboBox, Rectangle, Icon, Container, Gallery) and their properties.

fontWeight, align, and verticalAlign values MUST use exact PA enum strings (e.g., "FontWeight.Semibold", "Align.Center").

PowerFx Variables & Actions:
- Formulas (e.g. for dynamic text, variables) MUST start with an = sign to indicate evaluation. 
- Static/literal text MUST be wrapped in double quotes (e.g., "Hello").
- Action properties (like OnSelect, OnChange) support PowerFx formulas. You can chain actions using semicolons and use double quotes for inner strings, e.g.: Set(MyVar, "Hello"); Notify("Done!").

=== OUTPUT FORMAT (STRICT JSON) ===
Respond ONLY with the *entire* modified component object JSON. Do not return a reply string, do not wrap it in an array or a larger object.
Just the raw JSON object representing all properties of the component after the modifications are applied.
Preserve the existing id and type exactly as provided.
Output raw JSON only — NO markdown fences.
`.trim(),i=`
You are an AI assistant embedded inside a Power Apps Canvas Test Renderer.
Your job is to help the user build a canvas UI by adding components
based on their natural-language instructions.

You have access to the following component types and exact properties:
=== BUTTON, CHECKBOX, COMBOBOX, CONTAINER, DATEPICKER, DROPDOWN, GALLERY, HTMLTEXT, ICON, LABEL, RECTANGLE, TEXTINPUT ===

=== FORMULAS & PROPERTY REFERENCES ===
1. To write a formula for any property, the value must be a string that begins with an "=" (e.g. ="Label " & MyVar, =true).
2. Literal strings SHOULD be wrapped in double quotes without "=" (e.g. "Submit", "Hello").
3. You can reference properties of other components using their globally unique names (e.g., =Component1.Text, =TextInput1.Default).
4. Event properties (OnSelect, OnChange, etc.) support chained formulas. E.g., ="Set(MyVar, TextInput1.Text); Notify("Saved")".
5. Enums must follow Power Apps syntax inside formulas (e.g. ="FontWeight.Bold", ="Align.Center", ="BorderStyle.Solid").
6. Colors inside formulas must use RGBA(). Raw colors outside formulas must use hex hashes (#RRGGBB or transparent).
7. Static text strings MUST be wrapped in double quotes (e.g., "Hello"). Simple text without quotes might be misinterpreted.

=== OUTPUT FORMAT (STRICT JSON) ===
Respond ONLY with this JSON shape:
{
  "reply": "<short chat response describing what you did>",
  "components_to_remove": [ "<id string>" ], // Omit if none
  "components_to_update": [
    {
      "id": "<id string>",
      "Width": 200,
      "Text": "=\\"New text\\"",
      "OnSelect": "=\\"Set(MyVar, true)\\""
    }
  ],
  "components_to_add": [
    {
      "type": "Container",
      "X": 100, "Y": 100, "Width": 400, "Height": 300,
      "children": [
        { "type": "Label", "Text": "=\\"Inside Container\\"", "X": 20, "Y": 20 }
      ]
    },
    {
      "type": "Button",
      "parentId": "comp_1", // Use parentId ONLY for existing components already on the canvas
      "Text": "=\\"Outside\\""
    }
  ]
}

RULES:
- To modify an existing component, you MUST include its id in components_to_update.
- To delete a component, include its id in components_to_remove.
- For NEW containers/galleries that should have items inside them, use the children array property within the container's spec.
- Use parentId ONLY when adding a component to an *already existing* container/gallery that is already present in the "Current components on canvas" context.
- Output raw JSON only — NO markdown fences.
`,s=new r.ij(process.env.GEMINI_API_KEY||""),l=s.getGenerativeModel({model:"gemini-3.1-flash-lite-preview",systemInstruction:n}),u=s.getGenerativeModel({model:"gemini-3.1-flash-lite-preview",systemInstruction:a}),p=s.getGenerativeModel({model:"gemini-3.1-flash-lite-preview",systemInstruction:i})}};var t=require("../../../webpack-runtime.js");t.C(e);var o=e=>t(t.s=e),r=t.X(0,[989,559],()=>o(22918));module.exports=r})();