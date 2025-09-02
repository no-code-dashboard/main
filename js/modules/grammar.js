"use strict"
import { _ } from "./util.js";
import { Param } from "./param.js";
export {
  parseGrammar,
  PLAN_GRAMMAR,
  TREND_GRAMMAR,
  CHART_FILTER_GRAMMAR,
  CALL_OUT_2X2_GRAMMAR,
  CALL_OUT_BAR_GRAMMAR,
  CALL_OUT_FIXED_GRAMMAR,
};
/**
 * A simple object parser with error messages
 * @param {string} input
 * @param {object} grammar
 * @returns {object|string} object if no error, error string otherwise
 */
function parseGrammar(input, grammar) {
    try {
        if (!input) throw "No input"
        if (!grammar) throw "No grammar"
        const trimmedInput = input.trim()
        if (trimmedInput === "") throw "No input"

        const output = getObjectFromString(`{${trimmedInput}}`)
        const isFunction = (v) => typeof v === "function"

        for (const key in output)
            if (!grammar[key]) throw `${key} not in grammar`

        for (const key in grammar) {
            if (key === "isValidObject") continue
            if (!isFunction(grammar[key])) continue
            const value = output[key]
            const e = grammar[key](value)
            if (typeof e === "string") throw e
            output[key] = e.value
            if (e.key) output[e.key] = e.value
            //TO DO delete output[key] if key has hyphen
        }

        if (isFunction(grammar.isValidObject)) {
            const e = grammar.isValidObject(output)
            if (e !== "") throw e
        }
        return output
    } catch (error) {
        //console.log(grammar, error)
        return error
    }
    function getObjectFromString(input) {
        const delimiters = `: [], "',{}`.split("")
        let stringFound = false
        let s = ""
        const tokens = _.tokenize(input, delimiters)
            .map((v) => {
                if (v === '"' || v === "'") {
                    if (stringFound) {
                        stringFound = false
                        return s
                    }
                    stringFound = true
                    s = ""
                    return ""
                }
                if (stringFound) {
                    s += v
                    return ""
                }
                return v.trim()
            })
            .filter((v) => v !== "")

        let i = -1
        function getObject() {
            const o = {}
            const lpar = tokens[++i]
            if (lpar !== "{") throw "must start with {"
            //next must be } or k:v
            while (i < tokens.length) {
                if (tokens[i + 1] === "}") break
                const kv = getKeyVal()
                o[kv.key] = kv.value
                if (tokens[++i] === ",") continue
                --i
                break
            }
            const rpar = tokens[++i]
            if (rpar !== "}") throw "must end with }"
            // const afterLpar
            return o
        }
        function getKeyVal() {
            //throw new Error("key value missing")
            const key = tokens[++i]
            if (!key) throw "key missing"
            const colon = tokens[++i]
            if (colon !== ":") throw ": missing"
            const value = getValue()
            return { key, value }
        }
        function getValue() {
            function getString(s) {
                return s[0] === '"' && s[s.length - 1] === '"'
                    ? s.substring(1, s.length - 1)
                    : s
            }
            const value = tokens[++i]
            if (!value) throw "value missing"
            if (value === "[") return getArray(--i)
            if (value === "{") return getObject(--i)
            return getString(value)
        }
        function getArray() {
            const a = []
            const lpar = tokens[++i]
            if (lpar !== "[") throw "must start with ["

            while (i < tokens.length) {
                if (tokens[i + 1] === "]") break
                const v = getValue()
                a.push(v)
                if (tokens[++i] === ",") continue
                --i
                break
            }
            const rpar = tokens[++i]
            if (rpar !== "]") throw "must end with ]"
            return a
        }
        return getObject()
    }
}

