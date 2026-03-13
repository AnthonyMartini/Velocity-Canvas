

export const Type = {
    EVENT: "event",
    TEXT: "text",
    NUMBER: "number",
    ANY: "any"
}

// These are the available functions that can be used in the formulas within our app. 
// The app needs to verify the type of the property that invokes these functions matchs the type of the function. 
// For example, if a property is of type "text", it should not be able to invoke a function of type "number". App should return an error message. 
// Actions are only available to event properties. 

export const FUNCTIONS = [
    {
        name: "Notify",
        type: Type.EVENT,
        description: "Displays a notification message.",
        // Arguments expected from the user's formula
        args: [{ name: "message", type: Type.TEXT }],
        function: (message, context)=>{
            //Type check for message
            if(typeof message !== "string"){
                return {status: "error", message: "Message must be a string"}
            }
            if (context && context.notify) context.notify(message)
            return {status: "success", message: "Notification displayed"}
        }
    },
    {
        name: "Navigate",
        type: Type.EVENT,
        description: "Navigates to a different screen.",
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
        args: [
            { name: "variable", type: Type.TEXT },
            { name: "value", type: Type.ANY }
        ],
        function: (variable, value, context)=>{
            //Type check for variable and value
            if(typeof variable !== "string"){
                return {status: "error", message: "Variable name must be a string"}
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
        args: [
            { name: "red", type: Type.NUMBER },
            { name: "green", type: Type.NUMBER },
            { name: "blue", type: Type.NUMBER }
        ],
        function: (r, g, b) => `rgb(${r}, ${g}, ${b})`
    }
]