/**
 * Excel (.xlsx) Report Generation & Read-Back Verification Service
 * الإقفال | AL EQFAL
 *
 * - Uses exceljs to produce genuine RTL formatted .xlsx workbooks
 * - Preserves integer Halala precision alongside decimal currency formatting
 * - Computes deterministic SHA-256 payload hashes covering closing metadata & financials
 * - Strictly renders ONLY real Firestore data (no fabricated line items or entities)
 * - Performs real calendar date validation (beyond YYYY-MM-DD regex)
 * - Verifies downloaded .xlsx files from Google Drive before allowing 'archived' status
 */

import ExcelJS from 'exceljs';
import { Branch, ClosingArchiveRecord, Organization, ShiftClosing } from '../types';
import { calculateShiftTotals } from '../utils/accounting';

export const CLOSING_XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const CLOSING_WORKSHEET_NAME = 'تقرير الإقفال';

export interface GeneratedClosingExcel {
  bytes: Uint8Array;
  byteLength: number;
  fileName: string;
  fileSha256: string;
  payloadHash: string;
  yearMonth: string;
  generatedAt: string;
}

export interface VerifiedClosingExcelResult {
  verified: true;
  sheetName: string;
  rightToLeft: boolean;
  fileSha256: string;
  payloadHash: string;
  closingId: string;
  revision: number;
}

/**
 * Strictly validates that dateStr is YYYY-MM-DD AND a real calendar date (e.g. rejects 2026-02-30).
 * Returns canonical date and yearMonth (YYYY-MM).
 */
