// verify_logic.js
import { parseFormula, evaluateAST } from '../frontend/src/common/FormulaParser.jsx'

const testCases = [
    { formula: '=If(true, 1, 2)', expected: 1 },
    { formula: '=If(false, 1, 2)', expected: 2 },
    { formula: '=If(1 > 0, "Yes", "No")', expected: "Yes" },
    { formula: '=If(1 < 0, "Yes", "No")', expected: "No" },
    { formula: '=If(1 = 1, "Match", "No")', expected: "Match" },
    { formula: '=If(1 <> 2, "Diff", "Same")', expected: "Diff" },
    { formula: '=If(true, "A", 1)', expected: "Type mismatch: result types must match (string vs number)" }, // Error case
]

console.log("Running tests...")

testCases.forEach((tc, i) => {
    try {
        const ast = parseFormula(tc.formula, true)
        const result = evaluateAST(ast, {}, [], new Set(), null, null, {}, true)
        
        if (result === tc.expected) {
            console.log(`Test ${i + 1} PASSED: ${tc.formula} -> ${result}`)
        } else {
            console.log(`Test ${i + 1} FAILED: ${tc.formula} -> Expected ${tc.expected}, got ${result}`)
        }
    } catch (e) {
        if (e.message === tc.expected) {
            console.log(`Test ${i + 1} PASSED (Error caught): ${tc.formula} -> ${e.message}`)
        } else {
            console.log(`Test ${i + 1} FAILED: ${tc.formula} -> Expected error "${tc.expected}", got "${e.message}"`)
        }
    }
})
