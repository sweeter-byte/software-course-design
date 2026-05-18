export function formatDateTimeForDisplay(value?: string | null) {
  if (!value) return '未设置'

  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function toDateTimeLocalValue(value?: string | null) {
  if (!value) return ''

  const date = new Date(value)
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

export function fromDateTimeLocalValue(value: string) {
  if (!value) return ''

  return new Date(value).toISOString()
}
