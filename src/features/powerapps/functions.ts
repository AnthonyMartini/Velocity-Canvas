
export const Type = {
    EVENT: "event",
    TEXT: "text",
    NUMBER: "number",
    ANY: "any",
    BOOLEAN: "boolean",
    NOTIFICATION_TYPE: "NotificationType"
}

export const NotificationType = {
    Information: "NotificationType.Information",
    Warning: "NotificationType.Warning",
    Success: "NotificationType.Success",
    Error: "NotificationType.Error"
}

export const Align = {
    Left: "Align.Left",
    Center: "Align.Center",
    Right: "Align.Right",
    Justify: "Align.Justify"
}

export const VerticalAlign = {
    Top: "VerticalAlign.Top",
    Middle: "VerticalAlign.Middle",
    Bottom: "VerticalAlign.Bottom"
}

export const FontWeight = {
    Bold: "FontWeight.Bold",
    Semibold: "FontWeight.Semibold",
    Normal: "FontWeight.Normal",
    Lighter: "FontWeight.Lighter"
}

export const BorderStyle = {
    Solid: "BorderStyle.Solid",
    Dashed: "BorderStyle.Dashed",
    Dotted: "BorderStyle.Dotted",
    None: "BorderStyle.None"
}

export const DisplayMode = {
    Edit: "DisplayMode.Edit",
    View: "DisplayMode.View",
    Disabled: "DisplayMode.Disabled"
}

export const ModernButtonAppearance = {
    Primary: "ModernButtonAppearance.Primary",
    Secondary: "ModernButtonAppearance.Secondary",
    Outline: "ModernButtonAppearance.Outline",
    Subtle: "ModernButtonAppearance.Subtle",
    Transparent: "ModernButtonAppearance.Transparent"
}

export const ModernButtonLayout = {
    TextOnly: "ModernButtonLayout.TextOnly",
    IconBefore: "ModernButtonLayout.IconBefore",
    IconAfter: "ModernButtonLayout.IconAfter",
    IconOnly: "ModernButtonLayout.IconOnly"
}

export const ModernButtonIconStyle = {
    Outline: "ModernButtonIconStyle.Outline",
    Filled: "ModernButtonIconStyle.Filled"
}

export const Overflow = {
    Hidden: "Overflow.Hidden",
    Scroll: "Overflow.Scroll",
    Visible: "Overflow.Visible"
}

export const DropShadow = {
    None: "DropShadow.None",
    Light: "DropShadow.Light",
    Medium: "DropShadow.Medium",
    Heavy: "DropShadow.Heavy"
}

export const TextMode = {
    SingleLine: "TextMode.SingleLine",
    Multiline: "TextMode.Multiline",
    Password: "TextMode.Password"
}

export const TextFormat = {
    Text: "TextFormat.Text",
    Number: "TextFormat.Number"
}

export const Layout = {
    Vertical: "Vertical",
    Horizontal: "Horizontal"
}

export const Icon = {
    Add: "Icon.Add",
    Cancel: "Icon.Cancel",
    CancelBadge: "Icon.CancelBadge",
    Edit: "Icon.Edit",
    Check: "Icon.Check",
    CheckBadge: "Icon.CheckBadge",
    Search: "Icon.Search",
    Filter: "Icon.Filter",
    FilterFlat: "Icon.FilterFlat",
    FilterFlatFilled: "Icon.FilterFlatFilled",
    Sort: "Icon.Sort",
    Reload: "Icon.Reload",
    Trash: "Icon.Trash",
    Save: "Icon.Save",
    Download: "Icon.Download",
    Copy: "Icon.Copy",
    LikeDislike: "Icon.LikeDislike",
    Crop: "Icon.Crop",
    Pin: "Icon.Pin",
    ClearDrawing: "Icon.ClearDrawing",
    ExpandView: "Icon.ExpandView",
    CollapseView: "Icon.CollapseView",
    Draw: "Icon.Draw",
    Compose: "Icon.Compose",
    Erase: "Icon.Erase",
    Message: "Icon.Message",
    Post: "Icon.Post",
    AddDocument: "Icon.AddDocument",
    AddLibrary: "Icon.AddLibrary",
    Import: "Icon.Import",
    Export: "Icon.Export",
    QuestionMark: "Icon.QuestionMark",
    Help: "Icon.Help",
    ThumbsDown: "Icon.ThumbsDown",
    ThumbsUp: "Icon.ThumbsUp",
    ThumbsDownFilled: "Icon.ThumbsDownFilled",
    ThumbsUpFilled: "Icon.ThumbsUpFilled",
    Undo: "Icon.Undo",
    Redo: "Icon.Redo",
    ZoomIn: "Icon.ZoomIn",
    ZoomOut: "Icon.ZoomOut",
    OpenInNewWindow: "Icon.OpenInNewWindow",
    Share: "Icon.Share",
    Publish: "Icon.Publish",
    Link: "Icon.Link",
    Sync: "Icon.Sync",
    View: "Icon.View",
    Hide: "Icon.Hide",
    Bookmark: "Icon.Bookmark",
    BookmarkFilled: "Icon.BookmarkFilled",
    Reset: "Icon.Reset",
    Blocked: "Icon.Blocked",
    DockLeft: "Icon.DockLeft",
    DockRight: "Icon.DockRight",
    AddUser: "Icon.AddUser",
    Cut: "Icon.Cut",
    Paste: "Icon.Paste",
    Leave: "Icon.Leave",
    Printing3D: "Icon.Printing3D",
    Dismiss: "Icon.Dismiss",
    Delete: "Icon.Delete",
    ArrowExit: "Icon.ArrowExit",
    ArrowDownload: "Icon.ArrowDownload",
    Info: "Icon.Info"
}

