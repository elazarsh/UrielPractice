export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function diffInDays(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))
}

/** לוח שנה עברי – ימי חג ישראלי (2025-2026) – ניתן להרחבה */
const ISRAELI_HOLIDAYS_2025_2026: string[] = [
  '2025-09-22', '2025-09-23', // ראש השנה
  '2025-10-01', '2025-10-02', // יום כיפור
  '2025-10-06', '2025-10-07', // סוכות
  '2025-10-13', '2025-10-14', // שמחת תורה
  '2025-12-25', '2025-12-26', // חנוכה (ימי עסקים בד"כ)
  '2026-03-13',               // פורים
  '2026-04-01', '2026-04-08', // פסח
  '2026-04-28',               // יום הזיכרון
  '2026-04-29',               // יום העצמאות
  '2026-05-19',               // שבועות
]

export function isIsraeliHoliday(date: Date): boolean {
  const iso = date.toISOString().split('T')[0]
  return ISRAELI_HOLIDAYS_2025_2026.includes(iso)
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 5 || day === 6 // שישי / שבת
}

/** מחשב תאריך יעד – מתחשב בסופ"ש וחגים ישראליים */
export function calcIsraeliDueDate(base: Date, offsetDays: number): Date {
  let current = new Date(base)
  let added = 0
  while (added < offsetDays) {
    current = addDays(current, 1)
    if (!isWeekend(current) && !isIsraeliHoliday(current)) {
      added++
    }
  }
  // אם התאריך עצמו חל בסופ"ש/חג – זוז קדימה
  while (isWeekend(current) || isIsraeliHoliday(current)) {
    current = addDays(current, 1)
  }
  return current
}

export function getPeriodLabel(year: number, month: number | null, monthEnd?: number | null): string {
  if (!month) return `שנת ${year}`
  const MONTHS = ['', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                   'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
  if (monthEnd && monthEnd !== month) return `${MONTHS[month]}-${MONTHS[monthEnd]} ${year}`
  return `${MONTHS[month]} ${year}`
}