export function assertValidIsoCalendarDate(dateStr: string): {
  date: string;
  yearMonth: string;
} {
  const clean = typeof dateStr === 'string' ? dateStr.trim() : '';
  const match = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(clean);
  if (!match) {
    throw new Error(
      `صيغة تاريخ الإقفال (${dateStr || 'فارغ'}) غير صالحة. يجب أن يكون بصيغة YYYY-MM-DD.`
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    throw new Error(
      `تاريخ الإقفال (${clean}) غير صالح تقويمياً (اليوم غير موجود في هذا الشهر).`
    );
  }

  return {
    date: clean,
    yearMonth: clean.slice(0, 7),
  };
}

/**
 * Computes lowercase 64-char hex SHA-256 digest using Web Crypto (browser & Node 20+).
 */
export async function sha256Hex(input: Uint8Array | ArrayBuffer | string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('واجهة التشفير Crypto Subtle غير متاحة لحساب بصمة التحقق SHA-256.');
  }

  let view: Uint8Array;
  if (typeof input === 'string') {
    view = new TextEncoder().encode(input);
  } else if (input instanceof Uint8Array) {
    view = input;
  } else {
    view = new Uint8Array(input);
  }

  const normalizedBuffer = new Uint8Array(view.byteLength);
  normalizedBuffer.set(view);
  const digest = await subtle.digest('SHA-256', normalizedBuffer.buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Deterministic SHA-256 hash of real closing financial figures, metadata, review, and correction audit fields.
 * Changes immediately whenever financial figures or admin correction fields change.
 */
export async function computeClosingPayloadHash(
  closing: ShiftClosing,
  org: Organization,
  branch?: Branch | null
): Promise<string> {
  assertValidIsoCalendarDate(closing.date);
  const calc = calculateShiftTotals(closing.cashSales, closing.cardSales, closing.expenses);

  const canonical = {
    schemaVersion: 1,
    closingId: closing.id,
    orgId: org.id,
    orgName: org.name.trim(),
    currency: org.currency,
    branchId: closing.branchId,
    branchName: (branch?.name || closing.branchName).trim(),
    branchCode: (branch?.code || '').trim(),
    date: closing.date,
    period: closing.period,
    status: closing.status,
    employeeId: closing.employeeId,
    employeeName: closing.employeeName.trim(),
    cashHalalas: calc.cashHalalas,
    cardHalalas: calc.cardHalalas,
    totalSalesHalalas: calc.totalSalesHalalas,
    expensesHalalas: calc.expensesHalalas,
    remainingInBoxHalalas: calc.remainingInBoxHalalas,
    netPeriodHalalas: calc.netPeriodHalalas,
    notes: (closing.notes || '').trim(),
    reviewedBy: closing.reviewedBy || '',
    reviewedByName: (closing.reviewedByName || '').trim(),
    reviewedAt: closing.reviewedAt || '',
    correctedBy: closing.correctedBy || '',
    correctedByName: (closing.correctedByName || '').trim(),
    correctedAt: closing.correctedAt || '',
    correctionReason: (closing.correctionReason || '').trim(),
    previousValues: closing.previousValues
      ? {
          cashHalalas: calculateShiftTotals(
            closing.previousValues.cashSales,
            closing.previousValues.cardSales,
            closing.previousValues.expenses
          ).cashHalalas,
          cardHalalas: calculateShiftTotals(
            closing.previousValues.cashSales,
            closing.previousValues.cardSales,
            closing.previousValues.expenses
          ).cardHalalas,
          expensesHalalas: calculateShiftTotals(
            closing.previousValues.cashSales,
            closing.previousValues.cardSales,
            closing.previousValues.expenses
          ).expensesHalalas,
          totalSalesHalalas: calculateShiftTotals(
            closing.previousValues.cashSales,
            closing.previousValues.cardSales,
            closing.previousValues.expenses
          ).totalSalesHalalas,
          remainingInBoxHalalas: calculateShiftTotals(
            closing.previousValues.cashSales,
            closing.previousValues.cardSales,
            closing.previousValues.expenses
          ).remainingInBoxHalalas,
          netPeriodHalalas: calculateShiftTotals(
            closing.previousValues.cashSales,
            closing.previousValues.cardSales,
            closing.previousValues.expenses
          ).netPeriodHalalas,
        }
      : null,
  };

  return sha256Hex(JSON.stringify(canonical));
}

/**
 * Produces a sanitized .xlsx filename compliant with firestore.rules:
 * ^[^/\\]+\.[xX][lL][sS][xX]$ and length 5..256.
 */
export function buildClosingExcelFileName(
  closing: ShiftClosing,
  branch: Branch | null | undefined,
  revision: number
): string {
  const safeRev = Number.isInteger(revision) && revision >= 1 ? revision : 1;
  const rawBranchPart = (branch?.code || branch?.name || closing.branchId || 'BR')
    .replace(/[/\\:*?"<>|\r\n]+/g, '_')
    .replace(/\.{2,}/g, '_')
    .trim();
  const safeBranchPart = rawBranchPart.slice(0, 40) || 'BR';
  const safeDate = closing.date.replace(/[^0-9-]/g, '');
  const safePeriod = closing.period === 'morning' ? 'morning' : 'evening';
  const safeIdSuffix = closing.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(-18);

  const prefix = `AL_EQFAL_${safeBranchPart}_${safeDate}_${safePeriod}_v${safeRev}_${safeIdSuffix}`;
  const trimmedPrefix = prefix.replace(/\.{2,}/g, '_').replace(/[/\\]/g, '_').slice(0, 240);
  const fileName = `${trimmedPrefix}.xlsx`;

  if (fileName.length < 5 || fileName.length > 256 || /[/\\]/.test(fileName)) {
    return `AL_EQFAL_closing_v${safeRev}.xlsx`;
  }
  return fileName;
}

const STATUS_AR: Record<string, string> = {
  draft: 'مسودة',
  pending_review: 'مرسل للمراجعة',
  approved: 'معتمد رسمياً',
  rejected: 'معاد للتعديل',
};

const PERIOD_AR: Record<string, string> = {
  morning: 'الفترة الصباحية',
  evening: 'الفترة المسائية',
};

const CELL_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
};

function styleSectionHeaderRow(row: ExcelJS.Row, colSpan: number = 4) {
  for (let c = 1; c <= colSpan; c++) {
    const cell = row.getCell(c);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F2038' },
    };
    cell.font = {
      name: 'Arial',
      size: 11,
      bold: true,
      color: { argb: 'FFF59E0B' },
    };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    cell.border = CELL_BORDER;
  }
  row.height = 24;
}

/**
 * Generates a formatted RTL Excel (.xlsx) workbook for a single shift closing
 * using ONLY real fields from Organization, Branch, and ShiftClosing.
 */
export async function generateClosingExcelWorkbook(params: {
  closing: ShiftClosing;
  org: Organization;
  branch?: Branch | null;
  revision: number;
  generatedAt?: string;
}): Promise<GeneratedClosingExcel> {
  const { closing, org, branch, revision } = params;
  if (!Number.isInteger(revision) || revision < 1) {
    throw new Error('رقم إصدار الأرشفة (revision) يجب أن يكون عدداً صحيحاً أكبر من أو يساوي 1.');
  }

  const { yearMonth } = assertValidIsoCalendarDate(closing.date);
  const generatedAt = params.generatedAt || new Date().toISOString();
  const calc = calculateShiftTotals(closing.cashSales, closing.cardSales, closing.expenses);
  const payloadHash = await computeClosingPayloadHash(closing, org, branch);
  const fileName = buildClosingExcelFileName(closing, branch, revision);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AL EQFAL';
  workbook.lastModifiedBy = closing.reviewedByName || org.ownerName || 'AL EQFAL';
  const refTimestamp = new Date(closing.updatedAt || closing.createdAt || generatedAt);
  workbook.created = isNaN(refTimestamp.getTime()) ? new Date() : refTimestamp;
  workbook.modified = isNaN(refTimestamp.getTime()) ? new Date() : refTimestamp;

  const ws = workbook.addWorksheet(CLOSING_WORKSHEET_NAME, {
    views: [{ rightToLeft: true }],
    pageSetup: {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
    },
  });

  ws.columns = [
    { key: 'colA', width: 28 },
    { key: 'colB', width: 30 },
    { key: 'colC', width: 24 },
    { key: 'colD', width: 32 },
  ];

  // Title Banner (Row 1)
  ws.mergeCells('A1:D1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'تقرير إقفال الوردية الموثق — نظام الإقفال | AL EQFAL';
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0B192C' },
  };
  titleCell.font = {
    name: 'Arial',
    size: 14,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 32;

  // Organization & Branch Subtitle (Row 2)
  ws.mergeCells('A2:D2');
  const subtitleCell = ws.getCell('A2');
  const branchLabel = branch?.name || closing.branchName;
  const branchCode = branch?.code ? ` (${branch.code})` : '';
  subtitleCell.value = `المؤسسة: ${org.name}  |  الفرع: ${branchLabel}${branchCode}  |  الإصدار: v${revision}`;
  subtitleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFEF3C7' },
  };
  subtitleCell.font = {
    name: 'Arial',
    size: 11,
    bold: true,
    color: { argb: 'FF92400E' },
  };
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 24;

  // Spacer (Row 3)
  ws.addRow([]);

  // Section 1: Metadata (Row 4)
  const sec1Row = ws.addRow(['أولاً: بيانات الإقفال والتوثيق', '', '', '']);
  ws.mergeCells(`A${sec1Row.number}:D${sec1Row.number}`);
  styleSectionHeaderRow(sec1Row, 4);

  const metaPairs: Array<[string, string | number, string, string | number]> = [
    ['معرّف الإقفال', closing.id, 'معرّف المؤسسة', org.id],
    ['اسم المؤسسة', org.name, 'الفرع', `${branchLabel}${branchCode}`],
    ['معرّف الفرع', closing.branchId, 'العملة المعتمدة', org.currency],
    ['تاريخ الوردية', closing.date, 'الشهر الأرشيفي', yearMonth],
    ['فترة الوردية', PERIOD_AR[closing.period] || closing.period, 'حالة الإقفال', STATUS_AR[closing.status] || closing.status],
    ['مسجل الإقفال', closing.employeeName, 'معرّف المسجل', closing.employeeId],
    ['المراجع / المعتمد', closing.reviewedByName || '-', 'تاريخ الاعتماد', closing.reviewedAt || '-'],
    ['تاريخ الإنشاء', closing.createdAt, 'آخر تحديث للسجل', closing.updatedAt],
  ];

  for (const [k1, v1, k2, v2] of metaPairs) {
    const r = ws.addRow([k1, v1, k2, v2]);
    r.height = 20;
    [1, 3].forEach((idx) => {
      const c = r.getCell(idx);
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
      c.alignment = { horizontal: 'right', vertical: 'middle' };
      c.border = CELL_BORDER;
    });
    [2, 4].forEach((idx) => {
      const c = r.getCell(idx);
      c.font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
      c.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
      c.border = CELL_BORDER;
    });
  }

  ws.addRow([]);

  // Section 2: Financial Table
  const sec2Row = ws.addRow(['ثانياً: الملخص المالي والحسابي الدقيق', '', '', '']);
  ws.mergeCells(`A${sec2Row.number}:D${sec2Row.number}`);
  styleSectionHeaderRow(sec2Row, 4);

  const finHeader = ws.addRow([
    'البند المحاسبي',
    `القيمة (${org.currency})`,
    'القيمة بالهللات (عدد صحيح)',
    'المعادلة المحاسبية / المرجع',
  ]);
  finHeader.height = 22;
  finHeader.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = CELL_BORDER;
  });

  const financialRows: Array<{
    label: string;
    amount: number;
    halalas: number;
    note: string;
    highlight?: boolean;
  }> = [
    {
      label: 'مبيعات النقد (كاش)',
      amount: calc.cashSales,
      halalas: calc.cashHalalas,
      note: 'إدخال مسجل الوردية المعتمد',
    },
    {
      label: 'مبيعات الشبكة (POS)',
      amount: calc.cardSales,
      halalas: calc.cardHalalas,
      note: 'إدخال أجهزة نقاط البيع المعتمد',
    },
    {
      label: 'إجمالي المبيعات',
      amount: calc.totalSales,
      halalas: calc.totalSalesHalalas,
      note: 'النقد + الشبكة',
      highlight: true,
    },
    {
      label: 'المشتريات والمصروفات',
      amount: calc.expenses,
      halalas: calc.expensesHalalas,
      note: 'المصروفات المدفوعة من الصندوق',
    },
    {
      label: 'الباقي في الصندوق',
      amount: calc.remainingInBox,
      halalas: calc.remainingInBoxHalalas,
      note: 'النقد - المشتريات',
      highlight: true,
    },
    {
      label: 'صافي الفترة',
      amount: calc.netPeriod,
      halalas: calc.netPeriodHalalas,
      note: 'إجمالي المبيعات - المشتريات',
      highlight: true,
    },
  ];

  for (const item of financialRows) {
    const r = ws.addRow([item.label, item.amount, item.halalas, item.note]);
    r.height = 22;
    const bgColor = item.highlight ? 'FFFEF9C3' : 'FFFFFFFF';
    r.getCell(1).font = {
      name: 'Arial',
      size: 10,
      bold: Boolean(item.highlight),
      color: { argb: 'FF0F172A' },
    };
    r.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    r.getCell(1).border = CELL_BORDER;

    r.getCell(2).numFmt = '#,##0.00';
    r.getCell(2).font = {
      name: 'Arial',
      size: 11,
      bold: true,
      color: { argb: 'FF0B192C' },
    };
    r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    r.getCell(2).border = CELL_BORDER;

    r.getCell(3).numFmt = '#,##0';
    r.getCell(3).font = {
      name: 'Arial',
      size: 10,
      bold: Boolean(item.highlight),
      color: { argb: 'FF334155' },
    };
    r.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    r.getCell(3).border = CELL_BORDER;

    r.getCell(4).font = { name: 'Arial', size: 9, color: { argb: 'FF475569' } };
    r.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    r.getCell(4).border = CELL_BORDER;
  }

  ws.addRow([]);

  // Section 3: Notes, Review & Admin Correction History (Only real existing fields)
  const sec3Row = ws.addRow(['ثالثاً: الملاحظات وسجل المراجعة والتصحيح الإداري', '', '', '']);
  ws.mergeCells(`A${sec3Row.number}:D${sec3Row.number}`);
  styleSectionHeaderRow(sec3Row, 4);

  const notesRows: Array<[string, string]> = [
    ['ملاحظات مسجل الإقفال', closing.notes?.trim() ? closing.notes.trim() : 'لا توجد ملاحظات'],
  ];

  if (closing.rejectionReason?.trim()) {
    notesRows.push(['سبب إرجاع سابق', closing.rejectionReason.trim()]);
  }

  if (closing.correctedAt) {
    notesRows.push(['تاريخ التصحيح الإداري', closing.correctedAt]);
    notesRows.push(['منفذ التصحيح الإداري', closing.correctedByName || closing.correctedBy || '-']);
    notesRows.push(['سبب التصحيح الإداري', closing.correctionReason || '-']);

    if (closing.previousValues) {
      const prevCalc = calculateShiftTotals(
        closing.previousValues.cashSales,
        closing.previousValues.cardSales,
        closing.previousValues.expenses
      );
      notesRows.push([
        'القيم المالية قبل التصحيح',
        `النقد: ${prevCalc.cashSales.toFixed(2)} | الشبكة: ${prevCalc.cardSales.toFixed(
          2
        )} | الإجمالي: ${prevCalc.totalSales.toFixed(
          2
        )} | المشتريات: ${prevCalc.expenses.toFixed(
          2
        )} | الصندوق: ${prevCalc.remainingInBox.toFixed(
          2
        )} | الصافي: ${prevCalc.netPeriod.toFixed(2)} (${org.currency})`,
      ]);
    }
  } else {
    notesRows.push(['حالة التصحيح الإداري', 'لا يوجد تصحيح إداري على هذا الإقفال']);
  }

  for (const [label, value] of notesRows) {
    const r = ws.addRow([label, value, '', '']);
    ws.mergeCells(`B${r.number}:D${r.number}`);
    r.height = 22;
    r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    r.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
    r.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(1).border = CELL_BORDER;

    for (let c = 2; c <= 4; c++) {
      const cell = r.getCell(c);
      cell.font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
      cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
      cell.border = CELL_BORDER;
    }
  }

  ws.addRow([]);

  // Section 4: Integrity & Verification Metadata
  const sec4Row = ws.addRow(['رابعاً: بيانات التحقق والسلامة الرقمية', '', '', '']);
  ws.mergeCells(`A${sec4Row.number}:D${sec4Row.number}`);
  styleSectionHeaderRow(sec4Row, 4);

  const verificationRows: Array<[string, string | number]> = [
    ['بصمة البيانات SHA-256', payloadHash],
    ['رقم إصدار الأرشفة', revision],
    ['اسم ملف الأرشفة المعتمد', fileName],
    ['تاريخ التوليد', generatedAt],
  ];

  for (const [label, value] of verificationRows) {
    const r = ws.addRow([label, value, '', '']);
    ws.mergeCells(`B${r.number}:D${r.number}`);
    r.height = 20;
    r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    r.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
    r.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(1).border = CELL_BORDER;

    for (let c = 2; c <= 4; c++) {
      const cell = r.getCell(c);
      cell.font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.border = CELL_BORDER;
    }
  }

  const rawBuffer = await workbook.xlsx.writeBuffer();
  const bytes = rawBuffer instanceof Uint8Array ? rawBuffer : new Uint8Array(rawBuffer);
  const fileSha256 = await sha256Hex(bytes);

  return {
    bytes,
    byteLength: bytes.byteLength,
    fileName,
    fileSha256,
    payloadHash,
    yearMonth,
    generatedAt,
  };
}

