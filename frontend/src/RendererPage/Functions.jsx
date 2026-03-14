
export const Type = {
    EVENT: "event",
    TEXT: "text",
    NUMBER: "number",
    ANY: "any",
    BOOLEAN: "boolean",
    NOTIFICATION_TYPE: "NotificationType"
}

export const NotificationType = {
    Information: "Information",
    Warning: "Warning",
    Success: "Success",
    Error: "Error"
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

export const Overflow = {
    Hidden: "Overflow.Hidden",
    Scroll: "Overflow.Scroll",
    Visible: "Overflow.Visible"
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
        example: 'Navigate("Screen2")',
        args: [{ name: "screen", type: Type.TEXT }],
        function: (screen, context)=>{
            //Type check for screen
            if(typeof screen !== "string"){
                return {status: "error", message: "Screen name must be a string"}
            }
            if (context && context.navigate) context.navigate(screen)
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
    }
]