const PLAN_GRAMMAR = {
    start: (value) => {
        if (value === undefined) return "start missing"
        const date = value.trim()
        if (!_.isValidDate(date)) return "start must be date"
        return { value: _.formatDate(date, "YYYY-MM-DD") }
    },
    end: (value) => {
        if (value === undefined) return "end missing"
        const date = value.trim()
        if (!_.isValidDate(date)) return "end must be date"
        return { value: _.formatDate(date, "YYYY-MM-DD") }
    },
    "scope-from": (value) => {
        if (value === undefined) return "scope-from must be present"
        const error = "scope-from must be integer >= 0"
        if (!_.isInteger(value)) return error
        const n = Number(value)
        if (n < 0) return error
        return { key: "scopeFrom", value: n }
    },
    "scope-to": (value) => {
        // if (value === undefined) return { key: "scopeTo", value: "max" } //optional with default
        if (value === undefined) return "scope-to must be present"
        if (value.trim().toLowerCase() === "max")
            return { key: "scopeTo", value: "max" }
        const error = "scope-to must be max or integer >= 0"
        if (!_.isInteger(value)) return error
        const n = Number(value)
        if (n < 0) return error
        return { key: "scopeTo", value: n }
    },
    points: (value) => {
        if (value === undefined) return "points missing" //mandatory
        const validValues = ["line", "sigmoid"]
        const error = `points must be ${_.niceJoin(
            validValues
        )} or numeric array [0 ... 1]`
        if (typeof value === "string") {
            const TlcValue = value.trim().toLowerCase()
            if (!validValues.includes(TlcValue)) return error
            return { value: TlcValue }
        }
        if (!Array.isArray(value)) return error
        let isNumeric = value.reduce((result, v) => result && !isNaN(v), true)
        if (!isNumeric) return error
        let isAscending = value.every(
            (v, i) => i === 0 || Number(v) >= Number(value[i - 1])
        )
        if (!isAscending) return error
        const numberArray = value.map((v) => Number(v))
        if (numberArray[0] != 0 || numberArray[numberArray.length - 1] != 1)
            return error
        return { value: numberArray }
    },
    template:
        "start: date, end: date, scope-from: number, scope-to: max|number, points: line|sigmoid|[1...0]",
    isValidObject: (obj) => {
        if (!(obj.start < obj.end)) return "start must be < end"
        return ""
    },
}

const TREND_GRAMMAR = {
    template: "look-back: number, forecast-to: max|number|date",
    "look-back": (value) => {
        if (value === undefined) return "look-back must be present"
        const error = "look-back must be integer > 0"
        if (!_.isInteger(value)) return error
        const n = Number(value)
        if (n < 1) return error
        // return { value: n }
        return { key: "lookBack", value: n }
    },
    label: (value) => {
        if (value.trim() === "") return { key: "label", value: "Forecast" }
        return { value: value.trim() }
    },
    "forecast-to": (value) => {
        if (value === undefined) return "forecast-to must be present"
        const error = "forecast-to must be max, integer > 0 or date"
        if (_.isInteger(value)) {
            const n = Number(value)
            if (n < 1) return error
            // return { value: n }
            return { key: "forecastTo", value: n }
        }
        const tlcValue = value.trim().toLowerCase()
        if (tlcValue === "max") return { key: "forecastTo", value: "max" }
        if (_.isValidDate(tlcValue))
            return {
                key: "forecastTo",
                value: _.formatDate(tlcValue, "YYYY-MM-DD"),
            }
        return error
    },
    isValidObject: (obj) => {
        return ""
    },
}

const CHART_FILTER_GRAMMAR = {
    template:
        "action: exclude|include, where: [column, eq|neq, val|[v1,v2], and|or ...]",
    action: (value) => {
        if (value === undefined) return "action missing"
        const validValues = ["exclude", "include"]
        const error = `action must be ${_.niceJoin(validValues)}`
        const actionTlc = value.trim().toLowerCase()
        if (!validValues.includes(actionTlc)) return error
        return { value: actionTlc }
    },
    where: (value) => {
        if (value === undefined) return "where missing"
        const { columnNames } = Param.getParam("config")
        if (!columnNames) return `Cannot validate column-name`
        const error = `where must be an array with three or more entries`
        if (!Array.isArray(value)) return error
        if (value.length < 2) return error
        const returnValue = []
        for (let i = 0; i < value.length; i += 3) {
            const triad = {}
            {
                const columnName = value[i]
                if (columnName === undefined)
                    return `column name missing (${i - 1})`

                const found = columnNames.findIndex(
                    (v) =>
                        v.trim().toLowerCase() ===
                        columnName.trim().toLowerCase()
                )

                if (found === -1)
                    return `column-name must be valid column (${i - 1})`
                triad.columnName = columnNames[found]
            }

            {
                const op = value[i + 1]
                if (typeof op === undefined) return `op missing (${i})`
                const validOps = ["eq", "neq","in","nin"]
                const error = `op must be ${_.niceJoin(validOps)} (${i + 1})`
                if (typeof op !== "string") return error
                const opTlc = op.trim().toLowerCase()
                if (!validOps.includes(opTlc)) return error
                triad.op = opTlc
            }

            {
                const operand = value[i + 2]
                if (operand === undefined) return `operand missing (${i + 1})`
                if (typeof operand === "string") triad.operand = operand.trim()
                if (Array.isArray(operand))
                    triad.operand = operand.map((v) => v.trim())
                if (!triad.operand)
                    return `operand must be value or [values] (${i + 2})`
            }

            returnValue.push(triad)

            {
                const logicalOp = value[i + 3]
                if (!logicalOp) continue
                const validLogicalOps = ["and", "or"]
                const logicalOpTlc = logicalOp.trim().toLowerCase()
                if (!validLogicalOps.includes(logicalOpTlc))
                    return `triads must be separated by and|or (${i + 2})`

                if (!value[i + 4])
                    return `triad missing after ${logicalOpTlc} (${i + 3})`

                returnValue.push(logicalOpTlc)
                i++
            }
        }
        return { value: returnValue }
    },
    isValidObject: (obj) => {
        return ""
    },
}