/**
 * Normalizes ExcelJS cell values (handles primitives & formula/richText wrappers).
 */
function normalizeCellValue(val: ExcelJS.CellValue): string | number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number' || typeof val === 'string') return val;
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object') {
    if ('result' in val && val.result !== undefined && val.result !== null) {
      return typeof val.result === 'number' || typeof val.result === 'string'
        ? val.result
        : String(val.result);
    }
    if ('richText' in val && Array.isArray(val.richText)) {
      return val.richText.map((part) => part.text).join('');
    }
    if ('text' in val && typeof val.text === 'string') {
      return val.text;
    }
  }
  return String(val);
}

/**
 * Reads back a downloaded .xlsx file using exceljs and verifies:
 * 1. Exact binary SHA-256 matches the uploaded bytes
 * 2. Worksheet 'تقرير الإقفال' exists and is configured RTL
 * 3. closingId, date, revision, and payloadHash inside the sheet match expected values
 * 4. All 6 financial figures (in exact integer Halalas) inside the sheet match the closing record
 */
export async function verifyDownloadedClosingExcel(params: {
  fileBytes: ArrayBuffer | Uint8Array;
  expectedFileSha256: string;
  expectedClosing: ShiftClosing;
  expectedOrg: Organization;
  expectedPayloadHash: string;
  expectedRevision: number;
}): Promise<VerifiedClosingExcelResult> {
  const {
    fileBytes,
    expectedFileSha256,
    expectedClosing,
    expectedOrg,
    expectedPayloadHash,
    expectedRevision,
  } = params;

  const actualBytes = fileBytes instanceof Uint8Array ? fileBytes : new Uint8Array(fileBytes);
  if (actualBytes.byteLength === 0) {
    throw new Error('ملف Excel المقروء من Google Drive فارغ (0 بايت).');
  }

  const actualFileSha256 = await sha256Hex(actualBytes);
  if (actualFileSha256 !== expectedFileSha256) {
    throw new Error(
      'فشل التحقق الثنائي (SHA-256): محتوى ملف Excel المقروء من Google Drive لا يطابق الملف المرفوع.'
    );
  }

  const workbook = new ExcelJS.Workbook();
  try {
    const loadInput = new Uint8Array(actualBytes.byteLength);
    loadInput.set(actualBytes);
    await workbook.xlsx.load(loadInput.buffer);
  } catch (parseErr: any) {
    throw new Error(
      `تعذر قراءة وتحليل ملف Excel المقروء من Google Drive عبر exceljs: ${parseErr?.message || parseErr}`
    );
  }

  const ws = workbook.getWorksheet(CLOSING_WORKSHEET_NAME);
  if (!ws) {
    throw new Error(`ورقة العمل الأساسية (${CLOSING_WORKSHEET_NAME}) مفقودة في ملف Excel المقروء.`);
  }

  const isRtl = Boolean(ws.views?.[0]?.rightToLeft);
  if (!isRtl) {
    throw new Error('اتجاه ورقة العمل في ملف Excel المقروء ليس من اليمين إلى اليسار (RTL).');
  }

  const labelToRow = new Map<string, Array<string | number | null>>();
  ws.eachRow((row) => {
    const c1 = normalizeCellValue(row.getCell(1).value);
    const c2 = normalizeCellValue(row.getCell(2).value);
    const c3 = normalizeCellValue(row.getCell(3).value);
    const c4 = normalizeCellValue(row.getCell(4).value);

    if (typeof c1 === 'string' && c1.trim()) {
      labelToRow.set(c1.trim(), [c1, c2, c3, c4]);
    }
    if (typeof c3 === 'string' && c3.trim()) {
      labelToRow.set(c3.trim(), [c3, c4, null, null]);
    }
  });

  const assertFieldEquals = (label: string, expected: string | number) => {
    const rowVals = labelToRow.get(label);
    const actual = rowVals?.[1];
    if (actual !== expected) {
      throw new Error(
        `تعارض حقل "${label}" داخل ملف Excel المقروء: المتوقع (${expected}) والفعلي (${actual ?? 'مفقود'}).`
      );
    }
  };

  assertFieldEquals('معرّف الإقفال', expectedClosing.id);
  assertFieldEquals('معرّف المؤسسة', expectedOrg.id);
  assertFieldEquals('معرّف الفرع', expectedClosing.branchId);
  assertFieldEquals('تاريخ الوردية', expectedClosing.date);
  assertFieldEquals('بصمة البيانات SHA-256', expectedPayloadHash);
  assertFieldEquals('رقم إصدار الأرشفة', expectedRevision);

  const expectedCalc = calculateShiftTotals(
    expectedClosing.cashSales,
    expectedClosing.cardSales,
    expectedClosing.expenses
  );

  const financialChecks: Array<[string, number]> = [
    ['مبيعات النقد (كاش)', expectedCalc.cashHalalas],
    ['مبيعات الشبكة (POS)', expectedCalc.cardHalalas],
    ['إجمالي المبيعات', expectedCalc.totalSalesHalalas],
    ['المشتريات والمصروفات', expectedCalc.expensesHalalas],
    ['الباقي في الصندوق', expectedCalc.remainingInBoxHalalas],
    ['صافي الفترة', expectedCalc.netPeriodHalalas],
  ];

  for (const [label, expectedHalalas] of financialChecks) {
    const rowVals = labelToRow.get(label);
    const actualHalalas = rowVals?.[2];
    if (typeof actualHalalas !== 'number' || Math.round(actualHalalas) !== expectedHalalas) {
      throw new Error(
        `تعارض القيمة المحاسبية لبند "${label}" داخل ملف Excel المقروء (بالهللات): المتوقع (${expectedHalalas}) والفعلي (${actualHalalas ?? 'مفقود'}).`
      );
    }
  }

  return {
    verified: true,
    sheetName: ws.name,
    rightToLeft: isRtl,
    fileSha256: actualFileSha256,
    payloadHash: expectedPayloadHash,
    closingId: expectedClosing.id,
    revision: expectedRevision,
  };
}

