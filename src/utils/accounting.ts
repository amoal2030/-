/**
 * Accounting calculation utility for الإقفال | AL EQFAL
 * High-precision financial arithmetic avoiding floating point rounding anomalies
 * using integer Halala arithmetic (100 Halalas = 1 Currency Unit).
 */

export interface ShiftCalculations {
  cashSales: number;
  cardSales: number;
  expenses: number;
  totalSales: number;
  remainingInBox: number;
  netPeriod: number;
  // Raw halala values for zero-loss financial auditing
  cashHalalas: number;
  cardHalalas: number;
  expensesHalalas: number;
  totalSalesHalalas: number;
  remainingInBoxHalalas: number;
  netPeriodHalalas: number;
  isValid: boolean;
  errors: string[];
}

/**
 * Convert any currency float/string into integer Halalas (cents)
 * e.g., 1500.50 -> 150050
 */
export function toHalalas(amount: number | string): number {
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount || 0;
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100);
}

/**
 * Convert integer Halalas back to standard decimal currency
 * e.g., 150050 -> 1500.50
 */
export function fromHalalas(halalas: number): number {
  return halalas / 100;
}

/**
 * Round to 2 decimal places with mathematical precision
 */
export function roundCurrency(val: number): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  return fromHalalas(toHalalas(val));
}

/**
 * Core Accounting Equations executed with Integer Halala Precision:
 * 1. Total Sales = Cash + Card (POS)
 * 2. Remaining in Box (Cash Register) = Cash - Expenses
 * 3. Net Period = Total Sales - Expenses
 */
export function calculateShiftTotals(
  cashInput: number | string,
  cardInput: number | string,
  expensesInput: number | string
): ShiftCalculations {
  const cashNum = typeof cashInput === 'string' ? parseFloat(cashInput) || 0 : cashInput || 0;
  const cardNum = typeof cardInput === 'string' ? parseFloat(cardInput) || 0 : cardInput || 0;
  const expensesNum = typeof expensesInput === 'string' ? parseFloat(expensesInput) || 0 : expensesInput || 0;

  const errors: string[] = [];
  if (cashNum < 0) errors.push('cash_must_be_positive');
  if (cardNum < 0) errors.push('card_must_be_positive');
  if (expensesNum < 0) errors.push('expenses_must_be_positive');

  // Integer Halalas
  const cashHalalas = Math.max(0, toHalalas(cashNum));
  const cardHalalas = Math.max(0, toHalalas(cardNum));
  const expensesHalalas = Math.max(0, toHalalas(expensesNum));

  // Pure integer arithmetic
  const totalSalesHalalas = cashHalalas + cardHalalas;
  const remainingInBoxHalalas = cashHalalas - expensesHalalas;
  const netPeriodHalalas = totalSalesHalalas - expensesHalalas;

  return {
    cashSales: fromHalalas(cashHalalas),
    cardSales: fromHalalas(cardHalalas),
    expenses: fromHalalas(expensesHalalas),
    totalSales: fromHalalas(totalSalesHalalas),
    remainingInBox: fromHalalas(remainingInBoxHalalas),
    netPeriod: fromHalalas(netPeriodHalalas),
    cashHalalas,
    cardHalalas,
    expensesHalalas,
    totalSalesHalalas,
    remainingInBoxHalalas,
    netPeriodHalalas,
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Deterministic Closing Document ID Generator
 * Prevents duplicate closings for the same branch, date, and period at the database layer.
 * Format: org_[orgId]_br_[branchId]_[YYYY-MM-DD]_[morning|evening]
 */
export function generateDeterministicClosingId(
  orgId: string,
  branchId: string,
  date: string,
  period: 'morning' | 'evening'
): string {
  const cleanOrg = orgId.replace(/[^a-zA-Z0-9]/g, '');
  const cleanBranch = branchId.replace(/[^a-zA-Z0-9]/g, '');
  const cleanDate = date.replace(/[^a-zA-Z0-9]/g, '-');
  return `cls_${cleanOrg}_${cleanBranch}_${cleanDate}_${period}`;
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

/**
 * Export closings array to CSV (compatible with Microsoft Excel)
 */
export function exportClosingsToCSV(
  closings: Array<{
    date: string;
    branchName: string;
    employeeName: string;
    period: string;
    cashSales: number;
    cardSales: number;
    totalSales: number;
    expenses: number;
    remainingInBox: number;
    netPeriod: number;
    status: string;
  }>,
  currency: string = 'SAR'
): void {
  const headers = [
    'التاريخ',
    'الفرع',
    'الموظف',
    'الفترة',
    `النقد (${currency})`,
    `الشبكة (${currency})`,
    `إجمالي المبيعات (${currency})`,
    `المشتريات (${currency})`,
    `الباقي في الصندوق (${currency})`,
    `صافي الفترة (${currency})`,
    'الحالة',
  ];

  const statusMap: Record<string, string> = {
    draft: 'مسودة',
    pending_review: 'مرسل للمراجعة',
    approved: 'معتمد',
    rejected: 'معاد للتعديل',
  };

  const periodMap: Record<string, string> = {
    morning: 'صباحية',
    evening: 'مسائية',
  };

  const rows = closings.map((c) => [
    c.date,
    c.branchName,
    c.employeeName,
    periodMap[c.period] || c.period,
    c.cashSales.toFixed(2),
    c.cardSales.toFixed(2),
    c.totalSales.toFixed(2),
    c.expenses.toFixed(2),
    c.remainingInBox.toFixed(2),
    c.netPeriod.toFixed(2),
    statusMap[c.status] || c.status,
  ]);

  // UTF-8 BOM for Arabic character preservation in Excel
  const BOM = '\uFEFF';
  const csvContent =
    BOM +
    [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join(
      '\r\n'
    );

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `AL_EQFAL_Report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
