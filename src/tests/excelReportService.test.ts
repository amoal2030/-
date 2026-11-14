/**
 * Automated Verification Suite for excelReportService.ts (exceljs generation & read-back verification)
 * Runs cleanly via Node / tsx without requiring Java or browser mocks.
 */
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { Branch, ClosingArchiveRecord, Organization, ShiftClosing } from '../types';
import { calculateShiftTotals } from '../utils/accounting';
import {
  assertValidIsoCalendarDate,
  buildClosingExcelFileName,
  computeClosingPayloadHash,
  generateClosingsSummaryExcel,
  generateClosingExcelWorkbook,
  verifyDownloadedClosingExcel,
  verifyOriginalArchivedExcelFromDrive,
} from '../services/excelReportService';

const sampleOrg: Organization = {
  id: 'org_test_001',
  name: 'شركة الإقفال التجريبية',
  activityType: 'retail',
  currency: 'SAR',
  ownerId: 'uid_mgr_001',
  ownerEmail: 'owner@example.com',
  ownerName: 'أحمد المدير',
  driveConnected: true,
  driveWriteVerified: true,
  createdAt: '2026-01-01T08:00:00.000Z',
  updatedAt: '2026-01-01T08:00:00.000Z',
};

const sampleBranch: Branch = {
  id: 'br_riyadh_01',
  orgId: sampleOrg.id,
  name: 'فرع الرياض الرئيسي',
  code: 'RYD/01..A',
  isActive: true,
  createdAt: '2026-01-01T08:00:00.000Z',
};

const baseClosing: ShiftClosing = {
  id: 'cls_orgtest001_brriyadh01_2026-11-14_morning',
  orgId: sampleOrg.id,
  branchId: sampleBranch.id,
  branchName: sampleBranch.name,
  employeeId: 'uid_emp_001',
  employeeName: 'سعد الكاشير',
  date: '2026-11-14',
  period: 'morning',
  cashSales: 1250.75,
  cardSales: 3420.25,
  totalSales: 4671.0,
  expenses: 150.5,
  remainingInBox: 1100.25,
  netPeriod: 4520.5,
  notes: 'مطابقة كاملة للصندوق وجهاز مدى',
  status: 'approved',
  attachmentIds: [],
  reviewedBy: sampleOrg.ownerId,
  reviewedByName: sampleOrg.ownerName,
  reviewedAt: '2026-11-14T15:00:00.000Z',
  createdAt: '2026-11-14T14:30:00.000Z',
  updatedAt: '2026-11-14T15:00:00.000Z',
};

