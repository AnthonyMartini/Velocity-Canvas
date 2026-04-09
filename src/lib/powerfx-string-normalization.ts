function normalizeSingleQuotedPowerFxString(value: string) {
  if (!value.includes("'")) return value

  let result = ''
  let inDoubleQuotedString = false
  let inSingleQuotedString = false
  let singleQuotedBuffer = ''

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i]

    if (inSingleQuotedString) {
      if (char === "'") {
        result += JSON.stringify(singleQuotedBuffer)
        singleQuotedBuffer = ''
        inSingleQuotedString = false
      } else {
        singleQuotedBuffer += char
      }
      continue
    }

    if (char === '"') {
      inDoubleQuotedString = !inDoubleQuotedString
      result += char
      continue
    }

    if (!inDoubleQuotedString && char === "'") {
      inSingleQuotedString = true
      singleQuotedBuffer = ''
      continue
    }

    result += char
  }

  if (inSingleQuotedString) {
    return value
  }

  return result
}

export function normalizeSingleQuotedStringLiteralsDeep(value: any): any {
  if (typeof value === 'string') {
    return normalizeSingleQuotedPowerFxString(value)
  }

  if (Array.isArray(value)) {
    return value.map(normalizeSingleQuotedStringLiteralsDeep)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizeSingleQuotedStringLiteralsDeep(nestedValue)])
    )
  }

  return value
}