/**
 * Verifies an original archived .xlsx file downloaded directly from Google Drive (files.get?alt=media)
 * against its Firestore closingArchives proof metadata (supports both 'archived' and 'stale' historical snapshots).
 */
export async function verifyOriginalArchivedExcelFromDrive(params: {
  fileBytes: ArrayBuffer | Uint8Array;
  archiveRecord: ClosingArchiveRecord;
}): Promise<VerifiedClosingExcelResult> {
  const { fileBytes, archiveRecord } = params;
  const actualBytes = fileBytes instanceof Uint8Array ? fileBytes : new Uint8Array(fileBytes);
  if (actualBytes.byteLength === 0) {
    throw new Error('ملف Excel المسترجع من Google Drive فارغ (0 بايت).');
  }

  const actualFileSha256 = await sha256Hex(actualBytes);

  const workbook = new ExcelJS.Workbook();
  try {
    const loadInput = new Uint8Array(actualBytes.byteLength);
    loadInput.set(actualBytes);
    await workbook.xlsx.load(loadInput.buffer);
  } catch (parseErr: any) {
    throw new Error(
      `تعذر قراءة ملف Excel المسترجع من Google Drive عبر exceljs: ${parseErr?.message || parseErr}`
    );
  }

  const ws = workbook.getWorksheet(CLOSING_WORKSHEET_NAME);
  if (!ws) {
    throw new Error(`ورقة العمل الأساسية (${CLOSING_WORKSHEET_NAME}) مفقودة في الملف المسترجع من Drive.`);
  }

  const isRtl = Boolean(ws.views?.[0]?.rightToLeft);
  if (!isRtl) {
    throw new Error('اتجاه ورقة العمل في الملف المسترجع من Drive ليس من اليمين إلى اليسار (RTL).');
  }

  const labelToRow = new Map<string, Array<string | number | null>>();
  ws.eachRow((row) => {
    const c1 = normalizeCellValue(row.getCell(1).value);
    const c2 = normalizeCellValue(row.getCell(2).value);
    const c3 = normalizeCellValue(row.getCell(3).value);
    const c4 = normalizeCellValue(row.getCell(4).value);

    if (typeof c1 === 'string' && c1.trim()) {
      labelToRow.set(c1.trim(), [c1, c2, c3, c4]);
    }
    if (typeof c3 === 'string' && c3.trim()) {
      labelToRow.set(c3.trim(), [c3, c4, null, null]);
    }
  });

  const assertFieldEquals = (label: string, expected: string | number) => {
    const rowVals = labelToRow.get(label);
    const actual = rowVals?.[1];
    if (actual !== expected) {
      throw new Error(
        `تعارض حقل "${label}" في ملف Drive المسترجع: المتوقع (${expected}) والفعلي (${actual ?? 'مفقود'}).`
      );
    }
  };

  assertFieldEquals('معرّف الإقفال', archiveRecord.closingId);
  assertFieldEquals('معرّف المؤسسة', archiveRecord.orgId);
  assertFieldEquals('معرّف الفرع', archiveRecord.branchId);

  if (archiveRecord.drivePayloadHash) {
    assertFieldEquals('بصمة البيانات SHA-256', archiveRecord.drivePayloadHash);
  }
  if (typeof archiveRecord.driveRevision === 'number') {
    assertFieldEquals('رقم إصدار الأرشفة', archiveRecord.driveRevision);
  }

  return {
    verified: true,
    sheetName: ws.name,
    rightToLeft: isRtl,
    fileSha256: actualFileSha256,
    payloadHash: archiveRecord.drivePayloadHash || '',
    closingId: archiveRecord.closingId,
    revision: archiveRecord.driveRevision || 1,
  };
}

