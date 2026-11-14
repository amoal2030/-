import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import * as fs from 'fs';

const DELETE_FIELD = firebase.firestore.FieldValue.delete();

interface TestOutcome {
  name: string;
  passed: boolean;
  error?: string;
}

function parseEmulatorConfig(): { host: string; port: number } {
  const envHost = process.env.FIRESTORE_EMULATOR_HOST;
  if (envHost) {
    const [rawHost, rawPort] = envHost.split(':');
    const parsedPort = Number(rawPort);
    if (rawHost && !Number.isNaN(parsedPort) && parsedPort > 0) {
      return { host: rawHost, port: parsedPort };
    }
  }
  return { host: '127.0.0.1', port: 8080 };
}

const HASH_V1 = 'a'.repeat(64);
const HASH_V2 = 'b'.repeat(64);
const HASH_V3 = 'c'.repeat(64);

const DRIVE_FILE_V1 = '1AbCdEf_GhIjKl-MnOpQrStUvWxYz0123456789';
const DRIVE_FILE_V2 = '1ZyXwVu_TsRqPo-NmLkJiHgFeDcBa9876543210';
const DRIVE_FILE_V3 = '1ReArChIvE_V3_FileId-With_Valid.Chars_99';
const DRIVE_MONTH_FOLDER = '1MonthFolder_2026_11-AbCdEfGhIjKl';

