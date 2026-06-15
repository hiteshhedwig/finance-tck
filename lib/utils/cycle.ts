import {
  addMonths,
  subMonths,
  format,
  startOfMonth,
  endOfMonth,
  setDate,
  isBefore,
  isAfter,
  isEqual,
  parseISO,
} from 'date-fns';
import type { SalaryCycle } from '../../types';

/**
 * Given a reference date and salaryDay (default 7),
 * returns the salary cycle that contains that date.
 *
 * Cycle runs: salaryDay of monthN → (salaryDay - 1) of monthN+1
 * e.g. 7 Mar → 6 Apr
 */
export function getSalaryCycleForDate(
  date: Date,
  salaryDay: number = 7
): SalaryCycle {
  const d = new Date(date);
  const dayOfMonth = d.getDate();

  let cycleStart: Date;
  if (dayOfMonth >= salaryDay) {
    // We're in the current month's cycle (started this month)
    cycleStart = setDate(new Date(d.getFullYear(), d.getMonth(), 1), salaryDay);
  } else {
    // We're before the salary day; cycle started last month
    const prevMonth = subMonths(d, 1);
    cycleStart = setDate(
      new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1),
      salaryDay
    );
  }

  // Cycle ends the day before salaryDay of next month
  const nextCycleStart = addMonths(cycleStart, 1);
  const cycleEnd = new Date(nextCycleStart);
  cycleEnd.setDate(cycleEnd.getDate() - 1);

  return {
    start: cycleStart,
    end: cycleEnd,
    label: `${format(cycleStart, 'd MMM')} – ${format(cycleEnd, 'd MMM')}`,
  };
}

/**
 * Returns the previous salary cycle relative to a given cycle.
 */
export function getPreviousCycle(
  cycle: SalaryCycle,
  salaryDay: number = 7
): SalaryCycle {
  const prevDate = new Date(cycle.start);
  prevDate.setDate(prevDate.getDate() - 1);
  return getSalaryCycleForDate(prevDate, salaryDay);
}

/**
 * Returns the next salary cycle relative to a given cycle.
 */
export function getNextCycle(
  cycle: SalaryCycle,
  salaryDay: number = 7
): SalaryCycle {
  const nextDate = new Date(cycle.end);
  nextDate.setDate(nextDate.getDate() + 1);
  return getSalaryCycleForDate(nextDate, salaryDay);
}

/**
 * Given a credit card spend date, determine:
 * - statement_date: 1st of the following month after statementDay
 * - due_date: dueDay of the statement month
 *
 * Logic: if I spend on March 9 with statementDay=1:
 *   Next statement after March 9 is April 1 → due April 21
 */
export function getCCStatementCycle(
  spendDate: Date,
  statementDay: number = 1,
  dueDay: number = 21
): { statementDate: Date; dueDate: Date; statementMonth: string } {
  const d = new Date(spendDate);

  // The statement that will capture this spend:
  // Spend happens between (last statementDay exclusive) and (current statementDay inclusive)
  // "current statementDay" closes the billing period
  // So spend on March 9 → next statement is April 1
  let statementDate: Date;

  if (d.getDate() < statementDay) {
    // e.g. spend on March 1 (before statementDay=1 doesn't exist), but if statementDay=5 and spend on March 3
    // → current month statement covers it (March 5 statement)
    statementDate = setDate(
      new Date(d.getFullYear(), d.getMonth(), 1),
      statementDay
    );
  } else {
    // spend on or after statementDay → next month's statement
    const nextMonth = addMonths(d, 1);
    statementDate = setDate(
      new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1),
      statementDay
    );
  }

  const dueDate = setDate(
    new Date(statementDate.getFullYear(), statementDate.getMonth(), 1),
    dueDay
  );

  return {
    statementDate,
    dueDate,
    statementMonth: format(statementDate, 'yyyy-MM-dd'),
  };
}

/**
 * Returns calendar month range for a date.
 */
export function getCalendarMonth(date: Date): { start: Date; end: Date } {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

export function isInRange(date: Date, start: Date, end: Date): boolean {
  const d = date.getTime();
  return d >= start.getTime() && d <= end.getTime();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyCompact(amount: number): string {
  if (Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (Math.abs(amount) >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${amount.toFixed(0)}`;
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMM yyyy');
}

export function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMM');
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
