import PropTypes from 'prop-types'

export default function PropField({ prop, value, onChange }) {
  if (prop.type === 'boolean') {
    return (
      <div className="flex items-center justify-between py-1.5">
        <label className="text-xs text-subtext">{prop.label}</label>
        <button onClick={() => onChange(!value)}
          className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none cursor-pointer ${value ? 'bg-accent' : 'bg-overlay'}`}>
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${value ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
      </div>
    )
  }
  if (prop.type === 'color') {
    // Determine the hex value for the color picker (it requires #RRGGBB)
    // If it's transparent, we default the picker itself to #ffffff, but keep the input value as 'transparent'
    const isTransparent = value === 'transparent' || value === 'rgba(0,0,0,0)'
    let hexValue = '#ffffff'
    if (!isTransparent && value && value.startsWith('#')) {
      hexValue = value.slice(0, 7) // Ensure 6-char hex with #
    }

    return (
      <div className="flex items-center justify-between py-1.5 gap-2">
        <label className="text-xs text-subtext shrink-0">{prop.label}</label>
        <div className="flex items-center gap-1.5">
          <div className="relative w-5 h-5 rounded border border-overlay/50 shrink-0 overflow-hidden"
            style={{ 
              backgroundColor: isTransparent ? 'transparent' : value, 
              backgroundImage: isTransparent ? 'repeating-conic-gradient(#aaa 0% 25%, white 0% 50%) 0 0 / 8px 8px' : 'none' 
            }}
          >
            <input 
              type="color" 
              value={hexValue} 
              onChange={e => onChange(e.target.value)}
              className="absolute -inset-2 w-[200%] h-[200%] opacity-0 cursor-pointer"
              title="Pick a color"
            />
          </div>
          <input type="text" value={value} onChange={e => onChange(e.target.value)}
            className="w-24 bg-base border border-overlay/40 rounded-md px-2 py-1 text-xs text-text focus:outline-none focus:border-accent/60 text-right" 
          />
        </div>
      </div>
    )
  }
  if (prop.type === 'select') {
    return (
      <div className="flex items-center justify-between py-1.5 gap-2">
        <label className="text-xs text-subtext shrink-0">{prop.label}</label>
        <select value={value} onChange={e => onChange(e.target.value)}
          className="bg-base border border-overlay/40 rounded-md px-2 py-1 text-xs text-text focus:outline-none focus:border-accent/60 cursor-pointer">
          {prop.options.map((o, i) => (
            <option key={o} value={o}>
              {prop.optionLabels ? prop.optionLabels[i] : o}
            </option>
          ))}
        </select>
      </div>
    )
  }
  if (prop.type === 'icon-selector') {
    return (
      <div className="flex flex-col py-2 gap-2 border-t border-overlay/10 mt-1">
        <label className="text-xs font-semibold text-text">{prop.label}</label>
        <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
          {prop.options.map((o) => {
            const isSelected = value === o.value;
            return (
              <button
                key={o.value}
                onClick={() => onChange(o.value)}
                title={o.label}
                className={`flex items-center justify-center p-1.5 border rounded-lg transition-all duration-200 
                  ${isSelected ? 'border-accent bg-accent/10 text-accent ring-1 ring-accent/50' : 'border-overlay/20 bg-surface hover:bg-overlay/10 hover:border-overlay/40 text-subtext'}
                `}
                dangerouslySetInnerHTML={{ __html: o.svg }}
              />
            )
          })}
        </div>
      </div>
    )
  }
  if (prop.type === 'number') {
    return (
      <div className="flex items-center justify-between py-1.5 gap-2">
        <label className="text-xs text-subtext shrink-0">{prop.label}</label>
        <input type="number" value={value} onChange={e => onChange(Number(e.target.value))}
          className="w-20 bg-base border border-overlay/40 rounded-md px-2 py-1 text-xs text-text focus:outline-none focus:border-accent/60 text-right" />
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between py-1.5 gap-2">
      <label className="text-xs text-subtext shrink-0">{prop.label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        className="flex-1 min-w-0 bg-base border border-overlay/40 rounded-md px-2 py-1 text-xs text-text focus:outline-none focus:border-accent/60" />
    </div>
  )
}

PropField.propTypes = {
  prop: PropTypes.shape({
    type: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.any),
    optionLabels: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
}
