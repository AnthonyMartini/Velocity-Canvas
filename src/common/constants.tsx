// ── Component Type Icons ──────────────────────────────────────────────────────
// ── Component Type Icons ──────────────────────────────────────────────────────
const ACCENT_COLOR = "currentColor"; // Changed to white/currentColor

export const ButtonIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path 
      d="M8 4l0 22 6-6 4 8 3-2-4-8 8 0z" 
      stroke={ACCENT_COLOR} 
      fill={ACCENT_COLOR} 
      fillOpacity="0.2" 
      strokeLinejoin="round" 
    />
  </svg>
)

export const LabelIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M8 8h16M16 8v16" stroke={ACCENT_COLOR} strokeLinecap="round" />
  </svg>
)

export const ContainerIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="4" y="6" width="24" height="20" rx="1" strokeDasharray="4 4" />
  </svg>
)

export const TextInputIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M8 10H4v12h4m16-12h4v12h-4" strokeLinecap="round" />
    <path d="M12 10v12" stroke={ACCENT_COLOR} strokeWidth="3" strokeLinecap="round" />
    <rect x="8" y="15" width="16" height="2" fill="currentColor" fillOpacity="0.1" stroke="none" />
  </svg>
)

export const DropdownIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="4" y="8" width="24" height="16" rx="1" />
    <path d="M19 14l3 3 3-3" stroke={ACCENT_COLOR} strokeLinecap="round" strokeLinejoin="round" />
    <line x1="16" y1="10" x2="16" y2="22" stroke={ACCENT_COLOR} />
  </svg>
)

export const GalleryIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="6" y="6" width="20" height="20" rx="1" />
    <path d="M10 11h12m-12 5h12m-12 5h12" strokeOpacity="0.5" />
    <circle cx="8" cy="11" r="0.8" fill="currentColor" />
    <circle cx="8" cy="16" r="0.8" fill="currentColor" />
    <circle cx="8" cy="21" r="0.8" fill="currentColor" />
  </svg>
)

export const CheckboxIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="8" y="8" width="16" height="16" rx="1" />
    <path d="M12 16l3 3 6-7" stroke={ACCENT_COLOR} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const RectangleIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="4" y="8" width="24" height="16" rx="1" />
  </svg>
)

export const IconIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="16" cy="16" r="10" />
    <circle cx="16" cy="16" r="4" stroke={ACCENT_COLOR} />
  </svg>
)

export const AppIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M16 4L4 16l12 12 12-12L16 4z" />
    <path d="M16 10l-6 6 6 6 6-6-6-6z" stroke={ACCENT_COLOR} />
  </svg>
)

export const ScreenIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="4" y="6" width="24" height="16" rx="1" />
    <path d="M12 26h8m-4-4v4" strokeLinecap="round" />
  </svg>
)

export const HtmlTextIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M12 10L8 16l4 6m8-12l4 6-4 6" stroke={ACCENT_COLOR} strokeLinecap="round" strokeLinejoin="round" />
    <line x1="18" y1="8" x2="14" y2="24" strokeOpacity="0.4" />
  </svg>
)

export const DatePickerIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="6" y="8" width="20" height="18" rx="1" />
    <line x1="6" y1="14" x2="26" y2="14" />
    <line x1="11" y1="6" x2="11" y2="10" />
    <line x1="21" y1="6" x2="21" y2="10" />
    <rect x="18" y="18" width="4" height="4" fill={ACCENT_COLOR} fillOpacity="0.4" stroke="none" />
  </svg>
)

export const ComboBoxIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="4" y="8" width="24" height="16" rx="1" />
    <path d="M19 14l3 3 3-3" stroke={ACCENT_COLOR} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 14h8m-8 4h4" stroke={ACCENT_COLOR} strokeLinecap="round" />
  </svg>
)

// Lookup map: component type → icon component
export const TYPE_ICONS = {
  App:       AppIcon,
  Screen:    ScreenIcon,
  Button:    ButtonIcon,
  Label:     LabelIcon,
  Container: ContainerIcon,
  TextInput: TextInputIcon,
  Dropdown:  DropdownIcon,
  Checkbox:  CheckboxIcon,
  Rectangle: RectangleIcon,
  Icon:      IconIcon,
  Gallery:   GalleryIcon,
  HtmlText:  HtmlTextIcon,
  DatePicker: DatePickerIcon,
  ComboBox:  ComboBoxIcon,
}

// Lookup map: component type → Tailwind background colour class
export const TYPE_COLORS = {
  App:       'bg-violet-600',
  Screen:    'bg-indigo-500',
  Button:    'bg-[#0078d4]',
  Label:     'bg-overlay',
  Container: 'bg-violet-500',
  TextInput: 'bg-emerald-500',
  Dropdown:  'bg-amber-500',
  Checkbox:  'bg-cyan-500',
  Rectangle: 'bg-zinc-500',
  Icon:      'bg-blue-400',
  Gallery:   'bg-pink-500',
  HtmlText:  'bg-fuchsia-400',
  DatePicker: 'bg-teal-400',
  ComboBox:  'bg-orange-400',
}
