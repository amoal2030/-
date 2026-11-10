import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

export interface AdminCorrectClosingPayload {
  closingId: string;
  cashSales: number;
  cardSales: number;
  expenses: number;
  correctionReason: string;
}

// Maximum allowed financial amount per shift closing (100,000,000.00 SAR = 10 Billion Halalas)
// Safe within JavaScript Number.MAX_SAFE_INTEGER (9,007,199,254,740,991)
export const MAX_SAFE_AMOUNT_SAR = 100_000_000.0;
export const MAX_SAFE_HALALAS = 10_000_000_000;

/**
 * Cloud Function: adminCorrectClosing
 * Secure, Server-Side, Concurrency-Safe Administrative Shift Closing Correction
 * Enforces all 12 enterprise accounting and security invariants.
 */
export const adminCorrectClosing = functions.https.onCall(
  async (data: AdminCorrectClosingPayload, context) => {
    // 1. Verify caller authentication strictly from cryptographic context
    if (!context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'يجب تسجيل الدخول كمدير معتمد لتنفيذ هذا الإجراء.'
      );
    }

    const callerUid = context.auth.uid;
    const db = admin.firestore();

    // 2. Validate input parameters
    const { closingId, cashSales, cardSales, expenses, correctionReason } = data;

    if (!closingId || typeof closingId !== 'string' || closingId.trim().length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'معرف الإقفال غير صحيح.');
    }

    if (
      !correctionReason ||
      typeof correctionReason !== 'string' ||
      correctionReason.trim().length < 5 ||
      correctionReason.trim().length > 1000
    ) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'يجب كتابة سبب التصحيح الإداري المبرر لتعديل إقفال معتمد (بين 5 و 1000 حرف).'
      );
    }

    // 5, 6, 7 & 8: Validate financial numbers rigorously
    const amounts = [
      { name: 'النقد (cashSales)', val: cashSales },
      { name: 'الشبكة (cardSales)', val: cardSales },
      { name: 'المصروفات (expenses)', val: expenses },
    ];

    for (const item of amounts) {
      // Must be finite number (rejects NaN, Infinity, -Infinity, strings, null, undefined)
      if (typeof item.val !== 'number' || !Number.isFinite(item.val)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          `قيمة ${item.name} غير صالحة حسابياً (ليست عدداً حقيقياً منتهياً).`
        );
      }

      // Non-negative
      if (item.val < 0) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          `قيمة ${item.name} لا يمكن أن تكون سالبة.`
        );
      }

      // Maximum limit check
      if (item.val > MAX_SAFE_AMOUNT_SAR) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          `قيمة ${item.name} تتجاوز الحد الأقصى المسموح به للنظام (${MAX_SAFE_AMOUNT_SAR.toLocaleString('en-US')} ريال).`
        );
      }
    }

    // Convert to Integer Halalas and verify Number.isSafeInteger
    const toHalalas = (val: number): number => {
      const halalas = Math.round((val + Number.EPSILON) * 100);
      if (!Number.isSafeInteger(halalas) || halalas > MAX_SAFE_HALALAS) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'قيمة المبلغ تتجاوز حدود الأعداد الصحيحة الآمنة بالهللات.'
        );
      }
      return halalas;
    };

    const cashH = toHalalas(cashSales);
    const cardH = toHalalas(cardSales);
    const expH = toHalalas(expenses);

    // Recompute all totals server-side (do NOT trust client-sent sums)
    const totalH = cashH + cardH;
    const remBoxH = cashH - expH;
    const netH = totalH - expH;

    // Operation-Wide Financial Limit Validation:
    // 1. Total sales cannot exceed the system-wide operation ceiling (100 Million SAR = 10 Billion Halalas)
    if (totalH > MAX_SAFE_HALALAS) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `إجمالي المبيعات المحسوبة (${(totalH / 100).toLocaleString('en-US')} ريال) يتجاوز الحد الأقصى المسموح به للعملية (${MAX_SAFE_AMOUNT_SAR.toLocaleString('en-US')} ريال).`
      );
    }

    // 2. Strict Safe Integer and Bounds Check on all computed Halala values
    if (!Number.isSafeInteger(totalH) || totalH < 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'ناتج إجمالي المبيعات بالهللات غير صالح أو تجاوز حدود الأرقام الآمنة.'
      );
    }

    if (!Number.isSafeInteger(remBoxH) || Math.abs(remBoxH) > MAX_SAFE_HALALAS) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'ناتج المتبقي في الصندوق تجاوز حدود الأرقام الآمنة بالهللات.'
      );
    }

    if (!Number.isSafeInteger(netH) || Math.abs(netH) > MAX_SAFE_HALALAS) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'ناتج صافي الفترة تجاوز حدود الأرقام الآمنة بالهللات.'
      );
    }

    // 3. Final decimal conversions and Number.isFinite validation on all outputs
    const calcCashSales = cashH / 100;
    const calcCardSales = cardH / 100;
    const calcExpenses = expH / 100;
    const calcTotalSales = totalH / 100;
    const calcRemainingInBox = remBoxH / 100;
    const calcNetPeriod = netH / 100;

    const allResults = [
      calcCashSales,
      calcCardSales,
      calcExpenses,
      calcTotalSales,
      calcRemainingInBox,
      calcNetPeriod,
    ];

    for (const res of allResults) {
      if (!Number.isFinite(res) || isNaN(res)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'حدث خطأ في تحويل النتائج الحسابية النهائية (قيمة غير منتهية).'
        );
      }
    }

    const closingRef = db.collection('closings').doc(closingId);
    const userRef = db.collection('users').doc(callerUid);

    // 9. Cryptographically unique ID for audit log
    const auditLogId = `log_adm_${crypto.randomUUID().replace(/-/g, '')}`;
    const auditLogRef = db.collection('auditLogs').doc(auditLogId);
    const nowIso = new Date().toISOString();

    // 11 & 12. Execute single server-side Firestore transaction with concurrency protection
    return await db.runTransaction(async (transaction) => {
      // Step A: Read User Profile
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new functions.https.HttpsError('permission-denied', 'ملف المستخدم غير موجود.');
      }
      const userData = userDoc.data()!;

      // 2. Verify role == 'manager' and isActive == true
      if (userData.role !== 'manager' || userData.isActive !== true) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'هذا الإجراء متاح حصراً للمدير العام النشط في المؤسسة.'
        );
      }

      const managerOrgId = userData.orgId;

      // Step B: Read Target Closing
      const closingDoc = await transaction.get(closingRef);
      if (!closingDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'سجل الإقفال غير موجود.');
      }
      const closingData = closingDoc.data()!;

      // 3. Verify tenant isolation (orgId match)
      if (closingData.orgId !== managerOrgId) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'لا يحق للمدير تصحيح إقفالات تابعة لمؤسسة أخرى.'
        );
      }

      // 4. Verify status is currently approved
      if (closingData.status !== 'approved') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'التصحيح الإداري مخصص فقط للإقفالات المعتمدة. للإقفالات غير المعتمدة يرجى استخدام شاشة المراجعة.'
        );
      }

      // 10. Store complete previous AND new values in audit log
      const previousSnapshot = {
        cashSales: closingData.cashSales,
        cardSales: closingData.cardSales,
        expenses: closingData.expenses,
        totalSales: closingData.totalSales,
        remainingInBox: closingData.remainingInBox,
        netPeriod: closingData.netPeriod,
      };

      const newSnapshot = {
        cashSales: calcCashSales,
        cardSales: calcCardSales,
        expenses: calcExpenses,
        totalSales: calcTotalSales,
        remainingInBox: calcRemainingInBox,
        netPeriod: calcNetPeriod,
      };

      // Step D: Prepare Atomic Writes
      const updatePayload = {
        cashSales: calcCashSales,
        cardSales: calcCardSales,
        expenses: calcExpenses,
        totalSales: calcTotalSales,
        remainingInBox: calcRemainingInBox,
        netPeriod: calcNetPeriod,
        previousValues: previousSnapshot,
        correctionReason: correctionReason.trim(),
        correctedBy: callerUid,
        correctedByName: userData.displayName || 'المدير العام',
        correctedAt: nowIso,
        updatedAt: nowIso,
      };

      const auditPayload = {
        id: auditLogId,
        orgId: managerOrgId,
        actorId: callerUid,
        actorName: userData.displayName || 'المدير العام',
        actorRole: 'manager',
        action: 'CLOSING_ADMIN_CORRECTED',
        targetType: 'closing',
        targetId: closingId,
        details: `تصحيح إداري لإقفال معتمد (${closingData.branchName} - ${closingData.date}): المبيعات السابقة ${previousSnapshot.totalSales} أصبحت ${calcTotalSales}. مبرر التصحيح: ${correctionReason.trim()}`,
        previousValues: previousSnapshot,
        newValues: newSnapshot,
        timestamp: nowIso,
      };

      // Atomic commit: update closing and create audit log in the exact same transaction
      transaction.update(closingRef, updatePayload);
      transaction.set(auditLogRef, auditPayload);

      return {
        success: true,
        closingId,
        previousSnapshot,
        newSnapshot,
        auditLogId,
      };
    });
  }
);
