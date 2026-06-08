import { format, parseISO, isValid, startOfMonth, endOfMonth, subMonths } from 'date-fns'

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return 'Invalid Date'
  return format(d, 'dd-MMM-yyyy')
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return 'Invalid Date'
  return format(d, 'dd/MM/yyyy')
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return 'Invalid Date'
  return format(d, 'dd-MMM-yyyy HH:mm')
}

export function getCurrentFinancialYear(): string {
  const now = new Date()
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return `${year}-${(year + 1).toString().slice(-2)}`
}

export function getFinancialYearDates(fy: string): { start: Date; end: Date } {
  const [startYear] = fy.split('-').map(Number)
  return {
    start: new Date(startYear, 3, 1),
    end: new Date(startYear + 1, 2, 31)
  }
}

export function getMonthRange(monthsAgo: number = 0): { start: string; end: string } {
  const date = subMonths(new Date(), monthsAgo)
  const start = startOfMonth(date)
  const end = endOfMonth(date)
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd')
  }
}

export function today(): string {
  return format(new Date(), 'yyyy-MM-dd')
}
