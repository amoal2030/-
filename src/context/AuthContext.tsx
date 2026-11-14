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
  getDocFromServer,
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
  deleteField,
} from 'firebase/firestore';
import {
  Organization,
  UserProfile,
  Branch,
  AuditLog,
  ShiftClosing,
  ClosingStatus,
  ClosingArchiveRecord,
  DriveMonthFolderRef,
  DriveHealthStatus,
} from '../types';
import {
  calculateShiftTotals,
  generateDeterministicClosingId,
} from '../utils/accounting';
import {
  assertDriveSessionMatchesAccount,
  clearDriveSession,
  downloadOriginalClosingExcelFromDrive,
  evaluateOrgDriveReadiness,
  getActiveDriveSession,
  OrgDriveReadinessResult,
  DRIVE_NOT_READY_MESSAGE,
  requestDriveAuthorization,
  uploadAndVerifyClosingExcelToDrive,
} from '../services/driveService';
import {
  assertValidIsoCalendarDate,
  downloadXlsxBytes,
  generateClosingExcelWorkbook,
} from '../services/excelReportService';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  currentOrg: Organization | null;
  branches: Branch[];
  currentBranch: Branch | null;
  employees: UserProfile[];
  closings: ShiftClosing[];
  closingArchives: ClosingArchiveRecord[];
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
  saveDriveConnection: (data: {
    driveAccountEmail: string;
    driveAccountName: string;
    driveGoogleSub: string;
    orgFolderId: string;
    orgFolderName: string;
    orgFolderLink: string;
    driveWriteVerified: boolean;
    driveWriteVerifiedAt: string;
    branchFolders?: Array<{
      branchId: string;
      folderId: string;
      folderName: string;
      webViewLink: string;
    }>;
    monthFolderMap?: Record<string, DriveMonthFolderRef>;
  }) => Promise<void>;
  recordDriveHealthFailure: (errorMessage: string) => Promise<void>;
  disconnectDriveConnection: () => Promise<void>;
  archiveClosingToDrive: (
    closingId: string,
    options?: { interactiveAuthIfNeeded?: boolean }
  ) => Promise<ClosingArchiveRecord>;
  archivePendingClosingsToDrive: (closingIds: string[]) => Promise<{
    succeeded: string[];
    failed: Array<{ closingId: string; error: string }>;
  }>;
  downloadArchivedExcelFromDrive: (
    closingId: string
  ) => Promise<{ fileName: string; revision: number }>;
  driveReadiness: OrgDriveReadinessResult;
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
  const [closingArchives, setClosingArchives] = useState<ClosingArchiveRecord[]>([]);
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
        setClosingArchives([]);
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

    // 0. Real-time Organization & Branches listeners so Drive readiness & folder state sync immediately
    const orgDocRef = doc(db, 'organizations', currentOrg.id);
    const unsubOrg = onSnapshot(
      orgDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setCurrentOrg(docSnap.data() as Organization);
        }
      },
      (error) => {
        console.warn('Organization listener notice:', error?.message);
      }
    );

    const branchesRef = collection(db, 'branches');
    const branchesQuery = query(branchesRef, where('orgId', '==', currentOrg.id));
    const unsubBranches = onSnapshot(
      branchesQuery,
      (snapshot) => {
        const loaded: Branch[] = [];
        snapshot.forEach((b) => loaded.push(b.data() as Branch));
        setBranches(loaded);
        setCurrentBranch((prev) => {
          if (userProfile.role === 'employee' && userProfile.branchId) {
            return loaded.find((b) => b.id === userProfile.branchId) || loaded[0] || null;
          }
          if (prev) {
            return loaded.find((b) => b.id === prev.id) || loaded[0] || null;
          }
          return loaded[0] || null;
        });
      },
      (error) => {
        console.warn('Branches listener notice:', error?.message);
      }
    );

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

    // 5. Closing Archives snapshot listener (scoped cleanly by role & branch for Employee)
    let unsubArchives = () => {};
    if (userProfile.role === 'manager') {
      const archivesQuery = query(
        collection(db, 'closingArchives'),
        where('orgId', '==', currentOrg.id)
      );
      unsubArchives = onSnapshot(
        archivesQuery,
        (snapshot) => {
          const loaded: ClosingArchiveRecord[] = [];
          snapshot.forEach((d) => loaded.push(d.data() as ClosingArchiveRecord));
          setClosingArchives(loaded);
        },
        (error) => {
          console.warn('Closing archives listener notice:', error?.message);
        }
      );
    } else if (userProfile.role === 'employee' && userProfile.branchId) {
      const empArchivesQuery = query(
        collection(db, 'closingArchives'),
        where('orgId', '==', currentOrg.id),
        where('branchId', '==', userProfile.branchId)
      );
      unsubArchives = onSnapshot(
        empArchivesQuery,
        (snapshot) => {
          const loaded: ClosingArchiveRecord[] = [];
          snapshot.forEach((d) => loaded.push(d.data() as ClosingArchiveRecord));
          setClosingArchives(loaded);
        },
        (error) => {
          console.warn('Employee closing archives listener notice:', error?.message);
        }
      );
    }

    return () => {
      unsubOrg();
      unsubBranches();
      unsubClosings();
      unsubSelf();
      unsubUsers();
      unsubLogs();
      unsubArchives();
    };
  }, [currentOrg?.id, currentUser?.uid, userProfile?.role, userProfile?.isActive, userProfile?.orgId, userProfile?.branchId]);

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
      driveWriteVerified: false,
      driveLastHealthStatus: 'untested',
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

    // Phase 1 Pre-Write Storage Gate: Block both manager and employee if Drive is not linked & write/read verified
    const targetBranchInMemory = branches.find((b) => b.id === data.branchId) || null;
    const localReadiness = evaluateOrgDriveReadiness(currentOrg, targetBranchInMemory);
    if (!localReadiness.isReady) {
      throw new Error(localReadiness.message);
    }

    // Anti-bypass fresh server check against Firestore (prevents stale in-memory state bypass)
    try {
      const [freshOrgSnap, freshBranchSnap] = await Promise.all([
        getDocFromServer(doc(db, 'organizations', currentOrg.id)),
        getDocFromServer(doc(db, 'branches', data.branchId)),
      ]);
      if (!freshOrgSnap.exists() || !freshBranchSnap.exists()) {
        throw new Error(DRIVE_NOT_READY_MESSAGE);
      }
      const freshOrg = freshOrgSnap.data() as Organization;
      const freshBranch = freshBranchSnap.data() as Branch;
      const serverReadiness = evaluateOrgDriveReadiness(freshOrg, freshBranch);
      if (!serverReadiness.isReady) {
        setCurrentOrg(freshOrg);
        throw new Error(serverReadiness.message);
      }
    } catch (gateErr: any) {
      if (gateErr?.message === DRIVE_NOT_READY_MESSAGE) {
        throw gateErr;
      }
      throw new Error(
        'تعذر التحقق الفوري من جاهزية Google Drive على الخادم قبل الحفظ. يرجى التحقق من الاتصال والمحاولة مجدداً.'
      );
    }

    const { yearMonth } = assertValidIsoCalendarDate(data.date);

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
    const archiveDocRef = doc(db, 'closingArchives', closingId);
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

    let existingArchive: ClosingArchiveRecord | null =
      closingArchives.find((a) => a.closingId === closingId) || null;
    if (!existingArchive) {
      try {
        const archiveSnap = await getDoc(archiveDocRef);
        if (archiveSnap.exists()) {
          existingArchive = archiveSnap.data() as ClosingArchiveRecord;
        }
      } catch (archCheckErr) {
        console.warn('Notice checking existing closing archive:', archCheckErr);
      }
    }

    // Atomic batched write: creates closing, audit log, and pending_drive_sync archive index together
    const batch = writeBatch(db);
    batch.set(closingDocRef, newClosing);
    batch.set(auditLogRef, auditEntry);
    if (!existingArchive) {
      batch.set(archiveDocRef, {
        closingId,
        orgId: currentOrg.id,
        branchId: data.branchId,
        yearMonth,
        archiveStatus: 'pending_drive_sync',
        updatedAt: nowIso,
      });
    } else if (existingArchive.archiveStatus === 'pending_drive_sync') {
      batch.update(archiveDocRef, {
        archiveStatus: 'pending_drive_sync',
        updatedAt: nowIso,
      });
    }

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

    const { yearMonth } = assertValidIsoCalendarDate(existing.date);
    const archiveDocRef = doc(db, 'closingArchives', closingId);
    let existingArchive: ClosingArchiveRecord | null =
      closingArchives.find((a) => a.closingId === closingId) || null;
    if (!existingArchive) {
      try {
        const archiveSnap = await getDoc(archiveDocRef);
        if (archiveSnap.exists()) {
          existingArchive = archiveSnap.data() as ClosingArchiveRecord;
        }
      } catch (archErr) {
        console.warn('Notice checking archive doc during review:', archErr);
      }
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

      if (action === 'approve') {
        if (!existingArchive) {
          batch.set(archiveDocRef, {
            closingId,
            orgId: currentOrg.id,
            branchId: existing.branchId,
            yearMonth,
            archiveStatus: 'pending_drive_sync',
            updatedAt: nowIso,
          });
        } else if (existingArchive.archiveStatus === 'pending_drive_sync') {
          batch.update(archiveDocRef, {
            archiveStatus: 'pending_drive_sync',
            updatedAt: nowIso,
          });
        }
      }

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
    const archiveDocRef = doc(db, 'closingArchives', data.closingId);
    const auditLogId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const auditLogDocRef = doc(db, 'auditLogs', auditLogId);
    let nowIso = new Date().toISOString();

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Read existing closing AND closingArchive inside transaction before any writes
        const closingSnap = await transaction.get(closingDocRef);
        if (!closingSnap.exists()) {
          throw new Error('سجل الإقفال غير موجود.');
        }
        const archiveSnap = await transaction.get(archiveDocRef);

        const existing = closingSnap.data() as ShiftClosing;

        // 2. Strict Tenant and Status Checks
        if (existing.orgId !== currentOrg.id || existing.orgId !== userProfile.orgId) {
          throw new Error('لا يمكن تصحيح إقفال تابع لمؤسسة أخرى.');
        }

        if (existing.status !== 'approved') {
          throw new Error('التصحيح الإداري مخصص فقط للإقفالات المعتمدة.');
        }

        assertValidIsoCalendarDate(existing.date);

        if (existing.correctedAt === nowIso) {
          nowIso = new Date(Date.now() + 1).toISOString();
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

        // 5. Mark existing Drive archive as stale atomically if it was already archived / stale / failed-with-proof
        if (archiveSnap.exists()) {
          const prevArchive = archiveSnap.data() as ClosingArchiveRecord;
          if (
            prevArchive.archiveStatus === 'archived' ||
            prevArchive.archiveStatus === 'stale' ||
            (prevArchive.archiveStatus === 'failed' && Boolean(prevArchive.driveExcelFileId))
          ) {
            transaction.update(archiveDocRef, {
              archiveStatus: 'stale',
              archiveError: deleteField(),
              sourceCorrectionAt: nowIso,
              updatedAt: nowIso,
            });
          }
        }

        // 6. Create atomic audit log in the exact same transaction
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

  /**
   * Saves non-secret Google Drive link metadata & folder IDs to Firestore.
   * Strictly enforces organization owner identity (currentUser.uid === currentOrg.ownerId).
   * Never stores any OAuth access token or secret.
   */
  const saveDriveConnection = async (data: {
    driveAccountEmail: string;
    driveAccountName: string;
    driveGoogleSub: string;
    orgFolderId: string;
    orgFolderName: string;
    orgFolderLink: string;
    driveWriteVerified: boolean;
    driveWriteVerifiedAt: string;
    branchFolders?: Array<{
      branchId: string;
      folderId: string;
      folderName: string;
      webViewLink: string;
    }>;
    monthFolderMap?: Record<string, DriveMonthFolderRef>;
  }) => {
    if (!currentUser || !currentOrg || !userProfile) {
      throw new Error('يجب تسجيل الدخول بحساب مالك المؤسسة لحفظ بيانات ربط Drive.');
    }
    if (
      userProfile.role !== 'manager' ||
      !userProfile.isActive ||
      currentUser.uid !== currentOrg.ownerId
    ) {
      throw new Error('ربط Google Drive مقتصر حصراً على مالك المؤسسة المعتمد.');
    }
    if (!data.orgFolderId || !data.driveGoogleSub || !data.driveAccountEmail) {
      throw new Error('بيانات مجلد المؤسسة أو هوية Google غير مكتملة.');
    }
    if (data.driveWriteVerified !== true || !data.driveWriteVerifiedAt) {
      throw new Error('لا يمكن اعتماد ربط Google Drive قبل نجاح اختبار الكتابة والقراءة الفعلية.');
    }

    const nowIso = new Date().toISOString();
    const orgRef = doc(db, 'organizations', currentOrg.id);
    const batch = writeBatch(db);

    const orgUpdatePayload: Record<string, any> = {
      driveConnected: true,
      driveFolderId: data.orgFolderId,
      driveFolderName: data.orgFolderName,
      driveFolderLink: data.orgFolderLink,
      driveAccountEmail: data.driveAccountEmail,
      driveAccountName: data.driveAccountName,
      driveGoogleSub: data.driveGoogleSub,
      driveLinkedAt: nowIso,
      driveWriteVerified: true,
      driveWriteVerifiedAt: data.driveWriteVerifiedAt,
      driveLastHealthStatus: 'verified' as DriveHealthStatus,
      driveHealthError: deleteField(),
      updatedAt: nowIso,
    };

    if (data.monthFolderMap) {
      orgUpdatePayload.driveMonthFolderIds = data.monthFolderMap;
    }

    batch.update(orgRef, orgUpdatePayload);

    const branchMap = new Map<string, { folderId: string; folderName: string; webViewLink: string }>();
    if (data.branchFolders && data.branchFolders.length > 0) {
      for (const bf of data.branchFolders) {
        branchMap.set(bf.branchId, bf);
        const branchRef = doc(db, 'branches', bf.branchId);
        batch.update(branchRef, {
          driveFolderId: bf.folderId,
          driveFolderName: bf.folderName,
          driveFolderLink: bf.webViewLink,
        });
      }
    }

    try {
      await batch.commit();
    } catch (error) {
      console.error('Error saving Drive connection metadata:', error);
      handleFirestoreError(error, OperationType.UPDATE, `organizations/${currentOrg.id}`);
    }

    setCurrentOrg((prev) =>
      prev
        ? {
            ...prev,
            driveConnected: true,
            driveFolderId: data.orgFolderId,
            driveFolderName: data.orgFolderName,
            driveFolderLink: data.orgFolderLink,
            driveAccountEmail: data.driveAccountEmail,
            driveAccountName: data.driveAccountName,
            driveGoogleSub: data.driveGoogleSub,
            driveLinkedAt: nowIso,
            driveWriteVerified: true,
            driveWriteVerifiedAt: data.driveWriteVerifiedAt,
            driveLastHealthStatus: 'verified',
            driveHealthError: undefined,
            driveMonthFolderIds: data.monthFolderMap ?? prev.driveMonthFolderIds,
            updatedAt: nowIso,
          }
        : prev
    );

    if (branchMap.size > 0) {
      setBranches((prev) =>
        prev.map((b) => {
          const bf = branchMap.get(b.id);
          return bf
            ? {
                ...b,
                driveFolderId: bf.folderId,
                driveFolderName: bf.folderName,
                driveFolderLink: bf.webViewLink,
              }
            : b;
        })
      );
      setCurrentBranch((prev) => {
        if (!prev) return prev;
        const bf = branchMap.get(prev.id);
        return bf
          ? {
              ...prev,
              driveFolderId: bf.folderId,
              driveFolderName: bf.folderName,
              driveFolderLink: bf.webViewLink,
            }
          : prev;
      });
    }
  };

  /**
   * Records non-secret Drive health failure in Firestore when a linked organization fails
   * write/read verification so operational entry stays safely gated until resolved.
   */
  const recordDriveHealthFailure = async (errorMessage: string) => {
    if (!currentUser || !currentOrg || !userProfile) return;
    if (
      userProfile.role !== 'manager' ||
      !userProfile.isActive ||
      currentUser.uid !== currentOrg.ownerId
    ) {
      return;
    }
    if (!currentOrg.driveConnected) return;

    const nowIso = new Date().toISOString();
    const safeError = (errorMessage || 'فشل التحقق من جاهزية Google Drive').slice(0, 500);
    const orgRef = doc(db, 'organizations', currentOrg.id);

    try {
      await updateDoc(orgRef, {
        driveWriteVerified: false,
        driveLastHealthStatus: 'failed' as DriveHealthStatus,
        driveHealthError: safeError,
        updatedAt: nowIso,
      });

      setCurrentOrg((prev) =>
        prev
          ? {
              ...prev,
              driveWriteVerified: false,
              driveLastHealthStatus: 'failed',
              driveHealthError: safeError,
              updatedAt: nowIso,
            }
          : prev
      );
    } catch (err) {
      console.warn('Notice recording Drive health failure:', err);
    }
  };

  /**
   * Disconnects Google Drive integration metadata in Firestore without deleting
   * any files in Google Drive or any operational records in Firestore.
   */
  const disconnectDriveConnection = async () => {
    if (!currentUser || !currentOrg || !userProfile) {
      throw new Error('يجب تسجيل الدخول بحساب مالك المؤسسة لفصل الربط.');
    }
    if (
      userProfile.role !== 'manager' ||
      !userProfile.isActive ||
      currentUser.uid !== currentOrg.ownerId
    ) {
      throw new Error('فصل ربط Google Drive مقتصر حصراً على مالك المؤسسة المعتمد.');
    }

    clearDriveSession();

    const nowIso = new Date().toISOString();
    const orgRef = doc(db, 'organizations', currentOrg.id);
    const batch = writeBatch(db);

    batch.update(orgRef, {
      driveConnected: false,
      driveWriteVerified: false,
      driveLastHealthStatus: 'disconnected' as DriveHealthStatus,
      driveWriteVerifiedAt: deleteField(),
      driveHealthError: deleteField(),
      driveFolderId: deleteField(),
      driveFolderName: deleteField(),
      driveFolderLink: deleteField(),
      driveAccountEmail: deleteField(),
      driveAccountName: deleteField(),
      driveGoogleSub: deleteField(),
      driveLinkedAt: deleteField(),
      driveMonthFolderIds: deleteField(),
      updatedAt: nowIso,
    });

    for (const branch of branches) {
      if (branch.driveFolderId || branch.driveFolderName || branch.driveFolderLink) {
        const branchRef = doc(db, 'branches', branch.id);
        batch.update(branchRef, {
          driveFolderId: deleteField(),
          driveFolderName: deleteField(),
          driveFolderLink: deleteField(),
        });
      }
    }

    try {
      await batch.commit();
    } catch (error) {
      console.error('Error disconnecting Drive metadata:', error);
      handleFirestoreError(error, OperationType.UPDATE, `organizations/${currentOrg.id}`);
    }

    setCurrentOrg((prev) =>
      prev
        ? {
            ...prev,
            driveConnected: false,
            driveWriteVerified: false,
            driveLastHealthStatus: 'disconnected',
            driveWriteVerifiedAt: undefined,
            driveHealthError: undefined,
            driveFolderId: undefined,
            driveFolderName: undefined,
            driveFolderLink: undefined,
            driveAccountEmail: undefined,
            driveAccountName: undefined,
            driveGoogleSub: undefined,
            driveLinkedAt: undefined,
            driveMonthFolderIds: undefined,
            updatedAt: nowIso,
          }
        : prev
    );

    setBranches((prev) =>
      prev.map((b) => ({
        ...b,
        driveFolderId: undefined,
        driveFolderName: undefined,
        driveFolderLink: undefined,
      }))
    );

    setCurrentBranch((prev) =>
      prev
        ? {
            ...prev,
            driveFolderId: undefined,
            driveFolderName: undefined,
            driveFolderLink: undefined,
          }
        : prev
    );
  };

  /**
   * Manager-only real Excel (.xlsx) archival to Google Drive with deduplication,
   * version chain preservation, and mandatory read-back verification prior to marking 'archived'.
   */
  const archiveClosingToDrive = async (
    closingId: string,
    options?: { interactiveAuthIfNeeded?: boolean }
  ): Promise<ClosingArchiveRecord> => {
    const interactiveAuthIfNeeded = options?.interactiveAuthIfNeeded ?? true;

    if (!currentUser || !currentOrg || !userProfile) {
      throw new Error('يجب تسجيل الدخول بصفة مدير معتمد لأرشفة الإقفالات.');
    }
    if (userProfile.role !== 'manager' || !userProfile.isActive) {
      throw new Error('أرشفة الإقفالات ورفع ملفات Excel إلى Google Drive مقتصرة حصراً على المدير.');
    }
    if (currentUser.uid !== currentOrg.ownerId) {
      throw new Error('صلاحية الرفع إلى Google Drive مقتصرة على مالك المؤسسة المرتبط حسابه.');
    }

    const closingDocRef = doc(db, 'closings', closingId);
    const closingSnap = await getDocFromServer(closingDocRef).catch(() => getDoc(closingDocRef));
    if (!closingSnap.exists()) {
      throw new Error('سجل الإقفال غير موجود.');
    }

    const closing = closingSnap.data() as ShiftClosing;
    if (closing.orgId !== currentOrg.id) {
      throw new Error('لا يمكن أرشفة إقفال تابع لمؤسسة أخرى.');
    }
    if (closing.status !== 'approved') {
      throw new Error('لا يمكن أرشفة الإقفال في Google Drive قبل اعتماده رسمياً.');
    }

    const { yearMonth } = assertValidIsoCalendarDate(closing.date);

    let branch = branches.find((b) => b.id === closing.branchId) || null;
    if (!branch) {
      const brSnap = await getDoc(doc(db, 'branches', closing.branchId));
      if (brSnap.exists()) {
        branch = brSnap.data() as Branch;
      }
    }
    if (!branch) {
      throw new Error('بيانات الفرع المرتبط بالإقفال غير متوفرة.');
    }

    const readiness = evaluateOrgDriveReadiness(currentOrg, branch);
    if (!readiness.isReady) {
      throw new Error(readiness.detail || readiness.message);
    }

    const archiveDocRef = doc(db, 'closingArchives', closingId);
    let prevArchive: ClosingArchiveRecord | null = null;
    try {
      const archSnap = await getDocFromServer(archiveDocRef).catch(() => getDoc(archiveDocRef));
      if (archSnap.exists()) {
        prevArchive = archSnap.data() as ClosingArchiveRecord;
      }
    } catch {
      prevArchive = closingArchives.find((a) => a.closingId === closingId) || null;
    }

    // Already archived cleanly on current version -> safe idempotent return
    if (
      prevArchive &&
      prevArchive.archiveStatus === 'archived' &&
      (!closing.correctedAt || prevArchive.sourceCorrectionAt === closing.correctedAt)
    ) {
      return prevArchive;
    }

    const isReArchive = Boolean(prevArchive?.driveExcelFileId);
    const targetRevision = isReArchive ? (prevArchive!.driveRevision || 1) + 1 : 1;
    const forbiddenPreviousFileId = isReArchive ? prevArchive!.driveExcelFileId : undefined;

    if (isReArchive && !closing.correctedAt) {
      throw new Error(
        'تعذر إعادة الأرشفة لعدم وجود طابع تصحيح إداري موثق (correctedAt) على الإقفال المعتمد.'
      );
    }

    // Ensure owner Google identity & RAM-only OAuth access token
    const googleProviderData = currentUser.providerData.find((p) => p.providerId === 'google.com');
    const googleUid = googleProviderData?.uid;
    const ownerEmail = googleProviderData?.email || currentUser.email || '';
    if (!googleUid || !ownerEmail) {
      throw new Error('حساب المالك الحالي غير مرتبط بمزود Google لتفويض Google Drive.');
    }

    let session = getActiveDriveSession();
    if (session) {
      try {
        session = assertDriveSessionMatchesAccount(session, {
          googleUid,
          email: ownerEmail,
          linkedSub: currentOrg.driveGoogleSub,
          linkedEmail: currentOrg.driveAccountEmail,
        });
      } catch {
        session = null;
      }
    }

    if (!session) {
      if (!interactiveAuthIfNeeded) {
        throw new Error(
          'تم اعتماد الإقفال بنجاح. اضغط «أرشفة في Google Drive» لتجديد تفويض المتصفح المؤقت ورفع ملف Excel.'
        );
      }
      session = await requestDriveAuthorization(googleUid, ownerEmail, {
        linkedSub: currentOrg.driveGoogleSub,
        linkedEmail: currentOrg.driveAccountEmail,
      });
    }

    try {
      // 1. Generate formatted RTL Excel workbook using ONLY real fields
      const excelPayload = await generateClosingExcelWorkbook({
        closing,
        org: currentOrg,
        branch,
        revision: targetRevision,
      });

      // 2. Upload to Drive ({org}/{branch}/{YYYY-MM}) and strictly verify metadata + binary + exceljs content
      const uploadResult = await uploadAndVerifyClosingExcelToDrive({
        token: session.accessToken,
        org: currentOrg,
        branch,
        closing,
        revision: targetRevision,
        excelPayload,
        forbiddenPreviousFileId,
      });

      const nowIso = new Date().toISOString();

      // 3. Cache verified month folder ref in Organization metadata if new/updated
      const monthKey = `${branch.id}_${yearMonth}`;
      const existingMonthRef = currentOrg.driveMonthFolderIds?.[monthKey];
      if (!existingMonthRef || existingMonthRef.folderId !== uploadResult.monthFolder.folderId) {
        try {
          await updateDoc(doc(db, 'organizations', currentOrg.id), {
            [`driveMonthFolderIds.${monthKey}`]: uploadResult.monthFolder,
            updatedAt: nowIso,
          });
        } catch (folderSyncErr) {
          console.warn('Notice updating cached month folder ref:', folderSyncErr);
        }
      }

      // 4. Write 'archived' state to Firestore closingArchives ONLY after verified Drive read-back
      const archivedFields: Record<string, any> = {
        closingId: closing.id,
        orgId: currentOrg.id,
        branchId: closing.branchId,
        yearMonth,
        archiveStatus: 'archived',
        driveExcelFileId: uploadResult.fileId,
        driveExcelFileName: uploadResult.fileName,
        driveExcelWebViewLink: uploadResult.webViewLink,
        driveMonthFolderId: uploadResult.monthFolder.folderId,
        drivePayloadHash: uploadResult.payloadHash,
        driveRevision: targetRevision,
        archivedAt: nowIso,
        archivedBy: currentUser.uid,
        updatedAt: nowIso,
      };

      if (isReArchive && prevArchive?.driveExcelFileId) {
        archivedFields.previousDriveExcelFileId = prevArchive.driveExcelFileId;
      }
      if (closing.correctedAt) {
        archivedFields.sourceCorrectionAt = closing.correctedAt;
      }

      if (!prevArchive) {
        await setDoc(archiveDocRef, archivedFields);
      } else {
        await updateDoc(archiveDocRef, {
          archiveStatus: 'archived',
          driveExcelFileId: uploadResult.fileId,
          driveExcelFileName: uploadResult.fileName,
          driveExcelWebViewLink: uploadResult.webViewLink,
          driveMonthFolderId: uploadResult.monthFolder.folderId,
          drivePayloadHash: uploadResult.payloadHash,
          driveRevision: targetRevision,
          archivedAt: nowIso,
          archivedBy: currentUser.uid,
          archiveError: deleteField(),
          updatedAt: nowIso,
          ...(isReArchive && prevArchive.driveExcelFileId
            ? { previousDriveExcelFileId: prevArchive.driveExcelFileId }
            : {}),
          ...(closing.correctedAt ? { sourceCorrectionAt: closing.correctedAt } : {}),
        });
      }

      const savedRecord: ClosingArchiveRecord = {
        closingId: closing.id,
        orgId: currentOrg.id,
        branchId: closing.branchId,
        yearMonth,
        archiveStatus: 'archived',
        driveExcelFileId: uploadResult.fileId,
        driveExcelFileName: uploadResult.fileName,
        driveExcelWebViewLink: uploadResult.webViewLink,
        driveMonthFolderId: uploadResult.monthFolder.folderId,
        drivePayloadHash: uploadResult.payloadHash,
        driveRevision: targetRevision,
        previousDriveExcelFileId:
          isReArchive && prevArchive?.driveExcelFileId ? prevArchive.driveExcelFileId : undefined,
        sourceCorrectionAt: closing.correctedAt || undefined,
        archivedAt: nowIso,
        archivedBy: currentUser.uid,
        updatedAt: nowIso,
      };

      setClosingArchives((prev) => {
        const filteredList = prev.filter((item) => item.closingId !== closing.id);
        return [savedRecord, ...filteredList];
      });

      return savedRecord;
    } catch (err: any) {
      const errTime = new Date().toISOString();
      const rawMsg = String(err?.message || err || 'فشل أرشفة ملف Excel في Google Drive').trim();
      const safeError = (rawMsg.length >= 5 ? rawMsg : `خطأ أرشفة: ${rawMsg}`).slice(0, 1000);

      try {
        if (!prevArchive) {
          await setDoc(archiveDocRef, {
            closingId: closing.id,
            orgId: currentOrg.id,
            branchId: closing.branchId,
            yearMonth,
            archiveStatus: 'failed',
            archiveError: safeError,
            updatedAt: errTime,
          });
        } else if (prevArchive.archiveStatus !== 'archived') {
          await updateDoc(archiveDocRef, {
            archiveStatus: 'failed',
            archiveError: safeError,
            updatedAt: errTime,
          });
        }
      } catch (persistErr) {
        console.warn('Notice recording archive failure in closingArchives:', persistErr);
      }

      throw err;
    }
  };

  /**
   * Batch archives multiple pending/stale/failed approved closings sequentially
   * using the owner's single RAM Drive session.
   */
  const archivePendingClosingsToDrive = async (closingIds: string[]) => {
    const succeeded: string[] = [];
    const failed: Array<{ closingId: string; error: string }> = [];

    for (const id of closingIds) {
      try {
        await archiveClosingToDrive(id, { interactiveAuthIfNeeded: true });
        succeeded.push(id);
      } catch (err: any) {
        failed.push({
          closingId: id,
          error: err?.message || 'فشل رفع ملف Excel للإقفال',
        });
      }
    }

    return { succeeded, failed };
  };

  /**
   * Downloads and verifies the original archived .xlsx file directly from Google Drive
   * (`files.get?alt=media`) using the stored `driveExcelFileId`, without regenerating locally from Firestore.
   */
  const downloadArchivedExcelFromDrive = async (
    closingId: string
  ): Promise<{ fileName: string; revision: number }> => {
    if (!currentUser || !currentOrg || !userProfile) {
      throw new Error('يجب تسجيل الدخول بصفة مدير معتمد لتنزيل الملف الأصلي من Google Drive.');
    }
    if (userProfile.role !== 'manager' || !userProfile.isActive) {
      throw new Error('تنزيل ملفات الإقفال الأصلية من Google Drive مقتصر حصراً على المدير.');
    }
    if (currentUser.uid !== currentOrg.ownerId) {
      throw new Error('صلاحية الوصول إلى ملفات Google Drive وتنزيلها مقتصرة على مالك المؤسسة المرتبط حسابه.');
    }

    const closingDocRef = doc(db, 'closings', closingId);
    const closingSnap = await getDocFromServer(closingDocRef).catch(() => getDoc(closingDocRef));
    if (!closingSnap.exists()) {
      throw new Error('سجل الإقفال غير موجود.');
    }
    const closing = closingSnap.data() as ShiftClosing;
    if (closing.orgId !== currentOrg.id) {
      throw new Error('لا يمكن تنزيل ملف أرشيف تابع لمؤسسة أخرى.');
    }

    const archiveDocRef = doc(db, 'closingArchives', closingId);
    const archiveSnap = await getDocFromServer(archiveDocRef).catch(() => getDoc(archiveDocRef));
    if (!archiveSnap.exists()) {
      throw new Error('لا يوجد سجل أرشفة Google Drive لهذا الإقفال حتى الآن.');
    }
    const archiveRecord = archiveSnap.data() as ClosingArchiveRecord;
    if (!archiveRecord.driveExcelFileId) {
      throw new Error('لم يتم رفع ملف Excel لهذا الإقفال إلى Google Drive بعد.');
    }

    const googleProviderData = currentUser.providerData.find((p) => p.providerId === 'google.com');
    const googleUid = googleProviderData?.uid;
    const ownerEmail = googleProviderData?.email || currentUser.email || '';
    if (!googleUid || !ownerEmail) {
      throw new Error('حساب المالك الحالي غير مرتبط بمزود Google لتفويض Google Drive.');
    }

    let session = getActiveDriveSession();
    if (session) {
      try {
        session = assertDriveSessionMatchesAccount(session, {
          googleUid,
          email: ownerEmail,
          linkedSub: currentOrg.driveGoogleSub,
          linkedEmail: currentOrg.driveAccountEmail,
        });
      } catch {
        session = null;
      }
    }

    if (!session) {
      session = await requestDriveAuthorization(googleUid, ownerEmail, {
        linkedSub: currentOrg.driveGoogleSub,
        linkedEmail: currentOrg.driveAccountEmail,
      });
    }

    const downloaded = await downloadOriginalClosingExcelFromDrive({
      token: session.accessToken,
      org: currentOrg,
      closing,
      archiveRecord,
    });

    downloadXlsxBytes(downloaded.bytes, downloaded.fileName);
    return {
      fileName: downloaded.fileName,
      revision: downloaded.revision,
    };
  };

  const logout = async () => {
    setLoading(true);
    try {
      clearDriveSession();
      await signOut(auth);
      setUserProfile(null);
      setCurrentOrg(null);
      setBranches([]);
      setCurrentBranch(null);
      setEmployees([]);
      setClosings([]);
      setClosingArchives([]);
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

  const driveReadiness = evaluateOrgDriveReadiness(currentOrg, currentBranch);

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
        closingArchives,
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
        saveDriveConnection,
        recordDriveHealthFailure,
        disconnectDriveConnection,
        archiveClosingToDrive,
        archivePendingClosingsToDrive,
        downloadArchivedExcelFromDrive,
        driveReadiness,
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