/**
 * Generates an RTL multi-row Excel (.xlsx) report for filtered closings in FinancialReports.
 * Preserves existing CSV export untouched.
 */
export async function generateClosingsSummaryExcel(params: {
  closings: ShiftClosing[];
  org?: Organization | null;
  statusScopeLabel?: string;
}): Promise<{ bytes: Uint8Array; fileName: string }> {
  const { closings, org, statusScopeLabel = 'التقرير المالي' } = params;
  const currency = org?.currency || 'SAR';

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AL EQFAL';
  workbook.created = new Date();
  workbook.modified = new Date();

  const ws = workbook.addWorksheet('كشف الإقفالات', {
    views: [{ rightToLeft: true }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  ws.columns = [
    { key: 'date', width: 14 },
    { key: 'branch', width: 22 },
    { key: 'employee', width: 22 },
    { key: 'period', width: 14 },
    { key: 'cash', width: 16 },
    { key: 'card', width: 16 },
    { key: 'total', width: 18 },
    { key: 'expenses', width: 16 },
    { key: 'box', width: 18 },
    { key: 'net', width: 18 },
    { key: 'status', width: 16 },
  ];

  ws.mergeCells('A1:K1');
  const titleCell = ws.getCell('A1');
  titleCell.value = `التقرير المالي التفصيلي — ${org?.name || 'AL EQFAL'} (${statusScopeLabel})`;
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B192C' } };
  titleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 30;

  const headerRow = ws.addRow([
    'التاريخ',
    'الفرع',
    'الموظف',
    'الفترة',
    `النقد (${currency})`,
    `الشبكة (${currency})`,
    `إجمالي المبيعات (${currency})`,
    `المشتريات (${currency})`,
    `الباقي بالصندوق (${currency})`,
    `صافي الفترة (${currency})`,
    'الحالة',
  ]);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2038' } };
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFF59E0B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = CELL_BORDER;
  });

  let sumCashHalalas = 0;
  let sumCardHalalas = 0;
  let sumTotalHalalas = 0;
  let sumExpensesHalalas = 0;
  let sumBoxHalalas = 0;
  let sumNetHalalas = 0;

  for (const c of closings) {
    const calc = calculateShiftTotals(c.cashSales, c.cardSales, c.expenses);
    sumCashHalalas += calc.cashHalalas;
    sumCardHalalas += calc.cardHalalas;
    sumTotalHalalas += calc.totalSalesHalalas;
    sumExpensesHalalas += calc.expensesHalalas;
    sumBoxHalalas += calc.remainingInBoxHalalas;
    sumNetHalalas += calc.netPeriodHalalas;

    const r = ws.addRow([
      c.date,
      c.branchName,
      c.employeeName,
      c.period === 'morning' ? 'صباحية' : 'مسائية',
      calc.cashSales,
      calc.cardSales,
      calc.totalSales,
      calc.expenses,
      calc.remainingInBox,
      calc.netPeriod,
      STATUS_AR[c.status] || c.status,
    ]);
    r.height = 20;
    r.eachCell((cell, colNumber) => {
      cell.border = CELL_BORDER;
      cell.font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
      if (colNumber >= 5 && colNumber <= 10) {
        cell.numFmt = '#,##0.00';
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    });
  }

  const totalRow = ws.addRow([
    `المجموع الكلي (${closings.length})`,
    '',
    '',
    '',
    sumCashHalalas / 100,
    sumCardHalalas / 100,
    sumTotalHalalas / 100,
    sumExpensesHalalas / 100,
    sumBoxHalalas / 100,
    sumNetHalalas / 100,
    currency,
  ]);
  ws.mergeCells(`A${totalRow.number}:D${totalRow.number}`);
  totalRow.height = 24;
  totalRow.eachCell((cell, colNumber) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0B192C' } };
    cell.border = CELL_BORDER;
    if (colNumber >= 5 && colNumber <= 10) {
      cell.numFmt = '#,##0.00';
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  });

  const rawBuffer = await workbook.xlsx.writeBuffer();
  const bytes = rawBuffer instanceof Uint8Array ? rawBuffer : new Uint8Array(rawBuffer);
  const dateTag = new Date().toISOString().split('T')[0];
  return {
    bytes,
    fileName: `AL_EQFAL_Report_${dateTag}.xlsx`,
  };
}

/**
 * Triggers a clean browser download for generated .xlsx bytes without any popup blockers.
 */
export function downloadXlsxBytes(bytes: Uint8Array, fileName: string): void {
  const safeCopy = new Uint8Array(bytes.byteLength);
  safeCopy.set(bytes);
  const blob = new Blob([safeCopy.buffer], { type: CLOSING_XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
