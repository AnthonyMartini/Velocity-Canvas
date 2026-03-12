export function formatDefaultValue(value) {
  if (value === undefined) {
    return <span className="italic opacity-50">none</span>
  }
  if (typeof value === 'boolean') {
    return value.toString()
  }
  return String(value)
}

export function formatPropertyType(property, colorMap) {
  const colorClass = colorMap[property.type] || 'text-subtext bg-overlay/10 border-overlay/20'
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${colorClass}`}>
      {property.type} {property.type === 'select' && property.options && <span className="opacity-60 ml-1">({property.options.length})</span>}
    </span>
  )
}
