const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const LOCAL_DATE_TIME_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}) (AM|PM)$/i

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function parseStoredDateValue(value: any): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime())
  }

  if (typeof value !== 'string') return null

  const normalized = value.trim()
  if (!normalized) return null

  if (ISO_DATE_PATTERN.test(normalized)) {
    const [year, month, day] = normalized.split('-').map(Number)
    const parsed = new Date(year, month - 1, day, 0, 0, 0, 0)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const match = normalized.match(LOCAL_DATE_TIME_PATTERN)
  if (!match) return null

  const [, monthText, dayText, yearText, hourText, minuteText, meridiemText] = match
  const month = Number(monthText)
  const day = Number(dayText)
  const year = Number(yearText)
  const minute = Number(minuteText)
  const normalizedHour = Number(hourText) % 12
  const hour = meridiemText.toUpperCase() === 'PM' ? normalizedHour + 12 : normalizedHour

  const parsed = new Date(year, month - 1, day, hour, minute, 0, 0)
  if (Number.isNaN(parsed.getTime())) return null

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null
  }

  return parsed
}

export function isStoredDateValue(value: any) {
  return parseStoredDateValue(value) !== null
}

export function formatStoredDateValue(value: Date) {
  const hours = value.getHours()
  const hour12 = hours % 12 || 12
  const meridiem = hours >= 12 ? 'PM' : 'AM'

  return `${value.getMonth() + 1}/${value.getDate()}/${value.getFullYear()} ${hour12}:${pad(value.getMinutes())} ${meridiem}`
}

export function toDateInputValue(value: any) {
  const parsed = parseStoredDateValue(value)
  if (!parsed) return ''

  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`
}

export function formatDateSelectionForStorage(dateInputValue: string, existingValue: any = null) {
  if (!ISO_DATE_PATTERN.test(String(dateInputValue || '').trim())) return ''

  const [year, month, day] = String(dateInputValue).trim().split('-').map(Number)
  const timeSource = parseStoredDateValue(existingValue) || new Date()
  const nextValue = new Date(
    year,
    month - 1,
    day,
    timeSource.getHours(),
    timeSource.getMinutes(),
    0,
    0,
  )

  return formatStoredDateValue(nextValue)
}
