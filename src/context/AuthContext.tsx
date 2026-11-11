import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  db,
  googleProvider,
  getSecondaryAuth,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
} from '../lib/firebase';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  serverTimestamp,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { Organization, UserProfile, Branch, AuditLog, ShiftClosing, ClosingStatus } from '../types';
import {
  calculateShiftTotals,
  generateDeterministicClosingId,
} from '../utils/accounting';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  currentOrg: Organization | null;
  branches: Branch[];
  currentBranch: Branch | null;
  employees: UserProfile[];
  closings: ShiftClosing[];
  auditLogs: AuditLog[];
  loading: boolean;
  needsOnboarding: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmailPassword: (email: string, pass: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  completeOrganizationSetup: (data: {
    orgName: string;
    activityType: string;
    currency: string;
    commercialRegistration?: string;
    firstBranchName: string;
    firstBranchAddress?: string;
  }) => Promise<void>;
  addBranch: (data: { name: string; address?: string; phone?: string; code?: string }) => Promise<Branch>;
  createEmployeeAccount: (data: {
    email: string;
    password: string;
    displayName: string;
    branchId: string;
    branchName: string;
    phone?: string;
  }) => Promise<UserProfile>;
  toggleEmployeeStatus: (employeeUid: string, isActive: boolean) => Promise<void>;
  updateEmployeeBranch: (employeeUid: string, branchId: string, branchName: string) => Promise<void>;
  submitShiftClosing: (data: {
    branchId: string;
    branchName: string;
    date: string;
    period: 'morning' | 'evening';
    cashSales: number;
    cardSales: number;
    expenses: number;
    notes?: string;
    status: 'draft' | 'pending_review';
  }) => Promise<ShiftClosing>;
  reviewShiftClosing: (
    closingId: string,
    action: 'approve' | 'reject',
    rejectionReason?: string
  ) => Promise<void>;
  adminCorrectClosing: (data: {
    closingId: string;
    cashSales: number;
    cardSales: number;
    expenses: number;
    correctionReason: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshTenantData: () => Promise<void>;
  setCurrentBranch: (branch: Branch) => void;
  authNotice: { type: 'info' | 'warning' | 'error'; message: string } | null;
  clearAuthNotice: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [closings, setClosings] = useState<ShiftClosing[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [authNotice, setAuthNotice] = useState<{ type: 'info' | 'warning' | 'error'; message: string } | null>(null);

  const clearAuthNotice = () => setAuthNotice(null);

  useEffect(() => {
    testFirestoreConnection();
  }, []);

  useEffect(() => {
    // Process redirect sign-in result if returning from a mobile redirect flow
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          setCurrentUser(result.user);
          await loadUserData(result.user);
        }
      })
      .catch((error) => {
        console.warn('Redirect sign-in resolution notice:', error?.message);
      });

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setCurrentUser(fbUser);
      if (fbUser) {
        await loadUserData(fbUser);
      } else {
        setUserProfile(null);
        setCurrentOrg(null);
        setBranches([]);
        setCurrentBranch(null);
        setEmployees([]);
        setClosings([]);
        setAuditLogs([]);
        setNeedsOnboarding(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to organization closings and employees ONLY when user profile is verified and active
  useEffect(() => {
    if (!currentOrg?.id || !currentUser?.uid || !userProfile || !userProfile.isActive) return;
    if (userProfile.orgId !== currentOrg.id) return;

    // 1. Closings snapshot listener (scoped to orgId)
    const closingsRef = collection(db, 'closings');
    const closingsQuery = query(closingsRef, where('orgId', '==', currentOrg.id));
    const unsubClosings = onSnapshot(
      closingsQuery,
      (snapshot) => {
        const loaded: ShiftClosing[] = [];
        snapshot.forEach((doc) => {
          loaded.push(doc.data() as ShiftClosing);
        });
        loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setClosings(loaded);
      },
      (error) => {
        console.warn('Real-time closings notice:', error?.message);
      }
    );

    // 2. Real-time active status enforcement for the current user
    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubSelf = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          if (data.role === 'employee' && data.isActive === false) {
            // Instantly terminate disabled session without window.alert
            signOut(auth).then(() => {
              setUserProfile(null);
              setCurrentOrg(null);
              setAuthNotice({
                type: 'error',
                message: 'تم تعطيل هذا الحساب من قبل إدارة المؤسسة. تم إنهاء الجلسة فوراً.',
              });
            });
          }
        }
      },
      (error) => {
        console.warn('User status listener notice:', error?.message);
      }
    );

    // 3. Employees snapshot listener (for verified Manager only)
    let unsubUsers = () => {};
    if (userProfile.role === 'manager') {
      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef, where('orgId', '==', currentOrg.id));
      unsubUsers = onSnapshot(
        usersQuery,
        (snapshot) => {
          const loaded: UserProfile[] = [];
          snapshot.forEach((doc) => {
            loaded.push(doc.data() as UserProfile);
          });
          setEmployees(loaded);
        },
        (error) => {
          console.warn('Employees listener notice:', error?.message);
        }
      );
    }

    // 4. Audit logs snapshot listener (for verified Manager only)
    let unsubLogs = () => {};
    if (userProfile.role === 'manager') {
      const logsRef = collection(db, 'auditLogs');
      const logsQuery = query(logsRef, where('orgId', '==', currentOrg.id));
      unsubLogs = onSnapshot(
        logsQuery,
        (snapshot) => {
          const loaded: AuditLog[] = [];
          snapshot.forEach((doc) => {
            loaded.push(doc.data() as AuditLog);
          });
          loaded.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setAuditLogs(loaded);
        },
        (error) => {
          console.warn('Audit logs listener notice:', error?.message);
        }
      );
    }

    return () => {
      unsubClosings();
      unsubSelf();
      unsubUsers();
      unsubLogs();
    };
  }, [currentOrg?.id, currentUser?.uid, userProfile?.role, userProfile?.isActive, userProfile?.orgId]);

  const loadUserData = async (fbUser: FirebaseUser) => {
    setLoading(true);
    try {
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const profile = userDocSnap.data() as UserProfile;

        // CRITICAL SECURITY ENFORCEMENT: Block disabled employees immediately
        if (profile.role === 'employee' && profile.isActive === false) {
          await signOut(auth);
          setUserProfile(null);
          setCurrentOrg(null);
          setLoading(false);
          setAuthNotice({
            type: 'error',
            message: 'تم تعطيل هذا الحساب من قبل إدارة المؤسسة. يرجى مراجعة المدير العام.',
          });
          return;
        }

        setUserProfile(profile);

        if (profile.orgId) {
          const orgDocRef = doc(db, 'organizations', profile.orgId);
          const orgSnap = await getDoc(orgDocRef);
          if (orgSnap.exists()) {
            setCurrentOrg(orgSnap.data() as Organization);
          }

          const branchesRef = collection(db, 'branches');
          const q = query(branchesRef, where('orgId', '==', profile.orgId));
          const branchesSnap = await getDocs(q);
          const loadedBranches: Branch[] = [];
          branchesSnap.forEach((b) => loadedBranches.push(b.data() as Branch));
          setBranches(loadedBranches);

          if (profile.role === 'employee' && profile.branchId) {
            const assigned = loadedBranches.find((b) => b.id === profile.branchId);
            setCurrentBranch(assigned || loadedBranches[0] || null);
          } else {
            setCurrentBranch(loadedBranches[0] || null);
          }

          setNeedsOnboarding(false);
        } else {
          setNeedsOnboarding(true);
        }
      } else {
        // Explicit distinction: User genuinely has no document yet -> Onboarding
        setUserProfile(null);
        setCurrentOrg(null);
        setNeedsOnboarding(true);
      }
    } catch (error: any) {
      console.warn('Notice loading user tenant data:', error?.message || error);
      const isPermissionDenied =
        error?.code === 'permission-denied' ||
        String(error?.message).includes('insufficient permissions');

      if (isPermissionDenied) {
        // Do NOT treat permission-denied as a new user!
        setNeedsOnboarding(false);
        setAuthNotice({
          type: 'error',
          message: 'تم رفض الوصول الأمني للبيانات (Permission Denied). يرجى مراجعة مسؤول المؤسسة.',
        });
      } else {
        setAuthNotice({
          type: 'warning',
          message: 'تعذر الاتصال بقاعدة البيانات مؤقتاً. يرجى التحقق من اتصال الإنترنت.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await loadUserData(result.user);
      }
    } catch (error: any) {
      console.warn('Google sign-in attempt warning:', error?.code, error?.message);
      // Fallback for mobile devices where popup blocker is active
      if (error?.code === 'auth/popup-blocked') {
        console.info('Popup was blocked by mobile browser. Falling back to signInWithRedirect...');
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr) {
          console.error('Redirect sign-in error:', redirectErr);
          throw redirectErr;
        }
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmailPassword = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
      if (result.user) {
        await loadUserData(result.user);
      }
    } catch (error: any) {
      console.error('Email sign-in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw error;
    }
  };

  const completeOrganizationSetup = async (data: {
    orgName: string;
    activityType: string;
    currency: string;
    commercialRegistration?: string;
    firstBranchName: string;
    firstBranchAddress?: string;
  }) => {
    if (!auth.currentUser) throw new Error('No authenticated user');

    setLoading(true);
    const uid = auth.currentUser.uid;
    const email = auth.currentUser.email || '';
    const name = auth.currentUser.displayName || data.orgName;

    const orgId = `org_${uid.slice(0, 8)}_${Date.now().toString(36)}`;
    const branchId = `br_${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();

    const newOrg: Organization = {
      id: orgId,
      name: data.orgName.trim(),
      commercialRegistration: data.commercialRegistration?.trim() || '',
      activityType: data.activityType,
      currency: data.currency,
      ownerId: uid,
      ownerEmail: email,
      ownerName: name,
      driveConnected: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const newBranch: Branch = {
      id: branchId,
      orgId: orgId,
      name: data.firstBranchName.trim(),
      code: 'B-01',
      address: data.firstBranchAddress?.trim() || '',
      isActive: true,
      createdAt: nowIso,
    };

    const newProfile: UserProfile = {
      uid,
      orgId,
      email,
      displayName: name,
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
      createdAt: nowIso,
    };

    const auditEntry: AuditLog = {
      id: `log_${Date.now()}`,
      orgId,
      actorId: uid,
      actorName: name,
      actorRole: 'manager',
      action: 'ORGANIZATION_ESTABLISHED',
      targetType: 'organization',
      targetId: orgId,
      details: `تم تأسيس المؤسسة بنجاح مع الفرع الرئيسي: ${newBranch.name}`,
      timestamp: nowIso,
    };

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'organizations', orgId), newOrg);
      batch.set(doc(db, 'branches', branchId), newBranch);
      batch.set(doc(db, 'users', uid), newProfile);
      batch.set(doc(db, 'auditLogs', auditEntry.id), auditEntry);

      await batch.commit();

      setCurrentOrg(newOrg);
      setBranches([newBranch]);
      setCurrentBranch(newBranch);
      setUserProfile(newProfile);
      setNeedsOnboarding(false);
    } catch (error) {
      console.error('Failed to complete organization setup:', error);
      handleFirestoreError(error, OperationType.WRITE, `organizations/${orgId}`);
    } finally {
      setLoading(false);
    }
  };

  const addBranch = async (data: {
    name: string;
    address?: string;
    phone?: string;
    code?: string;
  }): Promise<Branch> => {
    if (!currentOrg || !userProfile || userProfile.role !== 'manager') {
      throw new Error('Only managers can create branches');
    }

    const branchId = `br_${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();
    const branchCode = data.code || `B-0${branches.length + 1}`;

    const newBranch: Branch = {
      id: branchId,
      orgId: currentOrg.id,
      name: data.name.trim(),
      code: branchCode,
      address: data.address?.trim() || '',
      phone: data.phone?.trim() || '',
      isActive: true,
      createdAt: nowIso,
    };

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'branches', branchId), newBranch);

      const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const logRef = doc(db, 'auditLogs', logId);
      batch.set(logRef, {
        id: logId,
        orgId: currentOrg.id,
        actorId: userProfile.uid,
        actorName: userProfile.displayName,
        actorRole: 'manager',
        action: 'BRANCH_CREATED',
        targetType: 'branch',
        targetId: branchId,
        details: `تم إنشاء فرع جديد: ${newBranch.name} (${newBranch.code})`,
        timestamp: nowIso,
      });

      await batch.commit();

      setBranches((prev) => [...prev, newBranch]);
      return newBranch;
    } catch (error) {
      console.error('Error adding branch:', error);
      handleFirestoreError(error, OperationType.CREATE, `branches/${branchId}`);
    }
  };

  const createEmployeeAccount = async (data: {
    email: string;
    password: string;
    displayName: string;
    branchId: string;
    branchName: string;
    phone?: string;
  }): Promise<UserProfile> => {
    if (!currentOrg || !userProfile || userProfile.role !== 'manager') {
      throw new Error('Only managers can provision employee accounts');
    }

    const secondaryAuth = getSecondaryAuth();
    try {
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        data.email.trim(),
        data.password
      );

      const newUid = userCredential.user.uid;
      const nowIso = new Date().toISOString();

      const newProfile: UserProfile = {
        uid: newUid,
        orgId: currentOrg.id,
        email: data.email.trim(),
        displayName: data.displayName.trim(),
        role: 'employee',
        branchId: data.branchId,
        branchName: data.branchName,
        phone: data.phone?.trim() || '',
        isActive: true,
        permissions: {
          canCreateClosing: true,
          canViewAllClosings: false,
          canApproveClosings: false,
          canManageBranches: false,
          canManageEmployees: false,
          canExportReports: false,
        },
        createdAt: nowIso,
      };

      const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const auditLogRef = doc(db, 'auditLogs', logId);

      const batch = writeBatch(db);
      batch.set(doc(db, 'users', newUid), newProfile);
      batch.set(auditLogRef, {
        id: logId,
        orgId: currentOrg.id,
        actorId: userProfile.uid,
        actorName: userProfile.displayName,
        actorRole: 'manager',
        action: 'EMPLOYEE_PROVISIONED',
        targetType: 'employee',
        targetId: newUid,
        details: `تم إنشاء حساب موظف جديد: ${newProfile.displayName} (${newProfile.email}) على فرع ${data.branchName}`,
        timestamp: nowIso,
      });

      await batch.commit();
      await signOut(secondaryAuth);
      return newProfile;
    } catch (error: any) {
      console.error('Error provisioning employee:', error);
      try {
        await signOut(secondaryAuth);
      } catch {
        // ignore
      }
      throw error;
    }
  };

  const toggleEmployeeStatus = async (employeeUid: string, isActive: boolean) => {
    if (!currentOrg || userProfile?.role !== 'manager') {
      throw new Error('Only managers can toggle employee status');
    }
    const userRef = doc(db, 'users', employeeUid);
    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const logRef = doc(db, 'auditLogs', logId);

    const batch = writeBatch(db);
    batch.update(userRef, { isActive });
    batch.set(logRef, {
      id: logId,
      orgId: currentOrg.id,
      actorId: userProfile.uid,
      actorName: userProfile.displayName,
      actorRole: 'manager',
      action: isActive ? 'EMPLOYEE_ACTIVATED' : 'EMPLOYEE_DISABLED',
      targetType: 'employee',
      targetId: employeeUid,
      details: `${isActive ? 'تنشيط' : 'تعطيل'} حساب الموظف معرف ${employeeUid}`,
      timestamp: new Date().toISOString(),
    });

    await batch.commit();
  };

  const updateEmployeeBranch = async (employeeUid: string, branchId: string, branchName: string) => {
    if (!currentOrg || userProfile?.role !== 'manager') {
      throw new Error('Only managers can update employee branch');
    }
    const userRef = doc(db, 'users', employeeUid);
    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const logRef = doc(db, 'auditLogs', logId);

    const batch = writeBatch(db);
    batch.update(userRef, { branchId, branchName });
    batch.set(logRef, {
      id: logId,
      orgId: currentOrg.id,
      actorId: userProfile.uid,
      actorName: userProfile.displayName,
      actorRole: 'manager',
      action: 'EMPLOYEE_BRANCH_CHANGED',
      targetType: 'employee',
      targetId: employeeUid,
      details: `تغيير فرع الموظف ${employeeUid} إلى ${branchName}`,
      timestamp: new Date().toISOString(),
    });

    await batch.commit();
  };

  /**
   * Atomic Shift Closing Submission via writeBatch
   * Guarantees atomic dual-write for both closing document and immutable audit log,
   * fully compliant with Firestore Security Rules (getAfter and actor validation).
   */
  const submitShiftClosing = async (data: {
    branchId: string;
    branchName: string;
    date: string;
    period: 'morning' | 'evening';
    cashSales: number;
    cardSales: number;
    expenses: number;
    notes?: string;
    status: 'draft' | 'pending_review';
  }): Promise<ShiftClosing> => {
    if (!currentOrg || !userProfile || !currentUser) {
      throw new Error('بيانات المستخدم أو المؤسسة غير محملة. يرجى تسجيل الدخول مجدداً.');
    }

    if (userProfile.role === 'employee' && userProfile.isActive === false) {
      throw new Error('حسابك معطل ولا يمكنك إرسال إقفالات.');
    }

    // Organization Isolation Check
    if (userProfile.orgId !== currentOrg.id) {
      throw new Error('لا يمكنك إنشاء إقفال لمؤسسة أخرى.');
    }

    // Branch Assignment Security Check: Employee can ONLY submit for their assigned branch
    if (userProfile.role === 'employee' && userProfile.branchId && userProfile.branchId !== data.branchId) {
      throw new Error('لا يمكنك إنشاء إقفال لفرع غير مخصص لحسابك.');
    }

    const calc = calculateShiftTotals(data.cashSales, data.cardSales, data.expenses);
    if (!calc.isValid) {
      throw new Error('يجب أن تكون جميع المبالغ المالية أرقاماً موجبة صحيحة.');
    }

    const closingId = generateDeterministicClosingId(
      currentOrg.id,
      data.branchId,
      data.date,
      data.period
    );
    const closingDocRef = doc(db, 'closings', closingId);
    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const auditLogRef = doc(db, 'auditLogs', logId);
    const nowIso = new Date().toISOString();

    // Check for existing closing for the same branch, date, and period:
    // 1. Check in-memory closings first (instant)
    const existingInState = closings.find((c) => c.id === closingId);

    // 2. Query Firestore collection to confirm server state safely without null-get evaluation error
    let existingData: ShiftClosing | null = existingInState || null;
    if (!existingData) {
      try {
        const q = query(
          collection(db, 'closings'),
          where('orgId', '==', currentOrg.id),
          where('branchId', '==', data.branchId),
          where('date', '==', data.date),
          where('period', '==', data.period)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          existingData = snap.docs[0].data() as ShiftClosing;
        }
      } catch (checkErr) {
        console.warn('Notice checking existing closings via query:', checkErr);
      }
    }

    // Enforce strict duplicate closing and approval immutability guards:
    if (existingData) {
      if (existingData.status === 'approved') {
        throw new Error(
          `يوجد إقفال معتمد مسبقاً لهذا الفرع (${data.branchName}) للفترة ${
            data.period === 'morning' ? 'الصباحية' : 'المسائية'
          } بتاريخ ${data.date}. لا يُسمح بتعديل الإقفال بعد اعتماده.`
        );
      }
      if (existingData.status === 'pending_review') {
        if (existingData.employeeId !== currentUser.uid) {
          throw new Error('يوجد إقفال قيد المراجعة بالفعل لنفس الفرع والفترة بواسطة موظف آخر.');
        } else {
          throw new Error('تم إرسال إقفال لهذه الفترة وهو قيد مراجعة الإدارة حالياً.');
        }
      }
    }

    // Ensure safeActorName has at least 2 characters as required by firestore.rules:
    // incoming().actorName is string && incoming().actorName.size() >= 2 && incoming().actorName.size() <= 100
    let safeActorName = userProfile.displayName?.trim() || currentUser.email || 'موظف الصندوق';
    if (safeActorName.length < 2) {
      safeActorName = 'موظف الصندوق';
    }

    let safeEmployeeName = userProfile.displayName?.trim() || currentUser.email || 'موظف الصندوق';
    if (safeEmployeeName.length < 2) {
      safeEmployeeName = 'موظف الصندوق';
    }

    const newClosing: ShiftClosing = {
      id: closingId,
      orgId: currentOrg.id,
      branchId: data.branchId,
      branchName: data.branchName,
      employeeId: currentUser.uid,
      employeeName: safeEmployeeName,
      date: data.date,
      period: data.period,
      cashSales: calc.cashSales,
      cardSales: calc.cardSales,
      totalSales: calc.totalSales,
      expenses: calc.expenses,
      remainingInBox: calc.remainingInBox,
      netPeriod: calc.netPeriod,
      notes: data.notes?.trim() || '',
      status: data.status,
      attachmentIds: existingData?.attachmentIds || [],
      createdAt: existingData ? existingData.createdAt : nowIso,
      updatedAt: nowIso,
    };

    const auditEntry: AuditLog = {
      id: logId,
      orgId: currentOrg.id,
      actorId: currentUser.uid,
      actorName: safeActorName,
      actorRole: userProfile.role,
      action: data.status === 'draft' ? 'CLOSING_DRAFT_SAVED' : 'CLOSING_SUBMITTED_FOR_REVIEW',
      targetType: 'closing',
      targetId: closingId,
      details: `${data.status === 'draft' ? 'حفظ مسودة' : 'إرسال للمراجعة'} إقفال وردية ${
        data.period === 'morning' ? 'صباحية' : 'مسائية'
      } لفرع ${data.branchName} بتاريخ ${data.date}. إجمالي المبيعات: ${calc.totalSales}`,
      timestamp: nowIso,
    };

    // Atomic batched write: creates closing and audit log together
    const batch = writeBatch(db);
    batch.set(closingDocRef, newClosing);
    batch.set(auditLogRef, auditEntry);

    try {
      await batch.commit();
    } catch (err: any) {
      console.error('Error committing shift closing batch:', err);
      handleFirestoreError(err, OperationType.WRITE, `closings/${closingId}`);
    }

    return newClosing;
  };

  const reviewShiftClosing = async (
    closingId: string,
    action: 'approve' | 'reject',
    rejectionReason?: string
  ) => {
    if (!currentOrg || userProfile?.role !== 'manager' || !currentUser) {
      throw new Error('Only managers can review and approve closings');
    }

    if (action === 'reject' && (!rejectionReason || !rejectionReason.trim())) {
      throw new Error('يجب كتابة سبب الإرجاع للموظف حتى يتمكن من تصحيح الإقفال.');
    }

    const closingDocRef = doc(db, 'closings', closingId);
    const closingSnap = await getDoc(closingDocRef);
    if (!closingSnap.exists()) {
      throw new Error('سجل الإقفال غير موجود');
    }

    const existing = closingSnap.data() as ShiftClosing;
    if (existing.status === 'approved') {
      throw new Error('الإقفال معتمد بالفعل ومقفل ضد التعديلات المباشرة.');
    }

    const nowIso = new Date().toISOString();
    const updateData: Partial<ShiftClosing> = {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewedBy: currentUser.uid,
      reviewedByName: userProfile.displayName || 'المدير العام',
      reviewedAt: nowIso,
      updatedAt: nowIso,
    };

    if (action === 'reject') {
      updateData.rejectionReason = rejectionReason?.trim();
    } else {
      updateData.rejectionReason = '';
    }

    try {
      const batch = writeBatch(db);
      batch.update(closingDocRef, updateData);

      const logRef = doc(db, 'auditLogs', `log_${Date.now()}`);
      batch.set(logRef, {
        id: logRef.id,
        orgId: currentOrg.id,
        actorId: currentUser.uid,
        actorName: userProfile.displayName,
        actorRole: 'manager',
        action: action === 'approve' ? 'CLOSING_APPROVED' : 'CLOSING_REJECTED_FOR_REVISION',
        targetType: 'closing',
        targetId: closingId,
        details:
          action === 'approve'
            ? `اعتماد إقفال ${existing.branchName} (${existing.period}) بتاريخ ${existing.date} - إجمالي ${existing.totalSales}`
            : `إعادة إقفال ${existing.branchName} (${existing.period}) للتعديل. السبب: ${rejectionReason}`,
        timestamp: nowIso,
      });

      await batch.commit();
    } catch (error) {
      console.error('Error reviewing closing:', error);
      handleFirestoreError(error, OperationType.UPDATE, `closings/${closingId}`);
    }
  };

  /**
   * Administrative Correction for Managers on Approved Closings
   * Free Firebase Spark Architecture: Fully atomic transaction via runTransaction
   * Guarantees immutable historical fields, accurate accounting math, and mandatory audit log
   */
  const adminCorrectClosing = async (data: {
    closingId: string;
    cashSales: number;
    cardSales: number;
    expenses: number;
    correctionReason: string;
  }) => {
    if (!currentUser) {
      throw new Error('يجب تسجيل الدخول كمدير معتمد لإجراء التصحيح الإداري.');
    }
    if (!currentOrg || userProfile?.role !== 'manager' || !userProfile.isActive) {
      throw new Error('التصحيح الإداري مقتصر حصراً على المدراء النشطين في المؤسسة.');
    }

    const cleanReason = data.correctionReason?.trim();
    if (!cleanReason || cleanReason.length < 5) {
      throw new Error('يجب كتابة سبب التصحيح الإداري المبرر لتعديل إقفال معتمد (لا يقل عن 5 أحرف).');
    }

    const calc = calculateShiftTotals(data.cashSales, data.cardSales, data.expenses);
    if (!calc.isValid) {
      throw new Error('المبالغ المصححة يجب أن تكون قيماً موجبة صحيحة.');
    }

    const closingDocRef = doc(db, 'closings', data.closingId);
    const auditLogId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const auditLogDocRef = doc(db, 'auditLogs', auditLogId);
    const nowIso = new Date().toISOString();

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Read existing document inside transaction
        const closingSnap = await transaction.get(closingDocRef);
        if (!closingSnap.exists()) {
          throw new Error('سجل الإقفال غير موجود.');
        }

        const existing = closingSnap.data() as ShiftClosing;

        // 2. Strict Tenant and Status Checks
        if (existing.orgId !== currentOrg.id || existing.orgId !== userProfile.orgId) {
          throw new Error('لا يمكن تصحيح إقفال تابع لمؤسسة أخرى.');
        }

        if (existing.status !== 'approved') {
          throw new Error('التصحيح الإداري مخصص فقط للإقفالات المعتمدة.');
        }

        // 3. Genuine previous values snapshot from the server document
        const previousSnapshot = {
          cashSales: existing.cashSales,
          cardSales: existing.cardSales,
          expenses: existing.expenses,
          totalSales: existing.totalSales,
          remainingInBox: existing.remainingInBox,
          netPeriod: existing.netPeriod,
        };

        // 4. Update closing while preserving historical fields
        const updatedPayload: Partial<ShiftClosing> = {
          cashSales: calc.cashSales,
          cardSales: calc.cardSales,
          expenses: calc.expenses,
          totalSales: calc.totalSales,
          remainingInBox: calc.remainingInBox,
          netPeriod: calc.netPeriod,
          previousValues: previousSnapshot,
          correctionReason: cleanReason,
          correctedBy: currentUser.uid,
          correctedByName: userProfile.displayName || 'المدير العام',
          correctedAt: nowIso,
          updatedAt: nowIso,
        };

        transaction.update(closingDocRef, updatedPayload);

        // 5. Create atomic audit log in the exact same transaction
        const auditLogData: AuditLog = {
          id: auditLogId,
          orgId: currentOrg.id,
          action: 'CLOSING_ADMIN_CORRECTED',
          targetType: 'closing',
          targetId: data.closingId,
          actorId: currentUser.uid,
          actorName: userProfile.displayName || 'المدير العام',
          actorRole: 'manager',
          details: `تصحيح إداري معتمد للإقفال (${data.closingId}). السبب: ${cleanReason}. المبيعات الجديدة: نقد ${calc.cashSales}، شبكة ${calc.cardSales}، مصاريف ${calc.expenses}. المبيعات السابقة: نقد ${existing.cashSales}، شبكة ${existing.cardSales}.`,
          timestamp: nowIso,
          previousValues: previousSnapshot,
          newValues: {
            cashSales: calc.cashSales,
            cardSales: calc.cardSales,
            expenses: calc.expenses,
            totalSales: calc.totalSales,
            remainingInBox: calc.remainingInBox,
            netPeriod: calc.netPeriod,
          },
        };

        transaction.set(auditLogDocRef, auditLogData);
      });
    } catch (error: any) {
      console.error('Error in administrative correction transaction:', error);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUserProfile(null);
      setCurrentOrg(null);
      setBranches([]);
      setCurrentBranch(null);
      setEmployees([]);
      setClosings([]);
      setAuditLogs([]);
      setNeedsOnboarding(false);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshTenantData = async () => {
    if (auth.currentUser) {
      await loadUserData(auth.currentUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        currentOrg,
        branches,
        currentBranch,
        employees,
        closings,
        auditLogs,
        loading,
        needsOnboarding,
        loginWithGoogle,
        loginWithEmailPassword,
        resetPassword,
        completeOrganizationSetup,
        addBranch,
        createEmployeeAccount,
        toggleEmployeeStatus,
        updateEmployeeBranch,
        submitShiftClosing,
        reviewShiftClosing,
        adminCorrectClosing,
        logout,
        refreshTenantData,
        setCurrentBranch,
        authNotice,
        clearAuthNotice,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