export const ALL_ENUM_VALUES = new Set([
    ...Object.values(NotificationType),
    ...Object.values(Align),
    ...Object.values(VerticalAlign),
    ...Object.values(FontWeight),
    ...Object.values(BorderStyle),
    ...Object.values(DisplayMode),
    ...Object.values(ModernButtonAppearance),
    ...Object.values(ModernButtonLayout),
    ...Object.values(ModernButtonIconStyle),
    ...Object.values(Overflow),
    ...Object.values(DropShadow),
    ...Object.values(TextMode),
    ...Object.values(TextFormat),
    ...Object.values(Layout),
    ...Object.values(Icon)
])

const isRuntimeContext = (value) =>
    value && typeof value === 'object' && (
        'notify' in value ||
        'navigate' in value ||
        'setVariable' in value ||
        'isActionContext' in value ||
        'isControl' in value ||
        'screens' in value
    )

const stripRuntimeContext = (args) =>
    args.filter(arg => !isRuntimeContext(arg))

const toFiniteNumber = (value) => {
    const num = Number(value)
    return Number.isFinite(num) ? num : null
}

const unwrapRecordValue = (value, preferNumeric = false) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value
    if (value.Value !== undefined) return value.Value

    const entries = Object.values(value)
    if (preferNumeric) {
        const numeric = entries.find(entry => toFiniteNumber(entry) !== null)
        if (numeric !== undefined) return numeric
    }

    return entries.length ? entries[0] : value
}

const flattenFormulaValues = (args, preferNumeric = false) => {
    const values = []

    const pushValue = (value) => {
        if (Array.isArray(value)) {
            value.forEach(pushValue)
            return
        }
        values.push(unwrapRecordValue(value, preferNumeric))
    }

    stripRuntimeContext(args).forEach(pushValue)
    return values
}

const numericValuesFromArgs = (...args) => {
    const values = flattenFormulaValues(args, true)
        .map(toFiniteNumber)
        .filter(value => value !== null)

    if (!values.length) {
        return { status: 'error', message: 'At least one numeric value is required' }
    }

    return { status: 'success', values }
}

const isBlankFormulaValue = (value) =>
    value === null || value === undefined || value === ''

const countNonBlankValues = (...args) =>
    flattenFormulaValues(args).filter(value => !isBlankFormulaValue(value)).length

const aggregateNumbers = (reducer, initialValueFactory, ...args) => {
    const numeric = numericValuesFromArgs(...args)
    if (numeric.status === 'error') return numeric
    return {
        status: 'success',
        message: numeric.values.reduce(reducer, initialValueFactory(numeric.values))
    }
}

const roundWithMode = (value, digits = 0, mode = 'nearest') => {
    const amount = toFiniteNumber(value)
    const decimals = toFiniteNumber(digits)
    if (amount === null || decimals === null) {
        return { status: 'error', message: 'Round functions require numeric arguments' }
    }

    const factor = 10 ** Math.trunc(decimals)
    const scaled = amount * factor

    let rounded = scaled
    if (mode === 'down') rounded = amount >= 0 ? Math.floor(scaled) : Math.ceil(scaled)
    else if (mode === 'up') rounded = amount >= 0 ? Math.ceil(scaled) : Math.floor(scaled)
    else rounded = Math.round(scaled)

    return { status: 'success', message: rounded / factor }
}