async function runClosingArchivesTestSuite() {
  console.log('========================================================================');
  console.log('   FIRESTORE EMULATOR SECURITY TESTS: closingArchives/{closingId}       ');
  console.log('   Target Rules File: firestore.rules (REAL RULES, LOCAL EMULATOR ONLY) ');
  console.log('========================================================================\n');

  const rulesContent = fs.readFileSync('firestore.rules', 'utf8');
  const { host, port } = parseEmulatorConfig();

  // Strictly isolated local emulator project ID (never touches production)
  const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: 'aleqfal-closing-archives-tests',
    firestore: {
      rules: rulesContent,
      host,
      port,
    },
  });

  await testEnv.clearFirestore();

  // Seed core fixtures using security-rules bypass
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    // Organizations
    await db.doc('organizations/org_main').set({
      id: 'org_main',
      name: 'مؤسسة الإقفال الرئيسية',
      ownerId: 'mgr_01',
      currency: 'SAR',
      createdAt: '2026-11-01T00:00:00Z',
    });

    await db.doc('organizations/org_other').set({
      id: 'org_other',
      name: 'مؤسسة أخرى معزولة',
      ownerId: 'mgr_other',
      currency: 'SAR',
      createdAt: '2026-11-01T00:00:00Z',
    });

    // Users
    await db.doc('users/mgr_01').set({
      uid: 'mgr_01',
      orgId: 'org_main',
      displayName: 'مدير المؤسسة الرئيسية',
      role: 'manager',
      isActive: true,
      createdAt: '2026-11-01T00:00:00Z',
    });

    await db.doc('users/mgr_other').set({
      uid: 'mgr_other',
      orgId: 'org_other',
      displayName: 'مدير المؤسسة الأخرى',
      role: 'manager',
      isActive: true,
      createdAt: '2026-11-01T00:00:00Z',
    });

    await db.doc('users/emp_01').set({
      uid: 'emp_01',
      orgId: 'org_main',
      branchId: 'br_01',
      displayName: 'موظف الفرع الأول',
      role: 'employee',
      isActive: true,
      createdAt: '2026-11-01T00:00:00Z',
    });

    await db.doc('users/emp_02').set({
      uid: 'emp_02',
      orgId: 'org_main',
      branchId: 'br_02',
      displayName: 'موظف الفرع الثاني',
      role: 'employee',
      isActive: true,
      createdAt: '2026-11-01T00:00:00Z',
    });

    await db.doc('users/emp_no_branch').set({
      uid: 'emp_no_branch',
      orgId: 'org_main',
      displayName: 'موظف بلا فرع',
      role: 'employee',
      isActive: true,
      createdAt: '2026-11-01T00:00:00Z',
    });

    await db.doc('users/emp_disabled').set({
      uid: 'emp_disabled',
      orgId: 'org_main',
      branchId: 'br_01',
      displayName: 'موظف معطل',
      role: 'employee',
      isActive: false,
      createdAt: '2026-11-01T00:00:00Z',
    });

    // Branches
    await db.doc('branches/br_01').set({
      id: 'br_01',
      orgId: 'org_main',
      name: 'الفرع الأول',
      isActive: true,
    });
    await db.doc('branches/br_02').set({
      id: 'br_02',
      orgId: 'org_main',
      name: 'الفرع الثاني',
      isActive: true,
    });
    await db.doc('branches/br_other').set({
      id: 'br_other',
      orgId: 'org_other',
      name: 'فرع المؤسسة الأخرى',
      isActive: true,
    });

    // Parent closings for testing
    await db.doc('closings/cls_emp1_pending').set({
      id: 'cls_emp1_pending',
      orgId: 'org_main',
      branchId: 'br_01',
      branchName: 'الفرع الأول',
      employeeId: 'emp_01',
      employeeName: 'موظف الفرع الأول',
      date: '2026-11-10',
      period: 'morning',
      cashSales: 1000,
      cardSales: 2000,
      totalSales: 3000,
      expenses: 100,
      remainingInBox: 900,
      netPeriod: 2900,
      status: 'pending_review',
      createdAt: '2026-11-10T08:00:00Z',
      updatedAt: '2026-11-10T08:00:00Z',
    });

    await db.doc('closings/cls_emp1_rejected').set({
      id: 'cls_emp1_rejected',
      orgId: 'org_main',
      branchId: 'br_01',
      branchName: 'الفرع الأول',
      employeeId: 'emp_01',
      employeeName: 'موظف الفرع الأول',
      date: '2026-11-11',
      period: 'evening',
      cashSales: 1200,
      cardSales: 1800,
      totalSales: 3000,
      expenses: 200,
      remainingInBox: 1000,
      netPeriod: 2800,
      status: 'rejected',
      createdAt: '2026-11-11T16:00:00Z',
      updatedAt: '2026-11-11T17:00:00Z',
    });

    await db.doc('closings/cls_emp2_pending').set({
      id: 'cls_emp2_pending',
      orgId: 'org_main',
      branchId: 'br_02',
      branchName: 'الفرع الثاني',
      employeeId: 'emp_02',
      employeeName: 'موظف الفرع الثاني',
      date: '2026-11-10',
      period: 'morning',
      cashSales: 800,
      cardSales: 1200,
      totalSales: 2000,
      expenses: 50,
      remainingInBox: 750,
      netPeriod: 1950,
      status: 'pending_review',
      createdAt: '2026-11-10T09:00:00Z',
      updatedAt: '2026-11-10T09:00:00Z',
    });

    await db.doc('closings/cls_approved_br1').set({
      id: 'cls_approved_br1',
      orgId: 'org_main',
      branchId: 'br_01',
      branchName: 'الفرع الأول',
      employeeId: 'emp_01',
      employeeName: 'موظف الفرع الأول',
      date: '2026-11-09',
      period: 'morning',
      cashSales: 1500,
      cardSales: 2500,
      totalSales: 4000,
      expenses: 300,
      remainingInBox: 1200,
      netPeriod: 3700,
      status: 'approved',
      createdAt: '2026-11-09T08:00:00Z',
      updatedAt: '2026-11-09T12:00:00Z',
    });

    await db.doc('closings/cls_approved_lifecycle').set({
      id: 'cls_approved_lifecycle',
      orgId: 'org_main',
      branchId: 'br_01',
      branchName: 'الفرع الأول',
      employeeId: 'emp_01',
      employeeName: 'موظف الفرع الأول',
      date: '2026-11-12',
      period: 'morning',
      cashSales: 2000,
      cardSales: 3000,
      totalSales: 5000,
      expenses: 200,
      remainingInBox: 1800,
      netPeriod: 4800,
      status: 'approved',
      createdAt: '2026-11-12T08:00:00Z',
      updatedAt: '2026-11-12T12:00:00Z',
    });

    await db.doc('closings/cls_approved_br2').set({
      id: 'cls_approved_br2',
      orgId: 'org_main',
      branchId: 'br_02',
      branchName: 'الفرع الثاني',
      employeeId: 'emp_02',
      employeeName: 'موظف الفرع الثاني',
      date: '2026-11-12',
      period: 'evening',
      cashSales: 1000,
      cardSales: 1000,
      totalSales: 2000,
      expenses: 100,
      remainingInBox: 900,
      netPeriod: 1900,
      status: 'approved',
      createdAt: '2026-11-12T18:00:00Z',
      updatedAt: '2026-11-12T20:00:00Z',
    });

    await db.doc('closings/cls_approved_tx_test').set({
      id: 'cls_approved_tx_test',
      orgId: 'org_main',
      branchId: 'br_01',
      branchName: 'الفرع الأول',
      employeeId: 'emp_01',
      employeeName: 'موظف الفرع الأول',
      date: '2026-11-13',
      period: 'morning',
      cashSales: 3000,
      cardSales: 4000,
      totalSales: 7000,
      expenses: 500,
      remainingInBox: 2500,
      netPeriod: 6500,
      status: 'approved',
      createdAt: '2026-11-13T08:00:00Z',
      updatedAt: '2026-11-13T12:00:00Z',
    });

    // Pre-seed archive for br_02 for read/isolation tests
    await db.doc('closingArchives/cls_approved_br2').set({
      closingId: 'cls_approved_br2',
      orgId: 'org_main',
      branchId: 'br_02',
      yearMonth: '2026-11',
      archiveStatus: 'archived',
      driveExcelFileId: DRIVE_FILE_V1,
      driveExcelFileName: 'closing_br2_2026-11-12.xlsx',
      driveMonthFolderId: DRIVE_MONTH_FOLDER,
      drivePayloadHash: HASH_V1,
      driveRevision: 1,
      archivedAt: '2026-11-12T20:05:00Z',
      archivedBy: 'mgr_01',
      updatedAt: '2026-11-12T20:05:00Z',
    });
  });

  const outcomes: TestOutcome[] = [];

  async function runCase(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      outcomes.push({ name, passed: true });
      console.log(`✔ PASS: ${name}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      outcomes.push({ name, passed: false, error: message });
      console.error(`✖ FAIL: ${name}\n   ↳ ${message}`);
    }
  }

  const unauthDb = testEnv.unauthenticatedContext().firestore();
  const mgrDb = testEnv.authenticatedContext('mgr_01').firestore();
  const otherMgrDb = testEnv.authenticatedContext('mgr_other').firestore();
  const emp1Db = testEnv.authenticatedContext('emp_01').firestore();
  const emp2Db = testEnv.authenticatedContext('emp_02').firestore();
  const empNoBranchDb = testEnv.authenticatedContext('emp_no_branch').firestore();
  const disabledDb = testEnv.authenticatedContext('emp_disabled').firestore();

  // =================================================================================================
  // GROUP 1: Employee Create & Field/Closing Constraints
  // =================================================================================================

  await runCase('1. Employee creates pending_drive_sync for own branch non-approved closing', async () => {
    await assertSucceeds(
      emp1Db.doc('closingArchives/cls_emp1_pending').set({
        closingId: 'cls_emp1_pending',
        orgId: 'org_main',
        branchId: 'br_01',
        yearMonth: '2026-11',
        archiveStatus: 'pending_drive_sync',
        updatedAt: '2026-11-10T08:05:00Z',
      })
    );
  });

  await runCase('2. Employee cannot create pending_drive_sync for an approved closing', async () => {
    await assertFails(
      emp1Db.doc('closingArchives/cls_approved_br1').set({
        closingId: 'cls_approved_br1',
        orgId: 'org_main',
        branchId: 'br_01',
        yearMonth: '2026-11',
        archiveStatus: 'pending_drive_sync',
        updatedAt: '2026-11-09T12:05:00Z',
      })
    );
  });

  await runCase('3. Employee cannot create closingArchive for another branch, another org, or wrong closingId', async () => {
    // Another branch in same org
    await assertFails(
      emp1Db.doc('closingArchives/cls_emp2_pending').set({
        closingId: 'cls_emp2_pending',
        orgId: 'org_main',
        branchId: 'br_02',
        yearMonth: '2026-11',
        archiveStatus: 'pending_drive_sync',
        updatedAt: '2026-11-10T09:05:00Z',
      })
    );
    // Mismatched document ID vs closingId field
    await assertFails(
      emp1Db.doc('closingArchives/cls_emp1_wrong_doc_id').set({
        closingId: 'cls_emp1_pending',
        orgId: 'org_main',
        branchId: 'br_01',
        yearMonth: '2026-11',
        archiveStatus: 'pending_drive_sync',
        updatedAt: '2026-11-10T08:05:00Z',
      })
    );
    // Mismatched yearMonth vs parent closing date (2026-11-11 vs 2026-10)
    await assertFails(
      emp1Db.doc('closingArchives/cls_emp1_rejected').set({
        closingId: 'cls_emp1_rejected',
        orgId: 'org_main',
        branchId: 'br_01',
        yearMonth: '2026-10',
        archiveStatus: 'pending_drive_sync',
        updatedAt: '2026-11-11T17:05:00Z',
      })
    );
    // Active employee with no branchId assigned
    await assertFails(
      empNoBranchDb.doc('closingArchives/cls_emp1_rejected').set({
        closingId: 'cls_emp1_rejected',
        orgId: 'org_main',
        branchId: 'br_01',
        yearMonth: '2026-11',
        archiveStatus: 'pending_drive_sync',
        updatedAt: '2026-11-11T17:05:00Z',
      })
    );
  });

  await runCase('4. Employee cannot create archived/failed/stale or inject Drive proof fields', async () => {
    await assertFails(
      emp1Db.doc('closingArchives/cls_emp1_rejected').set({
        closingId: 'cls_emp1_rejected',
        orgId: 'org_main',
        branchId: 'br_01',
        yearMonth: '2026-11',
        archiveStatus: 'archived',
        updatedAt: '2026-11-11T17:05:00Z',
      })
    );
    await assertFails(
      emp1Db.doc('closingArchives/cls_emp1_rejected').set({
        closingId: 'cls_emp1_rejected',
        orgId: 'org_main',
        branchId: 'br_01',
        yearMonth: '2026-11',
        archiveStatus: 'pending_drive_sync',
        driveExcelFileId: DRIVE_FILE_V1,
        updatedAt: '2026-11-11T17:05:00Z',
      })
    );
    await assertFails(
      emp1Db.doc('closingArchives/cls_emp1_rejected').set({
        closingId: 'cls_emp1_rejected',
        orgId: 'org_main',
        branchId: 'br_01',
        yearMonth: '2026-11',
        archiveStatus: 'pending_drive_sync',
        archiveError: 'محاولة حقن حقل خطأ غير مسموح',
        updatedAt: '2026-11-11T17:05:00Z',
      })
    );
  });

  await runCase('5. Employee update allowed only for updatedAt on non-approved closing, and blocked on Drive fields', async () => {
    // Valid update on cls_emp1_pending (currently pending_review)
    await assertSucceeds(
      emp1Db.doc('closingArchives/cls_emp1_pending').update({
        archiveStatus: 'pending_drive_sync',
        updatedAt: '2026-11-10T08:15:00Z',
      })
    );

    // Blocked: modifying forbidden field (diff().affectedKeys() violation)
    await assertFails(
      emp1Db.doc('closingArchives/cls_emp1_pending').update({
        archiveStatus: 'pending_drive_sync',
        driveExcelFileId: DRIVE_FILE_V1,
        updatedAt: '2026-11-10T08:16:00Z',
      })
    );

    // Blocked: employee changing status to archived or failed
    await assertFails(
      emp1Db.doc('closingArchives/cls_emp1_pending').update({
        archiveStatus: 'archived',
        updatedAt: '2026-11-10T08:17:00Z',
      })
    );

    // Blocked: employee updating another employee/branch archive
    await assertFails(
      emp2Db.doc('closingArchives/cls_emp1_pending').update({
        updatedAt: '2026-11-10T08:18:00Z',
      })
    );
  });

  // =================================================================================================
  // GROUP 2: Future Employee 3-Write Batch (closings + auditLogs + closingArchives)
  // =================================================================================================

  await runCase('6. Future Employee 3-write atomic batch (closings + auditLogs + closingArchives) succeeds', async () => {
    const batch = emp1Db.batch();
    const closingId = 'cls_emp1_batch_new_01';

    batch.set(emp1Db.doc(`closings/${closingId}`), {
      id: closingId,
      orgId: 'org_main',
      branchId: 'br_01',
      branchName: 'الفرع الأول',
      employeeId: 'emp_01',
      employeeName: 'موظف الفرع الأول',
      date: '2026-11-14',
      period: 'morning',
      cashSales: 1100,
      cardSales: 2100,
      totalSales: 3200,
      expenses: 100,
      remainingInBox: 1000,
      netPeriod: 3100,
      status: 'pending_review',
      createdAt: '2026-11-14T10:00:00Z',
      updatedAt: '2026-11-14T10:00:00Z',
    });

    batch.set(emp1Db.doc('auditLogs/log_emp1_batch_01'), {
      id: 'log_emp1_batch_01',
      orgId: 'org_main',
      actorId: 'emp_01',
      actorName: 'موظف الفرع الأول',
      actorRole: 'employee',
      action: 'CLOSING_SUBMITTED_FOR_REVIEW',
      targetType: 'closing',
      targetId: closingId,
      details: 'إرسال إقفال الوردية الصباحية للمراجعة مع تهيئة فهرس الأرشفة',
      timestamp: '2026-11-14T10:00:00Z',
    });

    batch.set(emp1Db.doc(`closingArchives/${closingId}`), {
      closingId,
      orgId: 'org_main',
      branchId: 'br_01',
      yearMonth: '2026-11',
      archiveStatus: 'pending_drive_sync',
      updatedAt: '2026-11-14T10:00:00Z',
    });

    await assertSucceeds(batch.commit());
  });

  await runCase('7. Employee 3-write batch fails atomically if closingArchives uses wrong yearMonth or archived status', async () => {
    const batch = emp1Db.batch();
    const closingId = 'cls_emp1_batch_bad_02';

    batch.set(emp1Db.doc(`closings/${closingId}`), {
      id: closingId,
      orgId: 'org_main',
      branchId: 'br_01',
      branchName: 'الفرع الأول',
      employeeId: 'emp_01',
      employeeName: 'موظف الفرع الأول',
      date: '2026-11-14',
      period: 'evening',
      cashSales: 900,
      cardSales: 1100,
      totalSales: 2000,
      expenses: 50,
      remainingInBox: 850,
      netPeriod: 1950,
      status: 'pending_review',
      createdAt: '2026-11-14T11:00:00Z',
      updatedAt: '2026-11-14T11:00:00Z',
    });

    batch.set(emp1Db.doc('auditLogs/log_emp1_batch_bad_02'), {
      id: 'log_emp1_batch_bad_02',
      orgId: 'org_main',
      actorId: 'emp_01',
      actorName: 'موظف الفرع الأول',
      actorRole: 'employee',
      action: 'CLOSING_SUBMITTED_FOR_REVIEW',
      targetType: 'closing',
      targetId: closingId,
      details: 'محاولة تلاعب بالشهر في فهرس الأرشفة أثناء الإرسال',
      timestamp: '2026-11-14T11:00:00Z',
    });

    batch.set(emp1Db.doc(`closingArchives/${closingId}`), {
      closingId,
      orgId: 'org_main',
      branchId: 'br_01',
      yearMonth: '2026-12', // Mismatch with 2026-11-14
      archiveStatus: 'pending_drive_sync',
      updatedAt: '2026-11-14T11:00:00Z',
    });

    await assertFails(batch.commit());
  });

  // =================================================================================================
  // GROUP 3: Read (get & list), Tenant Isolation & Disabled Account
  // =================================================================================================

  await runCase('8. Tenant & branch isolation for get and list queries', async () => {
    // Unauthenticated & disabled rejected
    await assertFails(unauthDb.doc('closingArchives/cls_emp1_pending').get());
    await assertFails(disabledDb.doc('closingArchives/cls_emp1_pending').get());
    await assertFails(
      disabledDb
        .collection('closingArchives')
        .where('orgId', '==', 'org_main')
        .where('branchId', '==', 'br_01')
        .get()
    );

    // Manager can get across all org branches & list with orgId filter
    await assertSucceeds(mgrDb.doc('closingArchives/cls_emp1_pending').get());
    await assertSucceeds(mgrDb.doc('closingArchives/cls_approved_br2').get());
    await assertSucceeds(
      mgrDb.collection('closingArchives').where('orgId', '==', 'org_main').get()
    );

    // Manager cannot run unfiltered collection list
    await assertFails(mgrDb.collection('closingArchives').get());

    // Cross-org manager cannot get or list org_main
    await assertFails(otherMgrDb.doc('closingArchives/cls_approved_br2').get());
    await assertFails(
      otherMgrDb.collection('closingArchives').where('orgId', '==', 'org_main').get()
    );

    // Employee can get own branch, blocked on sibling branch br_02
    await assertSucceeds(emp1Db.doc('closingArchives/cls_emp1_pending').get());
    await assertFails(emp1Db.doc('closingArchives/cls_approved_br2').get());

    // Employee list MUST filter by BOTH orgId and branchId
    await assertFails(
      emp1Db.collection('closingArchives').where('orgId', '==', 'org_main').get()
    );
    await assertFails(
      emp1Db
        .collection('closingArchives')
        .where('orgId', '==', 'org_main')
        .where('branchId', '==', 'br_02')
        .get()
    );
    await assertSucceeds(
      emp1Db
        .collection('closingArchives')
        .where('orgId', '==', 'org_main')
        .where('branchId', '==', 'br_01')
        .get()
    );

    // Employee without branchId cannot list
    await assertFails(
      empNoBranchDb.collection('closingArchives').where('orgId', '==', 'org_main').get()
    );
  });

  // =================================================================================================
  // GROUP 4: Manager Direct Create & Proof Validation
  // =================================================================================================

  await runCase('9. Manager cannot create archived without approved closing or with invalid Drive proof', async () => {
    // Blocked on non-approved closing (cls_emp1_rejected is 'rejected')
    await assertFails(
      mgrDb.doc('closingArchives/cls_emp1_rejected').set({
        closingId: 'cls_emp1_rejected',
        orgId: 'org_main',
        branchId: 'br_01',
        yearMonth: '2026-11',
        archiveStatus: 'archived',
        driveExcelFileId: DRIVE_FILE_V1,
        driveExcelFileName: 'closing_rejected.xlsx',
        driveMonthFolderId: DRIVE_MONTH_FOLDER,
        drivePayloadHash: HASH_V1,
        driveRevision: 1,
        archivedAt: '2026-11-11T17:10:00Z',
        archivedBy: 'mgr_01',
        updatedAt: '2026-11-11T17:10:00Z',
      })
    );

    // Blocked on approved closing if partial proof (missing drivePayloadHash)
    await assertFails(
      mgrDb.doc('closingArchives/cls_approved_br1').set({
        closingId: 'cls_approved_br1',
        orgId: 'org_main',
        branchId: 'br_01',
        yearMonth: '2026-11',
        archiveStatus: 'archived',
        driveExcelFileId: DRIVE_FILE_V1,
        driveExcelFileName: 'closing_br1.xlsx',
        driveMonthFolderId: DRIVE_MONTH_FOLDER,
        driveRevision: 1,
        archivedAt: '2026-11-09T12:10:00Z',
        archivedBy: 'mgr_01',
        updatedAt: '2026-11-09T12:10:00Z',
      })
    );

    // Blocked if filename is not .xlsx or hash invalid or driveRevision is 0
    await assertFails(
      mgrDb.doc('closingArchives/cls_approved_br1').set({
        closingId: 'cls_approved_br1',
        orgId: 'org_main',
        branchId: 'br_01',
        yearMonth: '2026-11',
        archiveStatus: 'archived',
        driveExcelFileId: DRIVE_FILE_V1,
        driveExcelFileName: 'closing_br1.csv',
        driveMonthFolderId: DRIVE_MONTH_FOLDER,
        drivePayloadHash: 'invalid_short_hash',
        driveRevision: 1,
        archivedAt: '2026-11-09T12:10:00Z',
        archivedBy: 'mgr_01',
        updatedAt: '2026-11-09T12:10:00Z',
      })
    );

    // Blocked if stale on direct create
    await assertFails(
      mgrDb.doc('closingArchives/cls_approved_br1').set({
        closingId: 'cls_approved_br1',
        orgId: 'org_main',
        branchId: 'br_01',
        yearMonth: '2026-11',
        archiveStatus: 'stale',
        updatedAt: '2026-11-09T12:10:00Z',
      })
    );
  });

  await runCase('10. Manager creates valid archived record directly for approved closing (realistic Drive ID)', async () => {
    await assertSucceeds(
      mgrDb.doc('closingArchives/cls_approved_br1').set({
        closingId: 'cls_approved_br1',
        orgId: 'org_main',
        branchId: 'br_01',
        yearMonth: '2026-11',
        archiveStatus: 'archived',
        driveExcelFileId: DRIVE_FILE_V1,
        driveExcelFileName: 'AL-EQFAL_br_01_2026-11-09_morning.xlsx',
        driveExcelWebViewLink: `https://drive.google.com/file/d/${DRIVE_FILE_V1}/view`,
        driveMonthFolderId: DRIVE_MONTH_FOLDER,
        drivePayloadHash: HASH_V1,
        driveRevision: 1,
        archivedAt: '2026-11-09T12:10:00Z',
        archivedBy: 'mgr_01',
        updatedAt: '2026-11-09T12:10:00Z',
      })
    );
  });

  // =================================================================================================
  // GROUP 5: Full Lifecycle: pending_drive_sync -> failed -> archived -> stale -> failed -> archived
  //          + Manager 3-Write Atomic Correction Batch + Double Correction (v1 -> v2 -> v3)
  // =================================================================================================

  await runCase('11. Manager lifecycle part 1: pending_drive_sync -> failed -> pending_drive_sync -> archived (v1)', async () => {
    const archiveRef = mgrDb.doc('closingArchives/cls_approved_lifecycle');

    // Create initial pending_drive_sync
    await assertSucceeds(
      archiveRef.set({
        closingId: 'cls_approved_lifecycle',
        orgId: 'org_main',
        branchId: 'br_01',
        yearMonth: '2026-11',
        archiveStatus: 'pending_drive_sync',
        updatedAt: '2026-11-12T12:01:00Z',
      })
    );

    // Transition: pending_drive_sync -> failed
    await assertSucceeds(
      archiveRef.update({
        archiveStatus: 'failed',
        archiveError: 'انقطاع اتصال Google Drive أثناء رفع ملف Excel',
        updatedAt: '2026-11-12T12:02:00Z',
      })
    );

    // Transition: failed -> pending_drive_sync (allowed only when never archived before)
    await assertSucceeds(
      archiveRef.update({
        archiveStatus: 'pending_drive_sync',
        archiveError: DELETE_FIELD,
        updatedAt: '2026-11-12T12:03:00Z',
      })
    );

    // Blocked: pending_drive_sync -> stale
    await assertFails(
      archiveRef.update({
        archiveStatus: 'stale',
        updatedAt: '2026-11-12T12:03:30Z',
      })
    );

    // Transition: pending_drive_sync -> archived (v1)
    await assertSucceeds(
      archiveRef.update({
        archiveStatus: 'archived',
        driveExcelFileId: DRIVE_FILE_V1,
        driveExcelFileName: 'closing_lifecycle_v1.xlsx',
        driveExcelWebViewLink: `https://drive.google.com/file/d/${DRIVE_FILE_V1}/view`,
        driveMonthFolderId: DRIVE_MONTH_FOLDER,
        drivePayloadHash: HASH_V1,
        driveRevision: 1,
        archivedAt: '2026-11-12T12:04:00Z',
        archivedBy: 'mgr_01',
        updatedAt: '2026-11-12T12:04:00Z',
      })
    );
  });

  await runCase('12. Illegitimate transitions from archived are strictly blocked', async () => {
    const archiveRef = mgrDb.doc('closingArchives/cls_approved_lifecycle');

    // Blocked: archived -> pending_drive_sync
    await assertFails(
      archiveRef.update({
        archiveStatus: 'pending_drive_sync',
        driveExcelFileId: DELETE_FIELD,
        driveExcelFileName: DELETE_FIELD,
        driveExcelWebViewLink: DELETE_FIELD,
        driveMonthFolderId: DELETE_FIELD,
        drivePayloadHash: DELETE_FIELD,
        driveRevision: DELETE_FIELD,
        archivedAt: DELETE_FIELD,
        archivedBy: DELETE_FIELD,
        updatedAt: '2026-11-12T12:05:00Z',
      })
    );

    // Blocked: archived -> failed
    await assertFails(
      archiveRef.update({
        archiveStatus: 'failed',
        archiveError: 'محاولة إرجاع حالة مؤرشف إلى فاشل',
        updatedAt: '2026-11-12T12:05:00Z',
      })
    );

    // Blocked: archived -> archived directly without stale step
    await assertFails(
      archiveRef.update({
        archiveStatus: 'archived',
        driveExcelFileId: DRIVE_FILE_V2,
        drivePayloadHash: HASH_V2,
        driveRevision: 2,
        previousDriveExcelFileId: DRIVE_FILE_V1,
        updatedAt: '2026-11-12T12:05:00Z',
      })
    );

    // Blocked: archived -> stale standalone (without fresh atomic closing correction!)
    await assertFails(
      archiveRef.update({
        archiveStatus: 'stale',
        sourceCorrectionAt: '2026-11-12T12:05:00Z',
        updatedAt: '2026-11-12T12:05:00Z',
      })
    );

    // Blocked: immutable fields tampered (branchId / yearMonth)
    await assertFails(
      archiveRef.update({
        branchId: 'br_02',
        updatedAt: '2026-11-12T12:05:00Z',
      })
    );
  });

  await runCase('13. Future Manager 3-write atomic batch (closings correction + auditLogs + closingArchives archived -> stale)', async () => {
    const t1 = '2026-11-12T13:00:00Z';
    const prevSnap = {
      cashSales: 2000,
      cardSales: 3000,
      expenses: 200,
      totalSales: 5000,
    };
    const newSnap = {
      cashSales: 2300,
      cardSales: 3000,
      expenses: 200,
      totalSales: 5300,
    };

    const batch = mgrDb.batch();
    batch.update(mgrDb.doc('closings/cls_approved_lifecycle'), {
      cashSales: 2300,
      cardSales: 3000,
      expenses: 200,
      totalSales: 5300,
      remainingInBox: 2100,
      netPeriod: 5100,
      previousValues: prevSnap,
      correctionReason: 'تصحيح مبيعات نقدية معتمدة ووسم الأرشيف بالتقادم',
      correctedBy: 'mgr_01',
      correctedByName: 'مدير المؤسسة الرئيسية',
      correctedAt: t1,
      updatedAt: t1,
    });

    batch.set(mgrDb.doc('auditLogs/log_admin_correct_lifecycle_01'), {
      id: 'log_admin_correct_lifecycle_01',
      orgId: 'org_main',
      actorId: 'mgr_01',
      actorName: 'مدير المؤسسة الرئيسية',
      actorRole: 'manager',
      action: 'CLOSING_ADMIN_CORRECTED',
      targetType: 'closing',
      targetId: 'cls_approved_lifecycle',
      details: 'تصحيح إداري أول مع تحويل حالة أرشيف Drive إلى stale',
      timestamp: t1,
      previousValues: prevSnap,
      newValues: newSnap,
    });

    batch.update(mgrDb.doc('closingArchives/cls_approved_lifecycle'), {
      archiveStatus: 'stale',
      sourceCorrectionAt: t1,
      updatedAt: t1,
    });

    await assertSucceeds(batch.commit());
  });

  await runCase('14. Manager lifecycle part 2: stale -> failed -> failed -> archived (v2) with strict progression checks', async () => {
    const t1 = '2026-11-12T13:00:00Z';
    const archiveRef = mgrDb.doc('closingArchives/cls_approved_lifecycle');

    // Blocked: stale -> pending_drive_sync
    await assertFails(
      archiveRef.update({
        archiveStatus: 'pending_drive_sync',
        updatedAt: '2026-11-12T13:05:00Z',
      })
    );

    // Allowed: stale -> failed (preserving v1 Drive proof AND sourceCorrectionAt)
    await assertSucceeds(
      archiveRef.update({
        archiveStatus: 'failed',
        archiveError: 'فشل مؤقت أثناء إعادة رفع ملف Excel بعد التصحيح',
        updatedAt: '2026-11-12T13:10:00Z',
      })
    );

    // Allowed: failed (with prior proof) -> failed (preserving v1 proof & sourceCorrectionAt)
    await assertSucceeds(
      archiveRef.update({
        archiveStatus: 'failed',
        archiveError: 'إعادة محاولة فاشلة ثانية مع الاحتفاظ بمرجع التصحيح والأرشيف السابق',
        updatedAt: '2026-11-12T13:11:00Z',
      })
    );

    // Blocked: failed (with prior proof) -> pending_drive_sync
    await assertFails(
      archiveRef.update({
        archiveStatus: 'pending_drive_sync',
        archiveError: DELETE_FIELD,
        driveExcelFileId: DELETE_FIELD,
        driveExcelFileName: DELETE_FIELD,
        driveExcelWebViewLink: DELETE_FIELD,
        driveMonthFolderId: DELETE_FIELD,
        drivePayloadHash: DELETE_FIELD,
        driveRevision: DELETE_FIELD,
        sourceCorrectionAt: DELETE_FIELD,
        archivedAt: DELETE_FIELD,
        archivedBy: DELETE_FIELD,
        updatedAt: '2026-11-12T13:12:00Z',
      })
    );

    // Blocked: failed -> archived without bumping driveRevision or without previousDriveExcelFileId
    await assertFails(
      archiveRef.update({
        archiveStatus: 'archived',
        archiveError: DELETE_FIELD,
        driveExcelFileId: DRIVE_FILE_V2,
        driveExcelFileName: 'closing_lifecycle_v2.xlsx',
        drivePayloadHash: HASH_V2,
        driveRevision: 1, // NOT >= prev (1) + 1
        previousDriveExcelFileId: DRIVE_FILE_V1,
        sourceCorrectionAt: t1,
        archivedAt: '2026-11-12T13:15:00Z',
        archivedBy: 'mgr_01',
        updatedAt: '2026-11-12T13:15:00Z',
      })
    );

    // Allowed: failed -> archived (v2) with valid progression & removed archiveError
    await assertSucceeds(
      archiveRef.update({
        archiveStatus: 'archived',
        archiveError: DELETE_FIELD,
        driveExcelFileId: DRIVE_FILE_V2,
        driveExcelFileName: 'closing_lifecycle_v2.xlsx',
        driveExcelWebViewLink: `https://drive.google.com/file/d/${DRIVE_FILE_V2}/view`,
        driveMonthFolderId: DRIVE_MONTH_FOLDER,
        drivePayloadHash: HASH_V2,
        driveRevision: 2,
        previousDriveExcelFileId: DRIVE_FILE_V1,
        sourceCorrectionAt: t1,
        archivedAt: '2026-11-12T13:16:00Z',
        archivedBy: 'mgr_01',
        updatedAt: '2026-11-12T13:16:00Z',
      })
    );
  });

  await runCase('15. Double Admin Correction (v2 -> stale (T2) -> archived (v3)) verifies no sourceCorrectionAt deadlock', async () => {
    const t2 = '2026-11-12T14:00:00Z';
    const prevSnap = {
      cashSales: 2300,
      cardSales: 3000,
      expenses: 200,
      totalSales: 5300,
    };
    const newSnap = {
      cashSales: 2500,
      cardSales: 3000,
      expenses: 200,
      totalSales: 5500,
    };

    const batch = mgrDb.batch();
    batch.update(mgrDb.doc('closings/cls_approved_lifecycle'), {
      cashSales: 2500,
      cardSales: 3000,
      expenses: 200,
      totalSales: 5500,
      remainingInBox: 2300,
      netPeriod: 5300,
      previousValues: prevSnap,
      correctionReason: 'تصحيح إداري ثانٍ للتحقق من عدم وجود تعارض sourceCorrectionAt',
      correctedBy: 'mgr_01',
      correctedByName: 'مدير المؤسسة الرئيسية',
      correctedAt: t2,
      updatedAt: t2,
    });

    batch.set(mgrDb.doc('auditLogs/log_admin_correct_lifecycle_02'), {
      id: 'log_admin_correct_lifecycle_02',
      orgId: 'org_main',
      actorId: 'mgr_01',
      actorName: 'مدير المؤسسة الرئيسية',
      actorRole: 'manager',
      action: 'CLOSING_ADMIN_CORRECTED',
      targetType: 'closing',
      targetId: 'cls_approved_lifecycle',
      details: 'تصحيح إداري ثانٍ على نفس الإقفال المؤرشف v2',
      timestamp: t2,
      previousValues: prevSnap,
      newValues: newSnap,
    });

    batch.update(mgrDb.doc('closingArchives/cls_approved_lifecycle'), {
      archiveStatus: 'stale',
      sourceCorrectionAt: t2,
      updatedAt: t2,
    });

    // v2 -> stale with new sourceCorrectionAt = T2 while preserving v2 file proof
    await assertSucceeds(batch.commit());

    // stale -> archived (v3)
    await assertSucceeds(
      mgrDb.doc('closingArchives/cls_approved_lifecycle').update({
        archiveStatus: 'archived',
        driveExcelFileId: DRIVE_FILE_V3,
        driveExcelFileName: 'closing_lifecycle_v3.xlsx',
        driveExcelWebViewLink: `https://drive.google.com/file/d/${DRIVE_FILE_V3}/view`,
        driveMonthFolderId: DRIVE_MONTH_FOLDER,
        drivePayloadHash: HASH_V3,
        driveRevision: 3,
        previousDriveExcelFileId: DRIVE_FILE_V2,
        sourceCorrectionAt: t2,
        archivedAt: '2026-11-12T14:05:00Z',
        archivedBy: 'mgr_01',
        updatedAt: '2026-11-12T14:05:00Z',
      })
    );
  });

  // =================================================================================================
  // GROUP 6: Future Manager 3-Write runTransaction Test + Delete Guard
  // =================================================================================================

  await runCase('16. Future Manager 3-write runTransaction (closings + auditLogs + closingArchives) respects 20-read rule limit', async () => {
    // Seed archived record for cls_approved_tx_test first
    await assertSucceeds(
      mgrDb.doc('closingArchives/cls_approved_tx_test').set({
        closingId: 'cls_approved_tx_test',
        orgId: 'org_main',
        branchId: 'br_01',
        yearMonth: '2026-11',
        archiveStatus: 'archived',
        driveExcelFileId: DRIVE_FILE_V1,
        driveExcelFileName: 'closing_tx_v1.xlsx',
        driveMonthFolderId: DRIVE_MONTH_FOLDER,
        drivePayloadHash: HASH_V1,
        driveRevision: 1,
        archivedAt: '2026-11-13T12:10:00Z',
        archivedBy: 'mgr_01',
        updatedAt: '2026-11-13T12:10:00Z',
      })
    );

    const txTime = '2026-11-13T15:00:00Z';
    await assertSucceeds(
      mgrDb.runTransaction(async (tx) => {
        const closingRef = mgrDb.doc('closings/cls_approved_tx_test');
        const archiveRef = mgrDb.doc('closingArchives/cls_approved_tx_test');
        const logRef = mgrDb.doc('auditLogs/log_tx_correct_01');

        const closingSnap = await tx.get(closingRef);
        const archiveSnap = await tx.get(archiveRef);
        const current = closingSnap.data()!;

        const prevSnap = {
          cashSales: current.cashSales,
          cardSales: current.cardSales,
          expenses: current.expenses,
          totalSales: current.totalSales,
        };

        tx.update(closingRef, {
          cashSales: 3500,
          cardSales: 4000,
          expenses: 500,
          totalSales: 7500,
          remainingInBox: 3000,
          netPeriod: 7000,
          previousValues: prevSnap,
          correctionReason: 'اختبار معاملة runTransaction ثلاثية للتصحيح الإداري',
          correctedBy: 'mgr_01',
          correctedByName: 'مدير المؤسسة الرئيسية',
          correctedAt: txTime,
          updatedAt: txTime,
        });

        tx.set(logRef, {
          id: 'log_tx_correct_01',
          orgId: 'org_main',
          actorId: 'mgr_01',
          actorName: 'مدير المؤسسة الرئيسية',
          actorRole: 'manager',
          action: 'CLOSING_ADMIN_CORRECTED',
          targetType: 'closing',
          targetId: 'cls_approved_tx_test',
          details: 'تصحيح عبر runTransaction ثلاثي',
          timestamp: txTime,
          previousValues: prevSnap,
          newValues: {
            cashSales: 3500,
            cardSales: 4000,
            expenses: 500,
            totalSales: 7500,
          },
        });

        if (archiveSnap.exists) {
          tx.update(archiveRef, {
            archiveStatus: 'stale',
            sourceCorrectionAt: txTime,
            updatedAt: txTime,
          });
        }
      })
    );
  });

  await runCase('17. Consecutive corrections: stale -> stale (T2) and failed(with prior proof) -> stale (T3) succeed atomically', async () => {
    const t1 = '2026-11-13T15:00:00Z';
    const t2 = '2026-11-13T15:10:00Z';
    const t3 = '2026-11-13T15:20:00Z';

    // Currently cls_approved_tx_test archive is 'stale' with sourceCorrectionAt = t1.
    // 1. Fresh admin correction T2 transitions stale -> stale cleanly
    const batchStaleToStale = mgrDb.batch();
    const prevSnap1 = {
      cashSales: 3500,
      cardSales: 4000,
      expenses: 500,
      totalSales: 7500,
    };
    const newSnap1 = {
      cashSales: 3600,
      cardSales: 4000,
      expenses: 500,
      totalSales: 7600,
    };

    batchStaleToStale.update(mgrDb.doc('closings/cls_approved_tx_test'), {
      cashSales: 3600,
      cardSales: 4000,
      expenses: 500,
      totalSales: 7600,
      remainingInBox: 3100,
      netPeriod: 7100,
      previousValues: prevSnap1,
      correctionReason: 'تصحيح متتالٍ قبل إتمام الرفع (stale -> stale)',
      correctedBy: 'mgr_01',
      correctedByName: 'مدير المؤسسة الرئيسية',
      correctedAt: t2,
      updatedAt: t2,
    });

    batchStaleToStale.set(mgrDb.doc('auditLogs/log_tx_correct_02'), {
      id: 'log_tx_correct_02',
      orgId: 'org_main',
      actorId: 'mgr_01',
      actorName: 'مدير المؤسسة الرئيسية',
      actorRole: 'manager',
      action: 'CLOSING_ADMIN_CORRECTED',
      targetType: 'closing',
      targetId: 'cls_approved_tx_test',
      details: 'تصحيح متتالٍ يحول stale -> stale',
      timestamp: t2,
      previousValues: prevSnap1,
      newValues: newSnap1,
    });

    batchStaleToStale.update(mgrDb.doc('closingArchives/cls_approved_tx_test'), {
      archiveStatus: 'stale',
      sourceCorrectionAt: t2,
      updatedAt: t2,
    });

    await assertSucceeds(batchStaleToStale.commit());

    // 2. Re-archive fails if sourceCorrectionAt still uses old T1 instead of latest T2
    await assertFails(
      mgrDb.doc('closingArchives/cls_approved_tx_test').update({
        archiveStatus: 'archived',
        driveExcelFileId: DRIVE_FILE_V2,
        driveExcelFileName: 'closing_tx_v2.xlsx',
        driveMonthFolderId: DRIVE_MONTH_FOLDER,
        drivePayloadHash: HASH_V2,
        driveRevision: 2,
        previousDriveExcelFileId: DRIVE_FILE_V1,
        sourceCorrectionAt: t1, // Stale mismatch with cAfter.correctedAt (t2)
        archivedAt: '2026-11-13T15:12:00Z',
        archivedBy: 'mgr_01',
        updatedAt: '2026-11-13T15:12:00Z',
      })
    );

    // 3. Move stale -> failed (keeping v1 proof + T2)
    await assertSucceeds(
      mgrDb.doc('closingArchives/cls_approved_tx_test').update({
        archiveStatus: 'failed',
        archiveError: 'فشل الرفع بعد التصحيح الثاني T2',
        updatedAt: '2026-11-13T15:15:00Z',
      })
    );

    // 4. Fresh admin correction T3 transitions failed(with prior proof) -> stale and clears archiveError
    const batchFailedToStale = mgrDb.batch();
    const newSnap2 = {
      cashSales: 3700,
      cardSales: 4000,
      expenses: 500,
      totalSales: 7700,
    };

    batchFailedToStale.update(mgrDb.doc('closings/cls_approved_tx_test'), {
      cashSales: 3700,
      cardSales: 4000,
      expenses: 500,
      totalSales: 7700,
      remainingInBox: 3200,
      netPeriod: 7200,
      previousValues: newSnap1,
      correctionReason: 'تصحيح ثالث أثناء فشل المزامنة (failed -> stale)',
      correctedBy: 'mgr_01',
      correctedByName: 'مدير المؤسسة الرئيسية',
      correctedAt: t3,
      updatedAt: t3,
    });

    batchFailedToStale.set(mgrDb.doc('auditLogs/log_tx_correct_03'), {
      id: 'log_tx_correct_03',
      orgId: 'org_main',
      actorId: 'mgr_01',
      actorName: 'مدير المؤسسة الرئيسية',
      actorRole: 'manager',
      action: 'CLOSING_ADMIN_CORRECTED',
      targetType: 'closing',
      targetId: 'cls_approved_tx_test',
      details: 'تصحيح ثالث يحول failed(with proof) -> stale',
      timestamp: t3,
      previousValues: newSnap1,
      newValues: newSnap2,
    });

    batchFailedToStale.update(mgrDb.doc('closingArchives/cls_approved_tx_test'), {
      archiveStatus: 'stale',
      archiveError: DELETE_FIELD,
      sourceCorrectionAt: t3,
      updatedAt: t3,
    });

    await assertSucceeds(batchFailedToStale.commit());
  });

  await runCase('18. Manager can create initial failed archive (no prior proof) on approved closing and cannot omit archiveError', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('closings/cls_approved_fail_init').set({
        id: 'cls_approved_fail_init',
        orgId: 'org_main',
        branchId: 'br_01',
        branchName: 'الفرع الأول',
        employeeId: 'emp_01',
        employeeName: 'موظف الفرع الأول',
        date: '2026-11-14',
        period: 'morning',
        cashSales: 500,
        cardSales: 500,
        totalSales: 1000,
        expenses: 0,
        remainingInBox: 500,
        netPeriod: 1000,
        status: 'approved',
        createdAt: '2026-11-14T08:00:00Z',
        updatedAt: '2026-11-14T09:00:00Z',
      });
    });

    // Missing archiveError -> blocked
    await assertFails(
      mgrDb.doc('closingArchives/cls_approved_fail_init').set({
        closingId: 'cls_approved_fail_init',
        orgId: 'org_main',
        branchId: 'br_01',
        yearMonth: '2026-11',
        archiveStatus: 'failed',
        updatedAt: '2026-11-14T09:05:00Z',
      })
    );

    // Valid initial failed -> fails if driveExcelFileId included, succeeds without proof fields
    await assertSucceeds(
      mgrDb.doc('closingArchives/cls_approved_fail_init').set({
        closingId: 'cls_approved_fail_init',
        orgId: 'org_main',
        branchId: 'br_01',
        yearMonth: '2026-11',
        archiveStatus: 'failed',
        archiveError: 'فشل إنشاء مجلد الشهر في Google Drive',
        updatedAt: '2026-11-14T09:06:00Z',
      })
    );
  });

  await runCase('19. Delete closingArchives is strictly forbidden for manager, employee, and cross-org manager', async () => {
    await assertFails(mgrDb.doc('closingArchives/cls_approved_br1').delete());
    await assertFails(emp1Db.doc('closingArchives/cls_emp1_pending').delete());
    await assertFails(otherMgrDb.doc('closingArchives/cls_approved_br2').delete());
  });

  await runCase('20. Manager can update closingArchives keeping pending_drive_sync within transition and field rules', async () => {
    // Allowed: mgr_01 updates cls_emp1_pending (currently pending_drive_sync, parent pending_review) keeping pending_drive_sync
    await assertSucceeds(
      mgrDb.doc('closingArchives/cls_emp1_pending').update({
        archiveStatus: 'pending_drive_sync',
        updatedAt: '2026-11-10T08:30:00Z',
      })
    );

    // Also allowed: mgr_01 updates a pending_drive_sync archive whose parent closing is already approved (only updatedAt changed)
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await db.doc('closings/cls_approved_pending_mgr').set({
        id: 'cls_approved_pending_mgr',
        orgId: 'org_main',
        branchId: 'br_01',
        branchName: 'الفرع الأول',
        employeeId: 'emp_01',
        employeeName: 'موظف الفرع الأول',
        date: '2026-11-14',
        period: 'evening',
        cashSales: 1000,
        cardSales: 1500,
        totalSales: 2500,
        expenses: 100,
        remainingInBox: 900,
        netPeriod: 2400,
        status: 'approved',
        createdAt: '2026-11-14T16:00:00Z',
        updatedAt: '2026-11-14T18:00:00Z',
      });
      await db.doc('closingArchives/cls_approved_pending_mgr').set({
        closingId: 'cls_approved_pending_mgr',
        orgId: 'org_main',
        branchId: 'br_01',
        yearMonth: '2026-11',
        archiveStatus: 'pending_drive_sync',
        updatedAt: '2026-11-14T18:01:00Z',
      });
    });

    await assertSucceeds(
      mgrDb.doc('closingArchives/cls_approved_pending_mgr').update({
        archiveStatus: 'pending_drive_sync',
        updatedAt: '2026-11-14T18:05:00Z',
      })
    );

    // Blocked: keeping pending_drive_sync while injecting Drive proof fields (hasNoDriveProofFields violation)
    await assertFails(
      mgrDb.doc('closingArchives/cls_approved_pending_mgr').update({
        archiveStatus: 'pending_drive_sync',
        driveExcelFileId: DRIVE_FILE_V1,
        updatedAt: '2026-11-14T18:06:00Z',
      })
    );

    // Blocked: keeping pending_drive_sync while injecting archiveError
    await assertFails(
      mgrDb.doc('closingArchives/cls_approved_pending_mgr').update({
        archiveStatus: 'pending_drive_sync',
        archiveError: 'حقل خطأ غير مسموح مع pending_drive_sync',
        updatedAt: '2026-11-14T18:07:00Z',
      })
    );
  });

  await runCase('21. Cross-org isolation: mgr_other cannot create or update closingArchives for org_main', async () => {
    // Attempt 1 (Create): mgr_other tries to create archive for org_main closing using org_main orgId
    await assertFails(
      otherMgrDb.doc('closingArchives/cls_emp1_rejected').set({
        closingId: 'cls_emp1_rejected',
        orgId: 'org_main',
        branchId: 'br_01',
        yearMonth: '2026-11',
        archiveStatus: 'pending_drive_sync',
        updatedAt: '2026-11-11T17:20:00Z',
      })
    );

    // Attempt 2 (Create with orgId spoofing): mgr_other claims orgId='org_other' while referencing org_main closing
    await assertFails(
      otherMgrDb.doc('closingArchives/cls_emp1_rejected').set({
        closingId: 'cls_emp1_rejected',
        orgId: 'org_other',
        branchId: 'br_01',
        yearMonth: '2026-11',
        archiveStatus: 'pending_drive_sync',
        updatedAt: '2026-11-11T17:21:00Z',
      })
    );

    // Attempt 3 (Update): mgr_other tries to update pending_drive_sync archive in org_main
    await assertFails(
      otherMgrDb.doc('closingArchives/cls_emp1_pending').update({
        archiveStatus: 'pending_drive_sync',
        updatedAt: '2026-11-10T08:45:00Z',
      })
    );

    // Attempt 4 (Update): mgr_other tries to update archived record in org_main
    await assertFails(
      otherMgrDb.doc('closingArchives/cls_approved_br1').update({
        archiveStatus: 'failed',
        archiveError: 'محاولة تخريب من مدير مؤسسة أخرى',
        updatedAt: '2026-11-09T12:30:00Z',
      })
    );
  });

  await runCase('22. Employee cannot update closingArchives once parent closing transitions to approved', async () => {
    const closingId = 'cls_emp1_post_approval_lock';

    // Seed parent closing in pending_review + its closingArchive in pending_drive_sync
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await db.doc(`closings/${closingId}`).set({
        id: closingId,
        orgId: 'org_main',
        branchId: 'br_01',
        branchName: 'الفرع الأول',
        employeeId: 'emp_01',
        employeeName: 'موظف الفرع الأول',
        date: '2026-11-14',
        period: 'evening',
        cashSales: 1400,
        cardSales: 1600,
        totalSales: 3000,
        expenses: 150,
        remainingInBox: 1250,
        netPeriod: 2850,
        status: 'pending_review',
        createdAt: '2026-11-14T19:00:00Z',
        updatedAt: '2026-11-14T19:00:00Z',
      });
      await db.doc(`closingArchives/${closingId}`).set({
        closingId,
        orgId: 'org_main',
        branchId: 'br_01',
        yearMonth: '2026-11',
        archiveStatus: 'pending_drive_sync',
        updatedAt: '2026-11-14T19:00:00Z',
      });
    });

    // Sanity check: while pending_review, employee CAN update updatedAt on closingArchives
    await assertSucceeds(
      emp1Db.doc(`closingArchives/${closingId}`).update({
        archiveStatus: 'pending_drive_sync',
        updatedAt: '2026-11-14T19:02:00Z',
      })
    );

    // Manager legitimately approves the parent closing atomically with CLOSING_APPROVED audit log
    const approveBatch = mgrDb.batch();
    approveBatch.update(mgrDb.doc(`closings/${closingId}`), {
      status: 'approved',
      reviewedBy: 'mgr_01',
      reviewedByName: 'مدير المؤسسة الرئيسية',
      reviewedAt: '2026-11-14T19:05:00Z',
      updatedAt: '2026-11-14T19:05:00Z',
    });
    approveBatch.set(mgrDb.doc('auditLogs/log_approve_post_lock_01'), {
      id: 'log_approve_post_lock_01',
      orgId: 'org_main',
      actorId: 'mgr_01',
      actorName: 'مدير المؤسسة الرئيسية',
      actorRole: 'manager',
      action: 'CLOSING_APPROVED',
      targetType: 'closing',
      targetId: closingId,
      details: 'اعتماد الإقفال للتحقق من قفل تحديثات الموظف في closingArchives بعد الاعتماد',
      timestamp: '2026-11-14T19:05:00Z',
    });
    await assertSucceeds(approveBatch.commit());

    // Now parent closing is 'approved': employee MUST be blocked from updating closingArchives even on allowed keys
    await assertFails(
      emp1Db.doc(`closingArchives/${closingId}`).update({
        archiveStatus: 'pending_drive_sync',
        updatedAt: '2026-11-14T19:10:00Z',
      })
    );
  });

  await runCase('23. Halala integer rules allow 0.1 + 0.2 = 0.30 during admin correction and reject sub-halala or mismatched math', async () => {
    const closingId = 'cls_halala_precision_rules';
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc(`closings/${closingId}`).set({
        id: closingId,
        orgId: 'org_main',
        branchId: 'br_01',
        branchName: 'الفرع الأول',
        employeeId: 'emp_01',
        employeeName: 'موظف الفرع الأول',
        date: '2026-11-15',
        period: 'morning',
        cashSales: 100,
        cardSales: 200,
        totalSales: 300,
        expenses: 50,
        remainingInBox: 50,
        netPeriod: 250,
        status: 'approved',
        createdAt: '2026-11-15T08:00:00Z',
        updatedAt: '2026-11-15T09:00:00Z',
      });
    });

    // Rejected: 3 decimal places (sub-halala 0.145)
    const badSubHalalaBatch = mgrDb.batch();
    badSubHalalaBatch.update(mgrDb.doc(`closings/${closingId}`), {
      cashSales: 0.145,
      cardSales: 0.2,
      expenses: 0,
      totalSales: 0.345,
      remainingInBox: 0.145,
      netPeriod: 0.345,
      previousValues: { cashSales: 100, cardSales: 200, expenses: 50, totalSales: 300 },
      correctionReason: 'رفض دقة أقل من هللة',
      correctedBy: 'mgr_01',
      correctedByName: 'مدير المؤسسة الرئيسية',
      correctedAt: '2026-11-15T10:00:00Z',
      updatedAt: '2026-11-15T10:00:00Z',
    });
    badSubHalalaBatch.set(mgrDb.doc('auditLogs/log_halala_sub_reject'), {
      id: 'log_halala_sub_reject',
      orgId: 'org_main',
      actorId: 'mgr_01',
      actorName: 'مدير المؤسسة الرئيسية',
      actorRole: 'manager',
      action: 'CLOSING_ADMIN_CORRECTED',
      targetType: 'closing',
      targetId: closingId,
      details: 'اختبار رفض أقل من هللة',
      timestamp: '2026-11-15T10:00:00Z',
      previousValues: { cashSales: 100, cardSales: 200, expenses: 50, totalSales: 300 },
      newValues: { cashSales: 0.145, cardSales: 0.2, expenses: 0, totalSales: 0.345 },
    });
    await assertFails(badSubHalalaBatch.commit());

    // Rejected: wrong total (0.1 + 0.2 = 0.31)
    const badMathBatch = mgrDb.batch();
    badMathBatch.update(mgrDb.doc(`closings/${closingId}`), {
      cashSales: 0.1,
      cardSales: 0.2,
      expenses: 0,
      totalSales: 0.31,
      remainingInBox: 0.1,
      netPeriod: 0.31,
      previousValues: { cashSales: 100, cardSales: 200, expenses: 50, totalSales: 300 },
      correctionReason: 'رفض إجمالي خاطئ',
      correctedBy: 'mgr_01',
      correctedByName: 'مدير المؤسسة الرئيسية',
      correctedAt: '2026-11-15T10:01:00Z',
      updatedAt: '2026-11-15T10:01:00Z',
    });
    badMathBatch.set(mgrDb.doc('auditLogs/log_halala_math_reject'), {
      id: 'log_halala_math_reject',
      orgId: 'org_main',
      actorId: 'mgr_01',
      actorName: 'مدير المؤسسة الرئيسية',
      actorRole: 'manager',
      action: 'CLOSING_ADMIN_CORRECTED',
      targetType: 'closing',
      targetId: closingId,
      details: 'اختبار رفض خطأ حسابي',
      timestamp: '2026-11-15T10:01:00Z',
      previousValues: { cashSales: 100, cardSales: 200, expenses: 50, totalSales: 300 },
      newValues: { cashSales: 0.1, cardSales: 0.2, expenses: 0, totalSales: 0.31 },
    });
    await assertFails(badMathBatch.commit());

    // Allowed: exact 0.1 + 0.2 = 0.30 and 0.1 - 0.05 = 0.05 using integer Halala rules
    const okBatch = mgrDb.batch();
    okBatch.update(mgrDb.doc(`closings/${closingId}`), {
      cashSales: 0.1,
      cardSales: 0.2,
      expenses: 0.05,
      totalSales: 0.3,
      remainingInBox: 0.05,
      netPeriod: 0.25,
      previousValues: { cashSales: 100, cardSales: 200, expenses: 50, totalSales: 300 },
      correctionReason: 'تصحيح بدقة الهللات 0.1 + 0.2 = 0.30',
      correctedBy: 'mgr_01',
      correctedByName: 'مدير المؤسسة الرئيسية',
      correctedAt: '2026-11-15T10:05:00Z',
      updatedAt: '2026-11-15T10:05:00Z',
    });
    okBatch.set(mgrDb.doc('auditLogs/log_halala_ok'), {
      id: 'log_halala_ok',
      orgId: 'org_main',
      actorId: 'mgr_01',
      actorName: 'مدير المؤسسة الرئيسية',
      actorRole: 'manager',
      action: 'CLOSING_ADMIN_CORRECTED',
      targetType: 'closing',
      targetId: closingId,
      details: 'تصحيح ناجح بدقة الهللات 0.1 + 0.2 = 0.30',
      timestamp: '2026-11-15T10:05:00Z',
      previousValues: { cashSales: 100, cardSales: 200, expenses: 50, totalSales: 300 },
      newValues: { cashSales: 0.1, cardSales: 0.2, expenses: 0.05, totalSales: 0.3 },
    });
    await assertSucceeds(okBatch.commit());
  });

  await testEnv.cleanup();

  const passedCount = outcomes.filter((o) => o.passed).length;
  const failedCount = outcomes.length - passedCount;

  console.log('\n========================================================================');
  console.log(`   SUMMARY: ${passedCount}/${outcomes.length} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runClosingArchivesTestSuite().catch((err) => {
  console.error('ClosingArchives Emulator test runner failure:', err);
  process.exit(1);
});