const CALL_OUT_FIXED_GRAMMAR = {
    template:
        "chart-no: none, value: number|[days|workdays, start-date, end-date]",
    "chart-no": (value) => {
        const error = "chart-no must be 'none'"
        if (value === undefined) return "chart-no missing"
        if (typeof value !== "string") return error
        if (value.trim().toLowerCase() === "none")
            return { key: "chartNo", value: "none" }
        return error
    },
    value: (value) => {
        if (value === undefined) return "value missing"
        const error = "value must be number or 'calculate'"
        if (typeof value !== "string") return error
        if (!isNaN(valueTlc)) return { value: Number(valueTlc) }
        if (valueTlc === "calculate") return { value: valueTlc }
        return error
    },

    isValidObject: (obj) => {
        return ""
    },
}
const CALL_OUT_BAR_GRAMMAR = {
    template: "chart-no: number, value: max|min|category, category: string",
    "chart-no": (value) => {
        if (value === undefined) return "chart-no missing"
        if (_.isInteger(value)) return { key: "chartNo", value: Number(value) }
        return `chart-no must be valid chart`
    },
    value: (value) => {
        if (value === undefined) return "value missing"
        const valueTlc = value.trim().toLowerCase()
        const validValues = ["max", "min", "category"]
        if (validValues.includes(valueTlc)) return { value: valueTlc }
        return `value must be ${_.niceJoin(validValues)}`
    },
    category: (value) => {
        return value
        // if (value === undefined) return value
        // const valueTlc = value.trim().toLowerCase()
        // const validValues = ["max", "min", "category"]
        // if (validValues.includes(valueTlc)) return { value: valueTlc }
        // return `value must be ${_.niceJoin(validValues)}`
    },
    isValidObject: (obj) => {
        if (obj.value !== "category") return ""
        if (!obj.value) return "category missing"
        return ""
    },
}
const CALL_OUT_2X2_GRAMMAR = {
    template:
        "chart-no: number, value: max|min|category, category: [x-column-name, y-column-name]",
    "chart-no": (value) => {
        if (value === undefined) return "chart-no missing"
        if (_.isInteger(value)) return { key: "chartNo", value: Number(value) }
        return `chart-no must be valid chart`
    },
    value: (value) => {
        if (value === undefined) return "value missing"
        const valueTlc = value.trim().toLowerCase()
        const validValues = ["max", "min", "category"]
        if (validValues.includes(valueTlc)) return { value: valueTlc }
        return `value must be ${_.niceJoin(validValues)}`
    },
    isValidObject: (obj) => {
        return ""
    },
}
const CALL_OUT_TREND_GRAMMAR = {
    template: "chart-no: number, date: date, category: actual|plan|forecast",
    "chart-no": (value) => {
        if (value === undefined) return "chart-no missing"
        if (_.isInteger(value)) return { key: "chartNo", value: Number(value) }
        return `chart-no must be valid chart`
    },
    value: (value) => {
        if (value === undefined) return "value missing"
        const valueTlc = value.trim().toLowerCase()
        const validValues = ["max", "min", "category"]
        if (validValues.includes(valueTlc)) return { value: valueTlc }
        return `value must be ${_.niceJoin(validValues)}`
    },
    isValidObject: (obj) => {
        return ""
    },
}

function getTemplate(grammar) {
    if (grammar.template) return grammar.template
    return "No template"
}