const populationVariance = (values) => {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length
    return values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length
}

// These are the available functions that can be used in the formulas within our app. 
// The app needs to verify the type of the property that invokes these functions matchs the type of the function. 
// For example, if a property is of type "text", it should not be able to invoke a function of type "number". App should return an error message. 
// Actions are only available to event properties. 

export const FUNCTIONS = [
    {
        name: "Notify",
        type: Type.EVENT,
        description: "Displays a notification message with an optional type.",
        example: 'Notify("Hello World", NotificationType.Success)',
        // Arguments expected from the user's formula
        args: [
            { name: "message", type: Type.TEXT },
            { name: "type", type: Type.NOTIFICATION_TYPE, optional: true }
        ],
        function: (message, type, context)=>{
            // If only 1 arg + context is provided, type will be the context object.
            // PowerApps Notify(msg, [type])
            let actualType = NotificationType.Information;
            let actualContext = context;

            if (typeof type === 'object' && type !== null && (type.notify || type.navigate || type.setVariable)) {
                // type is actually the context
                actualContext = type;
            } else if (type) {
                actualType = type;
            }

            //Type check for message
            if(typeof message !== "string"){
                return {status: "error", message: "Message must be a string"}
            }
            if (actualContext && actualContext.notify) {
                actualContext.notify(message, actualType)
            }
            return {status: "success", message: "Notification displayed"}
        }
    },
    {
        name: "Navigate",
        type: Type.EVENT,
        description: "Navigates to a different screen.",
        example: 'Navigate(Screen2)',
        args: [{ name: "screen", type: Type.TEXT }],
        function: (screen, context)=>{
            // Helper to check if it's a valid screen
            const isValidScreen = (val) => {
                if (!val) return false;
                // In strict mode (validation), evaluateAST returns the component object
                if (typeof val === 'object' && val.type === 'Screen') return true;
                // In non-strict mode (runtime), evaluateAST returns the string name
                if (typeof val === 'string' && context?.screens) {
                    return context.screens.some(s => s.name === val);
                }
                return false;
            };

            if (!isValidScreen(screen)) {
                return { 
                    status: "error", 
                    message: `"${typeof screen === 'string' ? screen : (screen?.name || 'Unknown')}" is not a valid screen name.` 
                }
            }

            const screenName = typeof screen === 'string' ? screen : screen.name;
            if (context && context.navigate) context.navigate(screenName)
            return {status: "success", message: "Navigated to screen"}
        }
    },
    {
        name: "Set",
        type: Type.EVENT,
        description: "Sets the value of a variable.",
        example: 'Set(varX, 10)',
        args: [
            { name: "variable", type: Type.TEXT },
            { name: "value", type: Type.ANY }
        ],
        function: (variable, value, context)=>{
            if(typeof variable !== "string"){
                return {status: "error", message: "Variable name must be a string"}
            }
            if (variable.includes('.')) {
                return {status: "error", message: `"Set" cannot be used to update a component property.`}
            }
            if (context && context.isControl && context.isControl(variable)) {
                return {status: "error", message: `"${variable}" is already used as a control name.`}
            }
            if (context && context.setVariable) context.setVariable(variable, value)
            return {status: "success", message: "Variable set"}
        }
    },

    //Text and Value Functions  
    //Text: trys to convert to string and returns it ex: passed a number and converts to string
    //Value: trys to convert to number and returns it ex: passed a string and converts to number

    {
        name: "Text",
        type: Type.TEXT,
        description: "Returns the text value of a component.",
        example: 'Text(123)',
        args: [{ name: "value", type: Type.ANY }],
        function: (value)=>{
            //Can we convert to string?
            try{
                return {status: "success", message: String(value)}
            }catch(e){
                return {status: "error", message: "Value cannot be converted to a string"}
            }
        }
    },
    {
        name: "Value",
        type: Type.NUMBER,
        description: "Returns the numeric value of a component.",
        example: 'Value("123")',
        args: [{ name: "value", type: Type.ANY }],
        function: (value)=>{
            //Can we convert to number?
            try{
                const num = Number(value)
                if (isNaN(num)) {
                    return {status: "error", message: "Value is not a valid number"}
                }
                return {status: "success", message: num}
            }catch(e){
                return {status: "error", message: "Value cannot be converted to a number"}
            }
        }
    },
    {
        name: "Coalesce",
        type: Type.ANY,
        description: "Returns the first value that isn't blank.",
        example: 'Coalesce(varPrimary, varFallback, "Default")',
        args: [],
        function: (...args) => {
            const values = stripRuntimeContext(args)
            if (!values.length) {
                return { status: "error", message: "Coalesce requires at least one argument" }
            }

            const firstNonBlank = values.find(value => !isBlankFormulaValue(value))
            return {
                status: "success",
                message: firstNonBlank === undefined ? null : firstNonBlank
            }
        }
    },
    {
        name: "Upper",
        type: Type.TEXT,
        description: "Converts text to uppercase.",
        example: 'Upper("hello")',
        args: [{ name: "text", type: Type.TEXT }],
        function: (value) => {
            if (value === null || value === undefined) {
                return { status: "success", message: "" }
            }
            return { status: "success", message: String(value).toUpperCase() }
        }
    },
    {
        name: "Lower",
        type: Type.TEXT,
        description: "Converts text to lowercase.",
        example: 'Lower("HELLO")',
        args: [{ name: "text", type: Type.TEXT }],
        function: (value) => {
            if (value === null || value === undefined) {
                return { status: "success", message: "" }
            }
            return { status: "success", message: String(value).toLowerCase() }
        }
    },
    {
        name: "And",
        type: Type.BOOLEAN,
        description: "Returns true if all arguments are true.",
        example: 'And(true, 1 < 2)',
        args: [],
        function: (...args) => {
            const values = stripRuntimeContext(args)
            if (!values.length) {
                return { status: "error", message: "And requires at least one argument" }
            }
            if (values.some(value => typeof value !== 'boolean')) {
                return { status: "error", message: "And only accepts boolean arguments" }
            }
            return { status: "success", message: values.every(Boolean) }
        }
    },
    {
        name: "Or",
        type: Type.BOOLEAN,
        description: "Returns true if any argument is true.",
        example: 'Or(false, 2 > 1)',
        args: [],
        function: (...args) => {
            const values = stripRuntimeContext(args)
            if (!values.length) {
                return { status: "error", message: "Or requires at least one argument" }
            }
            if (values.some(value => typeof value !== 'boolean')) {
                return { status: "error", message: "Or only accepts boolean arguments" }
            }
            return { status: "success", message: values.some(Boolean) }
        }
    },
    {
        name: "Not",
        type: Type.BOOLEAN,
        description: "Returns the logical inverse of a boolean value.",
        example: 'Not(true)',
        args: [{ name: "boolean", type: Type.BOOLEAN }],
        function: (value) => {
            if (typeof value !== 'boolean') {
                return { status: "error", message: "Not requires a boolean argument" }
            }
            return { status: "success", message: !value }
        }
    },
    {
        name: "RGBA",
        type: Type.TEXT,
        description: "Returns a color from red, green, blue, and alpha values.",
        example: 'RGBA(255, 0, 0, 1)',
        args: [
            { name: "red", type: Type.NUMBER },
            { name: "green", type: Type.NUMBER },
            { name: "blue", type: Type.NUMBER },
            { name: "alpha", type: Type.NUMBER }
        ],
        function: (r, g, b, a) => `rgba(${r}, ${g}, ${b}, ${a})`
    },
    {
        name: "RGB",
        type: Type.TEXT,
        description: "Returns a color from red, green, and blue values.",
        example: 'RGB(255, 255, 255)',
        args: [
            { name: "red", type: Type.NUMBER },
            { name: "green", type: Type.NUMBER },
            { name: "blue", type: Type.NUMBER }
        ],
        function: (r, g, b) => `rgb(${r}, ${g}, ${b})`
    },
    {
        name: "Abs",
        type: Type.NUMBER,
        description: "Returns the absolute value of a number.",
        example: 'Abs(-42)',
        args: [{ name: "number", type: Type.NUMBER }],
        function: (value) => {
            const num = toFiniteNumber(value)
            return num === null
                ? { status: "error", message: "Abs requires a numeric argument" }
                : { status: "success", message: Math.abs(num) }
        }
    },
    {
        name: "Acos",
        type: Type.NUMBER,
        description: "Returns the arccosine of a number, in radians.",
        example: 'Acos(0.5)',
        args: [{ name: "number", type: Type.NUMBER }],
        function: (value) => {
            const num = toFiniteNumber(value)
            if (num === null) return { status: "error", message: "Acos requires a numeric argument" }
            if (num < -1 || num > 1) return { status: "error", message: "Acos requires a value between -1 and 1" }
            return { status: "success", message: Math.acos(num) }
        }
    },
    {
        name: "Acot",
        type: Type.NUMBER,
        description: "Returns the arccotangent of a number, in radians.",
        example: 'Acot(1)',
        args: [{ name: "number", type: Type.NUMBER }],
        function: (value) => {
            const num = toFiniteNumber(value)
            if (num === null) return { status: "error", message: "Acot requires a numeric argument" }
            if (num === 0) return { status: "success", message: Math.PI / 2 }
            return { status: "success", message: Math.atan(1 / num) }
        }
    },
    {
        name: "Asin",
        type: Type.NUMBER,
        description: "Returns the arcsine of a number, in radians.",
        example: 'Asin(0.5)',
        args: [{ name: "number", type: Type.NUMBER }],
        function: (value) => {
            const num = toFiniteNumber(value)
            if (num === null) return { status: "error", message: "Asin requires a numeric argument" }
            if (num < -1 || num > 1) return { status: "error", message: "Asin requires a value between -1 and 1" }
            return { status: "success", message: Math.asin(num) }
        }
    },
    {
        name: "Atan",
        type: Type.NUMBER,
        description: "Returns the arctangent of a number, in radians.",
        example: 'Atan(1)',
        args: [{ name: "number", type: Type.NUMBER }],
        function: (value) => {
            const num = toFiniteNumber(value)
            return num === null
                ? { status: "error", message: "Atan requires a numeric argument" }
                : { status: "success", message: Math.atan(num) }
        }
    },
    {
        name: "Atan2",
        type: Type.NUMBER,
        description: "Returns the arctangent based on an (x, y) coordinate, in radians.",
        example: 'Atan2(10, 5)',
        args: [
            { name: "x", type: Type.NUMBER },
            { name: "y", type: Type.NUMBER }
        ],
        function: (x, y) => {
            const xNum = toFiniteNumber(x)
            const yNum = toFiniteNumber(y)
            if (xNum === null || yNum === null) return { status: "error", message: "Atan2 requires numeric arguments" }
            return { status: "success", message: Math.atan2(yNum, xNum) }
        }
    },
    {
        name: "Average",
        type: Type.NUMBER,
        description: "Calculates the average of a table expression or a set of arguments.",
        example: 'Average(10, 20, 30)',
        args: [],
        function: (...args) => {
            const numeric = numericValuesFromArgs(...args)
            if (numeric.status === 'error') return numeric
            return {
                status: "success",
                message: numeric.values.reduce((sum, value) => sum + value, 0) / numeric.values.length
            }
        }
    },
    {
        name: "Cos",
        type: Type.NUMBER,
        description: "Returns the cosine of an angle specified in radians.",
        example: 'Cos(Pi())',
        args: [{ name: "number", type: Type.NUMBER }],
        function: (value) => {
            const num = toFiniteNumber(value)
            return num === null
                ? { status: "error", message: "Cos requires a numeric argument" }
                : { status: "success", message: Math.cos(num) }
        }
    },
    {
        name: "Cot",
        type: Type.NUMBER,
        description: "Returns the cotangent of an angle specified in radians.",
        example: 'Cot(1)',
        args: [{ name: "number", type: Type.NUMBER }],
        function: (value) => {
            const num = toFiniteNumber(value)
            if (num === null) return { status: "error", message: "Cot requires a numeric argument" }
            const tan = Math.tan(num)
            if (tan === 0) return { status: "error", message: "Cot is undefined for this angle" }
            return { status: "success", message: 1 / tan }
        }
    },
    {
        name: "Count",
        type: Type.NUMBER,
        description: "Counts table records that contain numbers.",
        example: 'Count([1, 2, 3])',
        args: [],
        function: (...args) => ({
            status: "success",
            message: flattenFormulaValues(args, true).filter(value => toFiniteNumber(value) !== null).length
        })
    },
    {
        name: "CountA",
        type: Type.NUMBER,
        description: "Counts table records that aren't empty.",
        example: 'CountA([1, Blank(), 3])',
        args: [],
        function: (...args) => ({
            status: "success",
            message: countNonBlankValues(...args)
        })
    },
    {
        name: "Degrees",
        type: Type.NUMBER,
        description: "Converts radians to degrees.",
        example: 'Degrees(Pi())',
        args: [{ name: "radians", type: Type.NUMBER }],
        function: (value) => {
            const num = toFiniteNumber(value)
            return num === null
                ? { status: "error", message: "Degrees requires a numeric argument" }
                : { status: "success", message: num * (180 / Math.PI) }
        }
    },
    {
        name: "Exp",
        type: Type.NUMBER,
        description: "Returns e raised to a power.",
        example: 'Exp(2)',
        args: [{ name: "number", type: Type.NUMBER }],
        function: (value) => {
            const num = toFiniteNumber(value)
            return num === null
                ? { status: "error", message: "Exp requires a numeric argument" }
                : { status: "success", message: Math.exp(num) }
        }
    },
    {
        name: "Int",
        type: Type.NUMBER,
        description: "Rounds down to the nearest integer.",
        example: 'Int(3.9)',
        args: [{ name: "number", type: Type.NUMBER }],
        function: (value) => {
            const num = toFiniteNumber(value)
            return num === null
                ? { status: "error", message: "Int requires a numeric argument" }
                : { status: "success", message: Math.floor(num) }
        }
    },
    {
        name: "Ln",
        type: Type.NUMBER,
        description: "Returns the natural log.",
        example: 'Ln(10)',
        args: [{ name: "number", type: Type.NUMBER }],
        function: (value) => {
            const num = toFiniteNumber(value)
            if (num === null) return { status: "error", message: "Ln requires a numeric argument" }
            if (num <= 0) return { status: "error", message: "Ln requires a positive number" }
            return { status: "success", message: Math.log(num) }
        }
    },
    {
        name: "Log",
        type: Type.NUMBER,
        description: "Returns the logarithm in any base of a number.",
        example: 'Log(100, 10)',
        args: [
            { name: "number", type: Type.NUMBER },
            { name: "base", type: Type.NUMBER, optional: true }
        ],
        function: (value, base, _context) => {
            const num = toFiniteNumber(value)
            const actualBase = isRuntimeContext(base) || base === undefined ? 10 : toFiniteNumber(base)
            if (num === null || actualBase === null) return { status: "error", message: "Log requires numeric arguments" }
            if (num <= 0 || actualBase <= 0 || actualBase === 1) {
                return { status: "error", message: "Log requires a positive number and a valid base" }
            }
            return { status: "success", message: Math.log(num) / Math.log(actualBase) }
        }
    },
    {
        name: "Max",
        type: Type.NUMBER,
        description: "Maximum value of a table expression or a set of arguments.",
        example: 'Max(1, 5, 3)',
        args: [],
        function: (...args) => aggregateNumbers((current, value) => Math.max(current, value), (values) => values[0], ...args)
    },
    {
        name: "Min",
        type: Type.NUMBER,
        description: "Minimum value of a table expression or a set of arguments.",
        example: 'Min(1, 5, 3)',
        args: [],
        function: (...args) => aggregateNumbers((current, value) => Math.min(current, value), (values) => values[0], ...args)
    },
    {
        name: "Mod",
        type: Type.NUMBER,
        description: "Returns the remainder after a dividend is divided by a divisor.",
        example: 'Mod(10, 3)',
        args: [
            { name: "number", type: Type.NUMBER },
            { name: "divisor", type: Type.NUMBER }
        ],
        function: (value, divisor) => {
            const num = toFiniteNumber(value)
            const div = toFiniteNumber(divisor)
            if (num === null || div === null) return { status: "error", message: "Mod requires numeric arguments" }
            if (div === 0) return { status: "error", message: "Mod cannot divide by zero" }
            return { status: "success", message: num % div }
        }
    },
    {
        name: "Pi",
        type: Type.NUMBER,
        description: "Returns the number pi.",
        example: 'Pi()',
        args: [],
        function: (..._args) => ({ status: "success", message: Math.PI })
    },
    {
        name: "Power",
        type: Type.NUMBER,
        description: "Returns a number raised to a power.",
        example: 'Power(2, 8)',
        args: [
            { name: "number", type: Type.NUMBER },
            { name: "power", type: Type.NUMBER }
        ],
        function: (value, exponent) => {
            const num = toFiniteNumber(value)
            const exp = toFiniteNumber(exponent)
            return (num === null || exp === null)
                ? { status: "error", message: "Power requires numeric arguments" }
                : { status: "success", message: num ** exp }
        }
    },
    {
        name: "Radians",
        type: Type.NUMBER,
        description: "Converts degrees to radians.",
        example: 'Radians(180)',
        args: [{ name: "degrees", type: Type.NUMBER }],
        function: (value) => {
            const num = toFiniteNumber(value)
            return num === null
                ? { status: "error", message: "Radians requires a numeric argument" }
                : { status: "success", message: num * (Math.PI / 180) }
        }
    },
    {
        name: "Rand",
        type: Type.NUMBER,
        description: "Returns a pseudo-random number between 0 and 1.",
        example: 'Rand()',
        args: [],
        function: (..._args) => ({ status: "success", message: Math.random() })
    },
    {
        name: "RandBetween",
        type: Type.NUMBER,
        description: "Returns a pseudo-random number between two numbers.",
        example: 'RandBetween(1, 10)',
        args: [
            { name: "bottom", type: Type.NUMBER },
            { name: "top", type: Type.NUMBER }
        ],
        function: (bottom, top) => {
            const min = toFiniteNumber(bottom)
            const max = toFiniteNumber(top)
            if (min === null || max === null) return { status: "error", message: "RandBetween requires numeric arguments" }
            const low = Math.ceil(Math.min(min, max))
            const high = Math.floor(Math.max(min, max))
            return { status: "success", message: Math.floor(Math.random() * (high - low + 1)) + low }
        }
    },
    {
        name: "Round",
        type: Type.NUMBER,
        description: "Rounds to the closest number.",
        example: 'Round(3.14159, 2)',
        args: [
            { name: "number", type: Type.NUMBER },
            { name: "digits", type: Type.NUMBER, optional: true }
        ],
        function: (value, digits, _context) => roundWithMode(value, isRuntimeContext(digits) || digits === undefined ? 0 : digits, 'nearest')
    },
    {
        name: "RoundDown",
        type: Type.NUMBER,
        description: "Rounds down to the largest previous number.",
        example: 'RoundDown(3.14159, 2)',
        args: [
            { name: "number", type: Type.NUMBER },
            { name: "digits", type: Type.NUMBER, optional: true }
        ],
        function: (value, digits, _context) => roundWithMode(value, isRuntimeContext(digits) || digits === undefined ? 0 : digits, 'down')
    },
    {
        name: "RoundUp",
        type: Type.NUMBER,
        description: "Rounds up to the smallest next number.",
        example: 'RoundUp(3.14159, 2)',
        args: [
            { name: "number", type: Type.NUMBER },
            { name: "digits", type: Type.NUMBER, optional: true }
        ],
        function: (value, digits, _context) => roundWithMode(value, isRuntimeContext(digits) || digits === undefined ? 0 : digits, 'up')
    },
    {
        name: "Sequence",
        type: Type.ANY,
        description: "Returns a single-column table of sequential numbers.",
        example: 'Sequence(5, 10, 2)',
        args: [
            { name: "records", type: Type.NUMBER },
            { name: "start", type: Type.NUMBER, optional: true },
            { name: "step", type: Type.NUMBER, optional: true }
        ],
        function: (records, start, step, _context) => {
            const count = toFiniteNumber(records)
            const actualStart = isRuntimeContext(start) || start === undefined ? 1 : toFiniteNumber(start)
            const actualStep = isRuntimeContext(step) || step === undefined ? 1 : toFiniteNumber(step)

            if (count === null || actualStart === null || actualStep === null) {
                return { status: "error", message: "Sequence requires numeric arguments" }
            }

            const safeCount = Math.max(0, Math.floor(count))
            return {
                status: "success",
                message: Array.from({ length: safeCount }, (_, index) => ({
                    Value: actualStart + (index * actualStep)
                }))
            }
        }
    },
    {
        name: "Sin",
        type: Type.NUMBER,
        description: "Returns the sine of an angle specified in radians.",
        example: 'Sin(Pi()/2)',
        args: [{ name: "number", type: Type.NUMBER }],
        function: (value) => {
            const num = toFiniteNumber(value)
            return num === null
                ? { status: "error", message: "Sin requires a numeric argument" }
                : { status: "success", message: Math.sin(num) }
        }
    },
    {
        name: "Sqrt",
        type: Type.NUMBER,
        description: "Returns the square root of a number.",
        example: 'Sqrt(16)',
        args: [{ name: "number", type: Type.NUMBER }],
        function: (value) => {
            const num = toFiniteNumber(value)
            if (num === null) return { status: "error", message: "Sqrt requires a numeric argument" }
            if (num < 0) return { status: "error", message: "Sqrt requires a non-negative number" }
            return { status: "success", message: Math.sqrt(num) }
        }
    },
    {
        name: "StdevP",
        type: Type.NUMBER,
        description: "Calculates the standard deviation based on the entire population.",
        example: 'StdevP(1, 2, 3, 4)',
        args: [],
        function: (...args) => {
            const numeric = numericValuesFromArgs(...args)
            if (numeric.status === 'error') return numeric
            return { status: "success", message: Math.sqrt(populationVariance(numeric.values)) }
        }
    },
    {
        name: "Sum",
        type: Type.NUMBER,
        description: "Calculates the sum of a table expression or a set of arguments.",
        example: 'Sum(10, 20, 30)',
        args: [],
        function: (...args) => aggregateNumbers((current, value) => current + value, () => 0, ...args)
    },
    {
        name: "Tan",
        type: Type.NUMBER,
        description: "Returns the tangent of an angle specified in radians.",
        example: 'Tan(1)',
        args: [{ name: "number", type: Type.NUMBER }],
        function: (value) => {
            const num = toFiniteNumber(value)
            return num === null
                ? { status: "error", message: "Tan requires a numeric argument" }
                : { status: "success", message: Math.tan(num) }
        }
    },
    {
        name: "Trunc",
        type: Type.NUMBER,
        description: "Truncates the number to only the integer portion.",
        example: 'Trunc(-3.9)',
        args: [{ name: "number", type: Type.NUMBER }],
        function: (value) => {
            const num = toFiniteNumber(value)
            if (num === null) return { status: "error", message: "Trunc requires a numeric argument" }
            return { status: "success", message: num < 0 ? Math.ceil(num) : Math.floor(num) }
        }
    },
    {
        name: "VarP",
        type: Type.NUMBER,
        description: "Calculates the variance based on the entire population.",
        example: 'VarP(1, 2, 3, 4)',
        args: [],
        function: (...args) => {
            const numeric = numericValuesFromArgs(...args)
            if (numeric.status === 'error') return numeric
            return { status: "success", message: populationVariance(numeric.values) }
        }
    },
    {
        name: "If",
        type: Type.ANY,
        description: "Returns one value if a condition is true and another value if it is false.",
        example: 'If(varX > 10, "High", "Low")',
        args: [
            { name: "condition", type: Type.BOOLEAN },
            { name: "trueValue", type: Type.ANY },
            { name: "falseValue", type: Type.ANY }
        ],
        function: (condition, trueValue, falseValue, context) => {

            if (typeof condition !== "boolean") {
                return { status: "error", message: "First argument to If must be a boolean" }
            }

            // In evaluateAST, the context is always passed as the final argument. 
            // If the user provided 2 formula arguments, the context object ends up as the 3rd parameter.
            // If the user provided 3 formula arguments, the context object ends up as the 4th parameter.
            const isMissingFalse = (context === undefined);

            if (isMissingFalse) {
                // If falseValue is omitted, return null when condition is False (as per latest request)
                return condition ? trueValue : null;
            } else {
                // If both are provided, they must match types
                const typeTrue = typeof trueValue;
                const typeFalse = typeof falseValue;
                if (typeTrue !== typeFalse) {
                    return { status: "error", message: `Type mismatch: result types must match (${typeTrue} vs ${typeFalse})` }
                }
                return condition ? trueValue : falseValue;
            }
        }
    },
    {
        name: "Table",
        type: Type.ANY,
        description: "Creates a table from one or more records. Plain arrays are auto-wrapped as {Value: item}.",
        example: 'Table({Col1:"Hello"},{Col1:"World"})',
        args: [], // variadic
        function: (...args) => {
            // evaluateAST always appends the runtime context as the last argument.
            // Context objects have well-known action keys — filter them out.
            const isContext = (a) => a && typeof a === 'object' && ('notify' in a || 'navigate' in a || 'setVariable' in a || 'isActionContext' in a)
            const rows = args
                .filter(a => !isContext(a))
                .flatMap(a => {
                    if (Array.isArray(a)) return a.map(v => ({ Value: v }))
                    if (a !== null && typeof a === 'object') return [a]
                    return [{ Value: a }]
                })
            return { status: "success", message: rows }
        }
    }
]
