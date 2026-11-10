import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import * as fs from 'fs';

let testEnv: RulesTestEnvironment;

async function runTestSuite() {
  console.log('================================================================');
  console.log('   STARTING FIRESTORE EMULATOR SECURITY & ACCOUNTING TESTS      ');
  console.log('   Testing Free Spark Architecture: Client runTransaction       ');
  console.log('================================================================\n');

  const rulesContent = fs.readFileSync('firestore.rules', 'utf8');

  // Initialize official rules test environment against running emulator
  testEnv = await initializeTestEnvironment({
    projectId: 'aleqfal-spark-security-tests',
    firestore: {
      rules: rulesContent,
      host: '127.0.0.1',
      port: 8080,
    },
  });

  // Clear emulator data before testing
  await testEnv.clearFirestore();

  // Setup initial mock documents with admin/security bypass
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    // 1. Setup Organizations
    await db.doc('organizations/org_main').set({
      id: 'org_main',
      name: 'مؤسسة التجارة الحديثة',
      ownerId: 'mgr_01',
      currency: 'SAR',
      createdAt: '2026-11-10T00:00:00Z',
    });

    await db.doc('organizations/org_other').set({
      id: 'org_other',
      name: 'مؤسسة المنافس',
      ownerId: 'mgr_other',
      currency: 'SAR',
      createdAt: '2026-11-10T00:00:00Z',
    });

    // 2. Setup Users
    await db.doc('users/mgr_01').set({
      uid: 'mgr_01',
      orgId: 'org_main',
      displayName: 'المدير العام',
      role: 'manager',
      isActive: true,
      createdAt: '2026-11-10T00:00:00Z',
    });

    await db.doc('users/mgr_other').set({
      uid: 'mgr_other',
      orgId: 'org_other',
      displayName: 'مدير المؤسسة المنافسة',
      role: 'manager',
      isActive: true,
      createdAt: '2026-11-10T00:00:00Z',
    });

    await db.doc('users/emp_01').set({
      uid: 'emp_01',
      orgId: 'org_main',
      branchId: 'br_01',
      displayName: 'كاشير الفرع 1',
      role: 'employee',
      isActive: true,
      createdAt: '2026-11-10T00:00:00Z',
    });

    await db.doc('users/emp_disabled').set({
      uid: 'emp_disabled',
      orgId: 'org_main',
      branchId: 'br_01',
      displayName: 'موظف موقف',
      role: 'employee',
      isActive: false,
      createdAt: '2026-11-10T00:00:00Z',
    });

    // 3. Setup Closings in different states
    // A: Approved Closing for correction testing
    await db.doc('closings/cls_approved_01').set({
      id: 'cls_approved_01',
      orgId: 'org_main',
      branchId: 'br_01',
      branchName: 'الفرع الرئيسي',
      employeeId: 'emp_01',
      employeeName: 'كاشير الفرع 1',
      date: '2026-11-10',
      period: 'morning',
      cashSales: 1500,
      cardSales: 2500,
      totalSales: 4000,
      expenses: 300,
      remainingInBox: 1200,
      netPeriod: 3700,
      status: 'approved',
      createdAt: '2026-11-10T08:00:00Z',
      updatedAt: '2026-11-10T12:00:00Z',
    });

    // B: Pending Review Closing (Ready for review transition)
    await db.doc('closings/cls_pending_01').set({
      id: 'cls_pending_01',
      orgId: 'org_main',
      branchId: 'br_01',
      branchName: 'الفرع الرئيسي',
      employeeId: 'emp_01',
      employeeName: 'كاشير الفرع 1',
      date: '2026-11-10',
      period: 'evening',
      cashSales: 1000,
      cardSales: 2000,
      totalSales: 3000,
      expenses: 100,
      remainingInBox: 900,
      netPeriod: 2900,
      status: 'pending_review',
      createdAt: '2026-11-10T14:00:00Z',
      updatedAt: '2026-11-10T14:00:00Z',
    });

    // 4. Setup Existing Audit Log
    await db.doc('auditLogs/log_existing_01').set({
      id: 'log_existing_01',
      orgId: 'org_main',
      actorId: 'mgr_01',
      actorName: 'المدير العام',
      actorRole: 'manager',
      action: 'ORGANIZATION_ESTABLISHED',
      targetType: 'organization',
      targetId: 'org_main',
      details: 'تأسيس المؤسسة رسمياً',
      timestamp: '2026-11-10T00:00:00Z',
    });
  });

  console.log('✔ Test Environment & Seed Data Loaded Successfully.\n');

  // -------------------------------------------------------------------------------------------------
  // 1. نجاح التصحيح الإداري المشروع (Legitimate Admin Correction via Batch/Transaction)
  // -------------------------------------------------------------------------------------------------
  try {
    const mgrDb = testEnv.authenticatedContext('mgr_01').firestore();
    const batch = mgrDb.batch();

    const closingRef = mgrDb.doc('closings/cls_approved_01');
    const logRef = mgrDb.doc('auditLogs/log_correct_legit_01');

    const previousSnapshot = {
      cashSales: 1500,
      cardSales: 2500,
      expenses: 300,
      totalSales: 4000,
    };

    batch.update(closingRef, {
      cashSales: 1800,
      cardSales: 2500,
      expenses: 300,
      totalSales: 4300,
      remainingInBox: 1500,
      netPeriod: 4000,
      previousValues: previousSnapshot,
      correctionReason: 'تصحيح عجز كاشير وإعادة تدقيق فواتير مسائية',
      correctedBy: 'mgr_01',
      correctedByName: 'المدير العام',
      correctedAt: '2026-11-10T16:00:00Z',
      updatedAt: '2026-11-10T16:00:00Z',
    });

    batch.set(logRef, {
      id: 'log_correct_legit_01',
      orgId: 'org_main',
      action: 'CLOSING_ADMIN_CORRECTED',
      targetType: 'closing',
      targetId: 'cls_approved_01',
      actorId: 'mgr_01',
      actorName: 'المدير العام',
      actorRole: 'manager',
      details: 'تصحيح مبيعات نقدية معتمدة وفق مستندات الجرد',
      timestamp: '2026-11-10T16:00:00Z',
      previousValues: previousSnapshot,
      newValues: {
        cashSales: 1800,
        cardSales: 2500,
        expenses: 300,
        totalSales: 4300,
      },
    });

    await assertSucceeds(batch.commit());
    console.log('✔ Test 1 PASSED: Legitimate admin correction succeeded atomically.');
  } catch (err: any) {
    console.error('✖ Test 1 FAILED:', err.message);
    process.exit(1);
  }

  // -------------------------------------------------------------------------------------------------
  // 2. فشل تصحيح الموظف للإقفال المعتمد (Employee cannot correct approved closing)
  // -------------------------------------------------------------------------------------------------
  try {
    const empDb = testEnv.authenticatedContext('emp_01').firestore();
    await assertFails(
      empDb.doc('closings/cls_approved_01').update({
        cashSales: 9999,
        correctionReason: 'محاولة تعديل غير مصرح بها من الموظف',
      })
    );
    console.log('✔ Test 2 PASSED: Employee cannot modify approved closing directly.');
  } catch (err: any) {
    console.error('✖ Test 2 FAILED:', err.message);
    process.exit(1);
  }

  // -------------------------------------------------------------------------------------------------
  // 3. فشل تصحيح مدير من مؤسسة أخرى (Tenant Isolation: Cross-org manager fails)
  // -------------------------------------------------------------------------------------------------
  try {
    const otherMgrDb = testEnv.authenticatedContext('mgr_other').firestore();
    const batch = otherMgrDb.batch();

    batch.update(otherMgrDb.doc('closings/cls_approved_01'), {
      cashSales: 2000,
      correctionReason: 'محاولة تصحيح من مدير مؤسسة أخرى',
      correctedBy: 'mgr_other',
    });

    await assertFails(batch.commit());
    console.log('✔ Test 3 PASSED: Manager from another organization cannot correct closing.');
  } catch (err: any) {
    console.error('✖ Test 3 FAILED:', err.message);
    process.exit(1);
  }

  // -------------------------------------------------------------------------------------------------
  // 4. فشل التصحيح دون سبب (Missing or too short correction reason)
  // -------------------------------------------------------------------------------------------------
  try {
    const mgrDb = testEnv.authenticatedContext('mgr_01').firestore();
    await assertFails(
      mgrDb.doc('closings/cls_approved_01').update({
        cashSales: 1900,
        correctionReason: 'قصير', // less than 5 characters
        correctedBy: 'mgr_01',
      })
    );
    console.log('✔ Test 4 PASSED: Admin correction without valid reason (>=5 chars) fails.');
  } catch (err: any) {
    console.error('✖ Test 4 FAILED:', err.message);
    process.exit(1);
  }

  // -------------------------------------------------------------------------------------------------
  // 5. فشل التصحيح دون سجل تدقيق مطابق (Missing atomic audit log)
  // -------------------------------------------------------------------------------------------------
  try {
    const mgrDb = testEnv.authenticatedContext('mgr_01').firestore();
    // Trying to update closing with mathematical values but with fake/missing audit log link
    const fakeLogRef = mgrDb.doc('auditLogs/log_fake_01');
    const batch = mgrDb.batch();

    batch.update(mgrDb.doc('closings/cls_approved_01'), {
      cashSales: 1900,
      totalSales: 4400,
      remainingInBox: 1600,
      netPeriod: 4100,
      correctionReason: 'تصحيح دون سجل تدقيق مطابق تماماً',
      correctedBy: 'mgr_01',
      previousValues: { cashSales: 1800, cardSales: 2500, expenses: 300, totalSales: 4300 },
    });

    // Logging wrong action type instead of CLOSING_ADMIN_CORRECTED
    batch.set(fakeLogRef, {
      id: 'log_fake_01',
      orgId: 'org_main',
      action: 'ORGANIZATION_ESTABLISHED', // Invalid action for closing correction
      targetType: 'closing',
      targetId: 'cls_approved_01',
      actorId: 'mgr_01',
      actorName: 'المدير العام',
      actorRole: 'manager',
      details: 'محاولة كتابة سجل غير مطابق',
      timestamp: '2026-11-10T16:05:00Z',
    });

    await assertFails(batch.commit());
    console.log('✔ Test 5 PASSED: Admin correction without matching atomic audit log fails.');
  } catch (err: any) {
    console.error('✖ Test 5 FAILED:', err.message);
    process.exit(1);
  }

  // -------------------------------------------------------------------------------------------------
  // 6. فشل تزوير previousValues (Forged previous values snapshot)
  // -------------------------------------------------------------------------------------------------
  try {
    const mgrDb = testEnv.authenticatedContext('mgr_01').firestore();
    const batch = mgrDb.batch();

    batch.update(mgrDb.doc('closings/cls_approved_01'), {
      cashSales: 2000,
      totalSales: 4500,
      remainingInBox: 1700,
      netPeriod: 4200,
      correctionReason: 'تصحيح بقيم سابقة مزورة',
      correctedBy: 'mgr_01',
      previousValues: {
        cashSales: 9999, // FORGED: Actual current cashSales in doc is 1800
        cardSales: 2500,
        expenses: 300,
        totalSales: 12499,
      },
    });

    await assertFails(batch.commit());
    console.log('✔ Test 6 PASSED: Tampering with previousValues snapshot is blocked.');
  } catch (err: any) {
    console.error('✖ Test 6 FAILED:', err.message);
    process.exit(1);
  }

  // -------------------------------------------------------------------------------------------------
  // 7. فشل تغيير الحقول التاريخية (Immutable historical fields)
  // -------------------------------------------------------------------------------------------------
  try {
    const mgrDb = testEnv.authenticatedContext('mgr_01').firestore();
    // Attempting to change branchId or date during correction
    await assertFails(
      mgrDb.doc('closings/cls_approved_01').update({
        branchId: 'br_tampered_99',
        correctionReason: 'محاولة تعديل الفرع التاريخي',
        correctedBy: 'mgr_01',
      })
    );

    await assertFails(
      mgrDb.doc('closings/cls_approved_01').update({
        date: '2026-01-01',
        correctionReason: 'محاولة تعديل التاريخ التاريخي',
        correctedBy: 'mgr_01',
      })
    );

    console.log('✔ Test 7 PASSED: Tampering with historical fields (branchId, date) is strictly blocked.');
  } catch (err: any) {
    console.error('✖ Test 7 FAILED:', err.message);
    process.exit(1);
  }

  // -------------------------------------------------------------------------------------------------
  // 8. فشل تعديل أو حذف سجل التدقيق (Strict immutability of audit logs)
  // -------------------------------------------------------------------------------------------------
  try {
    const mgrDb = testEnv.authenticatedContext('mgr_01').firestore();
    const empDb = testEnv.authenticatedContext('emp_01').firestore();

    // 1. Manager attempts to delete an audit log
    await assertFails(mgrDb.doc('auditLogs/log_existing_01').delete());

    // 2. Manager attempts to edit an audit log
    await assertFails(mgrDb.doc('auditLogs/log_existing_01').update({ details: 'تعديل مزور' }));

    // 3. Employee attempts to delete an audit log
    await assertFails(empDb.doc('auditLogs/log_existing_01').delete());

    console.log('✔ Test 8 PASSED: Audit logs are completely immutable (cannot be updated or deleted).');
  } catch (err: any) {
    console.error('✖ Test 8 FAILED:', err.message);
    process.exit(1);
  }

  // -------------------------------------------------------------------------------------------------
  // 9. فشل وصول الحساب المعطل (Disabled employee cannot access data)
  // -------------------------------------------------------------------------------------------------
  try {
    const disabledDb = testEnv.authenticatedContext('emp_disabled').firestore();

    // Disabled employee trying to read closings
    await assertFails(disabledDb.doc('closings/cls_approved_01').get());

    // Disabled employee trying to write a closing
    await assertFails(
      disabledDb.doc('closings/cls_new_01').set({
        id: 'cls_new_01',
        orgId: 'org_main',
        branchId: 'br_01',
        employeeId: 'emp_disabled',
        status: 'draft',
      })
    );

    console.log('✔ Test 9 PASSED: Disabled account access is completely rejected by security rules.');
  } catch (err: any) {
    console.error('✖ Test 9 FAILED:', err.message);
    process.exit(1);
  }

  // -------------------------------------------------------------------------------------------------
  // 10. نجاح الاعتماد الطبيعي للإقفال (Legitimate Approval Transition with Audit Log)
  // -------------------------------------------------------------------------------------------------
  try {
    const mgrDb = testEnv.authenticatedContext('mgr_01').firestore();
    const batch = mgrDb.batch();

    const closingRef = mgrDb.doc('closings/cls_pending_01');
    const logRef = mgrDb.doc('auditLogs/log_approve_pending_01');

    batch.update(closingRef, {
      status: 'approved',
      reviewedBy: 'mgr_01',
      reviewedByName: 'المدير العام',
      reviewedAt: '2026-11-10T16:10:00Z',
      updatedAt: '2026-11-10T16:10:00Z',
    });

    batch.set(logRef, {
      id: 'log_approve_pending_01',
      orgId: 'org_main',
      action: 'CLOSING_APPROVED',
      targetType: 'closing',
      targetId: 'cls_pending_01',
      actorId: 'mgr_01',
      actorName: 'المدير العام',
      actorRole: 'manager',
      details: 'اعتماد رسمي للإقفال المسائي بعد المراجعة والمطابقة',
      timestamp: '2026-11-10T16:10:00Z',
    });

    await assertSucceeds(batch.commit());
    console.log('✔ Test 10 PASSED: Normal closing approval with atomic state transition succeeded.');
  } catch (err: any) {
    console.error('✖ Test 10 FAILED:', err.message);
    process.exit(1);
  }

  // -------------------------------------------------------------------------------------------------
  // 11. نجاح تأسيس المؤسسة الأولي بالدفعة الذرية (Organization Onboarding Batch)
  // -------------------------------------------------------------------------------------------------
  try {
    const newOwnerUid = 'new_owner_99';
    const newOwnerDb = testEnv.authenticatedContext(newOwnerUid).firestore();
    const batch = newOwnerDb.batch();

    const newOrgId = 'org_new_owner_99_mwb1';
    const newBranchId = 'br_new_01';
    const newLogId = 'log_estab_01';

    batch.set(newOwnerDb.doc(`organizations/${newOrgId}`), {
      id: newOrgId,
      name: 'مؤسسة الرياض التجارية',
      commercialRegistration: '1010123456',
      activityType: 'retail',
      currency: 'SAR',
      ownerId: newOwnerUid,
      ownerEmail: 'owner@example.com',
      ownerName: 'المالك الجديد',
      driveConnected: false,
      createdAt: '2026-11-10T16:20:00Z',
      updatedAt: '2026-11-10T16:20:00Z',
    });

    batch.set(newOwnerDb.doc(`branches/${newBranchId}`), {
      id: newBranchId,
      orgId: newOrgId,
      name: 'الفرع الرئيسي',
      code: 'B-01',
      address: 'طريق الملك فهد',
      isActive: true,
      createdAt: '2026-11-10T16:20:00Z',
    });

    batch.set(newOwnerDb.doc(`users/${newOwnerUid}`), {
      uid: newOwnerUid,
      orgId: newOrgId,
      email: 'owner@example.com',
      displayName: 'المالك الجديد',
      role: 'manager',
      isActive: true,
      permissions: {
        canCreateClosing: true,
        canViewAllClosings: true,
        canApproveClosings: true,
        canManageBranches: true,
        canManageEmployees: true,
        canExportReports: true,
      },
      createdAt: '2026-11-10T16:20:00Z',
    });

    batch.set(newOwnerDb.doc(`auditLogs/${newLogId}`), {
      id: newLogId,
      orgId: newOrgId,
      actorId: newOwnerUid,
      actorName: 'المالك الجديد',
      actorRole: 'manager',
      action: 'ORGANIZATION_ESTABLISHED',
      targetType: 'organization',
      targetId: newOrgId,
      details: 'تم تأسيس المؤسسة بنجاح مع الفرع الرئيسي',
      timestamp: '2026-11-10T16:20:00Z',
    });

    await assertSucceeds(batch.commit());
    console.log('✔ Test 11 PASSED: Brand new owner successfully completes organization onboarding batch.');
  } catch (err: any) {
    console.error('✖ Test 11 FAILED:', err.message);
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('   ALL 11 MANDATORY SECURITY & ACCOUNTING TESTS PASSED 100%     ');
  console.log('================================================================');

  await testEnv.cleanup();
}

runTestSuite().catch((e) => {
  console.error('Emulator test runner failure:', e);
  process.exit(1);
});
