function isoDateDaysFrom(baseDate: Date, daysFromNow: number, hour: number) {
  const date = new Date(baseDate)
  date.setUTCDate(date.getUTCDate() + daysFromNow)
  date.setUTCHours(hour, 0, 0, 0)
  return date.toISOString()
}

export function createDefaultAssignmentDates(now = new Date()) {
  return {
    startAt: isoDateDaysFrom(now, -7, 8),
    dueAt: isoDateDaysFrom(now, 30, 15),
  }
}
