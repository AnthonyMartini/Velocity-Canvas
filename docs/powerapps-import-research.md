# Power Apps Import Research

## Goal

Add a safe way to import Power Apps screens and components into Velocity Canvas, edit what we support, and export back out without silently breaking unsupported controls, properties, or formulas.

## Current Velocity Canvas Snapshot

- Current editable control set: `Button`, `Label`, `TextInput`, `Dropdown`, `Checkbox`, `Rectangle`, `Icon`, `HtmlText`, `DatePicker`, `ComboBox`, `Container`, `Gallery`, plus `Screen`.
- Current formula/runtime surface is intentionally small: `Notify`, `Navigate`, `Set`, `Text`, `Value`, `RGBA`, `RGB`, `If`, and `Table`.
- Prompts currently restrict runtime references to a narrow subset, especially `Parent.Width` and `Parent.Height`.
- The current exporter still emits a control-oriented YAML shape with `Control:` and `Properties:` blocks per node.

## What Microsoft’s Current Docs Change For Us

### 1. We should not rely on the old preview copy/paste schema

Microsoft’s current docs say:

- `*.pa.yaml` source files are the active source format for canvas apps.
- The old preview schema used by early code view / copy code / paste code is retired.
- `*.pa.yaml` is read-only source used for review/source control, not a direct editable load format for Studio.

Implication:

- For reliable import, target extracted `Src/*.pa.yaml` or a verified current Studio snippet format.
- Do not assume the older preview YAML shape is the long-term contract.

### 2. Unsupported controls must be preserved, not dropped

The official schema supports more than first-party controls:

- canvas components
- code components (PCF)

That means a real import pipeline must preserve opaque nodes it cannot render. Otherwise round-trip export will destroy valid Power Apps content.

### 3. Forms and cards are a structural feature, not just another control

Microsoft’s form/card docs show that:

- `Edit form` and `Display form` are record containers
- `Card` controls are their field-level building blocks
- real formulas commonly depend on `ThisItem`, `Parent.Default`, `Parent.DisplayName`, `Parent.Error`, `DataField`, and `Update`
- save/reset flows rely on form functions such as `SubmitForm`, `ResetForm`, `EditForm`, `NewForm`, and `ViewForm`

Implication:

- If forms matter, we need a dedicated form/card model or an opaque-preserve mode. A flat-control approximation will not round-trip safely.

## Recommended Product Strategy

### Recommended support model: four tiers

Every imported node and property should be marked with one of these statuses:

1. `native`
   - Fully editable and previewable in Velocity Canvas.
2. `partial`
   - Rendered and editable only for the subset we understand.
   - Unknown properties/formulas are preserved and shown as warnings.
3. `opaque`
   - Not editable in the canvas, but preserved losslessly for export.
   - Show metadata, raw properties, and why it is opaque.
4. `blocked`
   - Importable for inspection, but cannot be exported safely without user confirmation.
   - Reserve this for malformed or truly unsafe cases.

This is the key product decision. Silent dropping is the wrong behavior.

### Recommended architecture

1. Parse imported Power Apps content into a canonical intermediate representation.
2. Store both normalized fields and raw original payload.
3. Preserve:
   - control type and version
   - variant
   - full property bag
   - children order
   - unknown nodes
   - unknown properties
   - raw formula strings
4. Render only what the engine supports.
5. On export, merge untouched opaque content back into the output instead of regenerating those areas from scratch.

### Canonical node shape

Each imported node should keep:

- `type`
- `controlId` or source control string
- `variant`
- `name`
- `propertiesKnown`
- `propertiesUnknown`
- `children`
- `supportStatus`
- `warnings`
- `sourceRaw`

For formulas, keep both:

- `formulaRaw`
- `formulaStatus` such as `supported`, `unsupported-function`, `unsupported-reference`, `preserved-only`

### UX recommendation

When a user imports a screen or component:

- show an import report
- list unsupported controls
- list unsupported properties on supported controls
- list unsupported formulas/runtime references
- let the user filter to `fully editable`, `partially editable`, and `preserved only`

For preserved-only nodes:

- keep them in the layer tree
- visually badge them
- allow rename, reorder, visibility toggle only if safe
- do not let normal property editing destroy their raw payload

## Highest-Value Missing Controls To Support

These are the controls that seem most worth adding first for round-trip usefulness, not just for control-count vanity.

### P0: Add first

#### 1. `Image`

Why:

- Common in almost every real screen.
- Official docs show it is a core display control with many standard visual properties.
- Without it, imported headers, cards, hero areas, avatars, and media-rich galleries degrade quickly.

#### 2. `EditForm` / `DisplayForm` and `DataCard`

Why:

- Forms are a core Power Apps authoring pattern.
- Official docs explicitly describe cards as the building blocks of forms.
- A large share of business apps use gallery + form patterns for browse/details/edit flows.

#### 3. `Table` / `Data table`

Why:

- Real apps frequently use tabular read-only views.
- Microsoft documents both classic `Data table` and modern `Table`.
- This is a common imported screen primitive for admin, ops, and inventory scenarios.

#### 4. `Toggle`

Why:

- Common boolean input pattern.
- Appears both in classic and modern control sets.
- Easy value relative to implementation effort.

#### 5. `CanvasComponent` passthrough

Why:

- Official schema supports canvas component instances.
- Enterprise apps often use shared components.
- Even if full editing is deferred, opaque-preserve support is important immediately.

#### 6. `CodeComponent` / PCF passthrough

Why:

- Same preservation reason as canvas components.
- Necessary for not breaking imports from real apps that use PCF controls.

### P1: Strong next wave

#### 7. `Radio`
#### 8. `Slider`
#### 9. `ListBox`
#### 10. `Timer`

Why:

- These are common enough to show up in real screens.
- Microsoft’s core property docs still call them out as active control families.

#### 11. Responsive container properties

Why:

- Even before adding a new container type, current container support is too shallow for many modern layouts.
- We should add layout-direction, alignment, gap/padding, wrapping, and overflow-style behavior where the Power Apps model exposes them.

#### 12. Modern control family support

Most valuable modern controls to prioritize after the basics:

- `Text`
- `Number input`
- `Header`
- `Tabs / Tab list`
- `Table`

These matter more for current app parity than `Avatar` or `Badge`.

### P2: Useful but less central for first round-trip

- `Rich text editor`
- `Add picture`
- `PDF viewer`
- `Camera`
- `Barcode reader`
- `Pen input`
- `Progress bar`
- `Spinner`
- `Link`
- `Info button`

These are valuable, but less critical than forms, image, table, and boolean/input basics.

## Highest-Value Property And Runtime Gaps

Even for currently supported controls, the bigger round-trip problem is often properties and formulas, not the base control itself.

### P0 property/runtime gaps

#### 1. Unknown-property preservation

This is non-negotiable. If a supported `Button` or `Gallery` contains properties we do not understand, they must survive import/export intact.

#### 2. Form/card formula model

We need to preserve or support formulas like:

- `ThisItem.Field`
- `Parent.Default`
- `Parent.DisplayName`
- `Parent.Error`
- `Parent.Required`
- card `Update`
- card `DataField`

#### 3. Common data functions

Current runtime support is too small for realistic imported screens. Priority additions:

- `Filter`
- `Search`
- `LookUp`
- `Sort`
- `SortByColumns`
- `First`
- `Last`
- `CountRows`

#### 4. Common state/data actions

Priority additions:

- `UpdateContext`
- `Collect`
- `ClearCollect`
- `Patch`
- `SubmitForm`
- `ResetForm`
- `EditForm`
- `NewForm`
- `ViewForm`
- `Reset`

#### 5. Core accessibility and interaction properties

Priority property coverage across controls:

- `AccessibleLabel`
- `Tooltip`
- `TabIndex`
- focused / hover / pressed / disabled visual states
- `AutoHeight`
- `DelayOutput`

### Known local disconnect already present

The current local `Gallery` schema default uses `Search`, `SortByColumns`, and `SortOrder`, while the runtime and prompts intentionally allow only a much smaller function set. That means import/export work should start by separating:

- `formula preservation`
- `formula preview execution`

Those should not be the same capability.

## Practical Build Order

1. Build import IR with lossless preservation.
2. Add support-status badges and an import report UI.
3. Add opaque passthrough for canvas components and PCF controls.
4. Implement `Image`, `Toggle`, and `Table/Data table`.
5. Implement `EditForm`, `DisplayForm`, and `DataCard` as a dedicated subsystem.
6. Expand formula support for common read-only data functions.
7. Expand action support for forms and state management.
8. Add modern controls based on actual imported usage telemetry.

## Bottom Line

The best way to handle the Power Apps / Velocity Canvas mismatch is not to chase full parity immediately. It is to:

- import into a lossless intermediate model
- fully edit what we support
- preserve what we do not
- warn clearly about partial support
- prioritize support for forms, image, table, toggle, and component passthrough first

That gives us a credible round-trip story early without corrupting real Power Apps screens.

## Sources

- Microsoft Learn: Modern controls and properties in canvas apps  
  https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/controls/modern-controls/modern-controls-reference
- Microsoft Learn: View source code files for canvas apps  
  https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/power-apps-yaml
- Microsoft Learn: Image control in Power Apps  
  https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/controls/control-image
- Microsoft Learn: Edit form and Display form controls in Power Apps  
  https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/controls/control-form-detail
- Microsoft Learn: Understand data cards in canvas apps  
  https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/working-with-cards
- Microsoft Learn: Data table control in Power Apps  
  https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/controls/control-data-table
- Microsoft Learn: Toggle control in Power Apps  
  https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/controls/control-toggle
- Microsoft Learn: Toggle modern control in Power Apps  
  https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/controls/modern-controls/modern-control-toggle
- Microsoft Learn: Core properties in Power Apps  
  https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/controls/properties-core
- Microsoft Learn: Canvas component overview  
  https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/create-component
- Microsoft Learn: Component library  
  https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/component-library
- Microsoft Power Apps schema for app source yaml files (v3.0)  
  https://raw.githubusercontent.com/microsoft/PowerApps-Tooling/refs/heads/master/schemas/pa-yaml/v3.0/pa.schema.yaml
