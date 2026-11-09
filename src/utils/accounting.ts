/**
 * Accounting calculation utility for الإقفال | AL EQFAL
 * High-precision financial arithmetic avoiding floating point rounding anomalies.
 */

export interface ShiftCalculations {
  cashSales: number;
  cardSales: number;
  expenses: number;
  totalSales: number;
  remainingInBox: number;
  netPeriod: number;
  isValid: boolean;
  errors: string[];
}

/**
 * Round to 2 decimal places with mathematical precision
 */
export function roundCurrency(val: number): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Core Accounting Equations:
 * 1. Total Sales = Cash + Card (POS)
 * 2. Remaining in Box (Cash Register) = Cash - Expenses
 * 3. Net Period = Total Sales - Expenses
 */
export function calculateShiftTotals(
  cashInput: number | string,
  cardInput: number | string,
  expensesInput: number | string
): ShiftCalculations {
  const cash = typeof cashInput === 'string' ? parseFloat(cashInput) || 0 : cashInput || 0;
  const card = typeof cardInput === 'string' ? parseFloat(cardInput) || 0 : cardInput || 0;
  const expenses = typeof expensesInput === 'string' ? parseFloat(expensesInput) || 0 : expensesInput || 0;

  const errors: string[] = [];

  if (cash < 0) errors.push('cash_must_be_positive');
  if (card < 0) errors.push('card_must_be_positive');
  if (expenses < 0) errors.push('expenses_must_be_positive');

  const safeCash = Math.max(0, cash);
  const safeCard = Math.max(0, card);
  const safeExpenses = Math.max(0, expenses);

  const totalSales = roundCurrency(safeCash + safeCard);
  const remainingInBox = roundCurrency(safeCash - safeExpenses);
  const netPeriod = roundCurrency(totalSales - safeExpenses);

  return {
    cashSales: safeCash,
    cardSales: safeCard,
    expenses: safeExpenses,
    totalSales,
    remainingInBox,
    netPeriod,
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Format currency with locale and symbol
 */
export function formatCurrency(
  amount: number,
  currency: string = 'SAR',
  language: 'ar' | 'en' | 'ur' = 'ar'
): string {
  const rounded = roundCurrency(amount);
  const formattedNumber = new Intl.NumberFormat(
    language === 'en' ? 'en-US' : language === 'ur' ? 'ur-PK' : 'ar-SA',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(rounded);

  const currencyLabels: Record<string, Record<'ar' | 'en' | 'ur', string>> = {
    SAR: { ar: 'ر.س', en: 'SAR', ur: 'سعودی ریال' },
    AED: { ar: 'د.إ', en: 'AED', ur: 'درہم' },
    QAR: { ar: 'ر.ق', en: 'QAR', ur: 'قطری ریال' },
    KWD: { ar: 'د.ك', en: 'KWD', ur: 'کویتی دینار' },
    USD: { ar: '$', en: '$', ur: '$' },
  };

  const label = currencyLabels[currency]?.[language] || currency;

  if (language === 'en') {
    return `${label} ${formattedNumber}`;
  }
  return `${formattedNumber} ${label}`;
}

/**
 * Format date for display
 */
export function formatDate(dateString: string, language: 'ar' | 'en' | 'ur' = 'ar'): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat(
      language === 'en' ? 'en-US' : language === 'ur' ? 'ur-PK' : 'ar-SA',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }
    ).format(d);
  } catch {
    return dateString;
  }
}