async function runTests() {
  console.log('1. Testing real calendar date validation...');
  assert.deepEqual(assertValidIsoCalendarDate('2024-02-29'), {
    date: '2024-02-29',
    yearMonth: '2024-02',
  });
  assert.throws(() => assertValidIsoCalendarDate('2026-02-30'), /غير صالح تقويمياً/);
  assert.throws(() => assertValidIsoCalendarDate('2026-04-31'), /غير صالح تقويمياً/);
  assert.throws(() => assertValidIsoCalendarDate('2026/11/14'), /صيغة تاريخ الإقفال/);

  console.log('2. Testing Excel filename sanitization against Firestore rules regex...');
  const safeName = buildClosingExcelFileName(baseClosing, sampleBranch, 1);
  assert.match(safeName, /^[^/\\]+\.[xX][lL][sS][xX]$/);
  assert.ok(safeName.length >= 5 && safeName.length <= 256);
  assert.ok(!safeName.includes('..'));

  console.log('3. Generating v1 RTL Excel workbook & verifying binary/parsed content...');
  const v1 = await generateClosingExcelWorkbook({
    closing: baseClosing,
    org: sampleOrg,
    branch: sampleBranch,
    revision: 1,
  });

  // Check real ZIP/XLSX magic signature ('PK')
  assert.equal(v1.bytes[0], 0x50);
  assert.equal(v1.bytes[1], 0x4b);
  assert.equal(v1.yearMonth, '2026-11');
  assert.match(v1.payloadHash, /^[a-f0-9]{64}$/);
  assert.match(v1.fileSha256, /^[a-f0-9]{64}$/);

  const verifiedV1 = await verifyDownloadedClosingExcel({
    fileBytes: v1.bytes,
    expectedFileSha256: v1.fileSha256,
    expectedClosing: baseClosing,
    expectedOrg: sampleOrg,
    expectedPayloadHash: v1.payloadHash,
    expectedRevision: 1,
  });
  assert.equal(verifiedV1.verified, true);
  assert.equal(verifiedV1.rightToLeft, true);
  assert.equal(verifiedV1.revision, 1);

  console.log('4. Verifying rejection on tampered bytes or altered financial figures...');
  const tamperedBytes = new Uint8Array(v1.bytes);
  tamperedBytes[tamperedBytes.length - 10] ^= 0xff;
  await assert.rejects(
    () =>
      verifyDownloadedClosingExcel({
        fileBytes: tamperedBytes,
        expectedFileSha256: v1.fileSha256,
        expectedClosing: baseClosing,
        expectedOrg: sampleOrg,
        expectedPayloadHash: v1.payloadHash,
        expectedRevision: 1,
      }),
    /SHA-256/
  );

  await assert.rejects(
    () =>
      verifyDownloadedClosingExcel({
        fileBytes: v1.bytes,
        expectedFileSha256: v1.fileSha256,
        expectedClosing: { ...baseClosing, cashSales: 9999 },
        expectedOrg: sampleOrg,
        expectedPayloadHash: v1.payloadHash,
        expectedRevision: 1,
      }),
    /تعارض القيمة المحاسبية/
  );

  console.log('5. Verifying admin correction produces distinct hash and passes v2 verification...');
  const correctedClosing: ShiftClosing = {
    ...baseClosing,
    cashSales: 1350.75,
    totalSales: 4771.0,
    remainingInBox: 1200.25,
    netPeriod: 4620.5,
    previousValues: {
      cashSales: baseClosing.cashSales,
      cardSales: baseClosing.cardSales,
      expenses: baseClosing.expenses,
      totalSales: baseClosing.totalSales,
      remainingInBox: baseClosing.remainingInBox,
      netPeriod: baseClosing.netPeriod,
    },
    correctionReason: 'تصحيح قيد نقدي إضافي مثبت بسند القبض',
    correctedBy: sampleOrg.ownerId,
    correctedByName: sampleOrg.ownerName,
    correctedAt: '2026-11-14T16:15:00.000Z',
    updatedAt: '2026-11-14T16:15:00.000Z',
  };

  const hashV2 = await computeClosingPayloadHash(correctedClosing, sampleOrg, sampleBranch);
  assert.notEqual(hashV2, v1.payloadHash);

  const v2 = await generateClosingExcelWorkbook({
    closing: correctedClosing,
    org: sampleOrg,
    branch: sampleBranch,
    revision: 2,
  });

  const verifiedV2 = await verifyDownloadedClosingExcel({
    fileBytes: v2.bytes,
    expectedFileSha256: v2.fileSha256,
    expectedClosing: correctedClosing,
    expectedOrg: sampleOrg,
    expectedPayloadHash: v2.payloadHash,
    expectedRevision: 2,
  });
  assert.equal(verifiedV2.verified, true);
  assert.equal(verifiedV2.revision, 2);

  console.log('6. Verifying multi-closing Financial Summary Excel export...');
  const summary = await generateClosingsSummaryExcel({
    closings: [baseClosing, correctedClosing],
    org: sampleOrg,
    statusScopeLabel: 'الإقفالات المعتمدة',
  });
  const summaryWb = new ExcelJS.Workbook();
  const summaryBuf = new Uint8Array(summary.bytes.byteLength);
  summaryBuf.set(summary.bytes);
  await summaryWb.xlsx.load(summaryBuf.buffer);
  const summarySheet = summaryWb.getWorksheet('كشف الإقفالات');
  assert.ok(summarySheet);
  assert.equal(summarySheet.views?.[0]?.rightToLeft, true);

  console.log('7. Verifying Halala precision (0.1 + 0.2 = 0.3) & original archived v1 download verification even when stale...');
  const halalaCalc = calculateShiftTotals(0.1, 0.2, 0.05);
  assert.equal(halalaCalc.totalSales, 0.3);
  assert.equal(halalaCalc.remainingInBox, 0.05);
  assert.equal(halalaCalc.netPeriod, 0.25);
  assert.equal(halalaCalc.totalSalesHalalas, 30);

  const halalaClosing: ShiftClosing = {
    ...baseClosing,
    id: 'cls_halala_precision_test',
    cashSales: halalaCalc.cashSales,
    cardSales: halalaCalc.cardSales,
    expenses: halalaCalc.expenses,
    totalSales: halalaCalc.totalSales,
    remainingInBox: halalaCalc.remainingInBox,
    netPeriod: halalaCalc.netPeriod,
  };
  const halalaWorkbook = await generateClosingExcelWorkbook({
    closing: halalaClosing,
    org: sampleOrg,
    branch: sampleBranch,
    revision: 1,
  });
  const verifiedHalala = await verifyDownloadedClosingExcel({
    fileBytes: halalaWorkbook.bytes,
    expectedFileSha256: halalaWorkbook.fileSha256,
    expectedClosing: halalaClosing,
    expectedOrg: sampleOrg,
    expectedPayloadHash: halalaWorkbook.payloadHash,
    expectedRevision: 1,
  });
  assert.equal(verifiedHalala.verified, true);

  // Simulate downloading original archived v1 bytes from Drive while closingArchives is 'stale' after admin correction
  const staleV1Archive: ClosingArchiveRecord = {
    closingId: baseClosing.id,
    orgId: sampleOrg.id,
    branchId: sampleBranch.id,
    yearMonth: '2026-11',
    archiveStatus: 'stale',
    driveExcelFileId: 'drive_file_v1_id',
    driveExcelFileName: v1.fileName,
    driveMonthFolderId: 'drive_month_id',
    drivePayloadHash: v1.payloadHash,
    driveRevision: 1,
    sourceCorrectionAt: correctedClosing.correctedAt,
    archivedAt: '2026-11-14T15:10:00.000Z',
    archivedBy: sampleOrg.ownerId,
    updatedAt: correctedClosing.correctedAt!,
  };
  const verifiedStaleV1Download = await verifyOriginalArchivedExcelFromDrive({
    fileBytes: v1.bytes,
    archiveRecord: staleV1Archive,
  });
  assert.equal(verifiedStaleV1Download.verified, true);
  assert.equal(verifiedStaleV1Download.revision, 1);
  assert.equal(verifiedStaleV1Download.payloadHash, v1.payloadHash);

  await assert.rejects(
    () =>
      verifyOriginalArchivedExcelFromDrive({
        fileBytes: v1.bytes,
        archiveRecord: {
          ...staleV1Archive,
          drivePayloadHash: '0'.repeat(64),
        },
      }),
    /بصمة البيانات SHA-256/
  );

  console.log('ALL EXCEL REPORT SERVICE VERIFICATION TESTS PASSED.');
}

runTests().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
