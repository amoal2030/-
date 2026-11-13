import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { SupportedLanguage } from '../../types';
import {
  Settings,
  Building2,
  Globe,
  Sun,
  Moon,
  ShieldCheck,
  HardDrive,
  CheckCircle2,
  Info,
  ExternalLink,
  AlertCircle,
  Clock,
  FolderPlus,
  FolderCheck,
  RefreshCw,
  ShieldAlert,
  Link2,
  Unlink,
  FolderTree,
} from 'lucide-react';
import {
  requestDriveAuthorization,
  getActiveDriveSession,
  clearDriveSession,
  getDriveOAuthClientConfig,
  provisionOrganizationDriveHierarchy,
  assertDriveSessionMatchesAccount,
  buildGoogleDriveFolderUrl,
  DriveTokenSession,
  OrgDriveProvisionResult,
} from '../../services/driveService';

export const SettingsView: React.FC = () => {
  const {
    currentOrg,
    currentBranch,
    branches,
    userProfile,
    setCurrentBranch,
    currentUser,
    saveDriveConnection,
    disconnectDriveConnection,
  } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();

  const [savedNotice, setSavedNotice] = useState(false);

  // Google Drive Phase 1 States (Access Token remains strictly in RAM)
  const [driveSession, setDriveSession] = useState<DriveTokenSession | null>(() => getActiveDriveSession());
  const [driveLoading, setDriveLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [driveSuccess, setDriveSuccess] = useState<string | null>(null);
  const [remainingMinutes, setRemainingMinutes] = useState<number>(0);

  const oauthConfig = getDriveOAuthClientConfig();
  const isOAuthConfigured = oauthConfig.source === 'vite_env' && Boolean(oauthConfig.clientId);

  // Strict organization owner verification (never rely on role === 'manager' alone)
  const isOrgOwner = Boolean(
    currentUser &&
      currentOrg &&
      userProfile?.role === 'manager' &&
      userProfile?.isActive &&
      currentUser.uid === currentOrg.ownerId
  );

  // Extract the Google provider specifically (never assume providerData[0])
  const googleProvider = currentUser?.providerData?.find((p) => p.providerId === 'google.com') || null;
  const isGoogleProviderPresent = Boolean(googleProvider?.uid);
  const currentYearMonth = new Date().toISOString().slice(0, 7);
  const linkedDriveEmail =
    currentOrg?.driveAccountEmail || googleProvider?.email || currentOrg?.ownerEmail || '';

  const assertCompleteProvisionResult = (
    result: OrgDriveProvisionResult,
    expectedBranchCount: number
  ) => {
    if (!result.orgFolder?.folderId || !result.orgFolder?.verifiedViaGet) {
      throw new Error('لم يكتمل التحقق الفعلي من مجلد المؤسسة في Google Drive عبر files.get.');
    }
    if (result.branchResults.length !== expectedBranchCount) {
      throw new Error(
        `لم تكتمل مزامنة جميع الفروع: تم التحقق من (${result.branchResults.length}) من أصل (${expectedBranchCount}) فرع.`
      );
    }
    for (const br of result.branchResults) {
      if (!br.branchFolder?.folderId || !br.branchFolder?.verifiedViaGet) {
        throw new Error(`تعذر التحقق الفعلي من مجلد الفرع "${br.branchName}" في Google Drive.`);
      }
      if (!br.monthFolder?.folderId) {
        throw new Error(
          `تعذر التحقق الفعلي من مجلد الشهر "${currentYearMonth}" للفرع "${br.branchName}" في Google Drive.`
        );
      }
    }
    const expectedTotal = 1 + expectedBranchCount * 2;
    if (result.verifiedCount !== expectedTotal) {
      throw new Error(
        `عدد المجلدات المتحقق منها (${result.verifiedCount}) لا يطابق العدد المطلوب (${expectedTotal}).`
      );
    }
  };

  // Dynamic in-memory token lifetime countdown
  useEffect(() => {
    const updateRemaining = () => {
      const session = getActiveDriveSession();
      setDriveSession(session);
      if (session) {
        const diffMs = session.expiresAt - Date.now();
        setRemainingMinutes(Math.max(0, Math.floor(diffMs / 60000)));
      } else {
        setRemainingMinutes(0);
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleConnectDrive = async () => {
    setDriveError(null);
    setDriveSuccess(null);
    setConfirmDisconnect(false);

    if (!currentOrg || !isOrgOwner) {
      setDriveError('عفواً، ربط Google Drive مقتصر حصراً على مالك المؤسسة المعتمد.');
      return;
    }

    if (!isGoogleProviderPresent || !googleProvider?.uid) {
      setDriveError(
        'لم يتم العثور على مزود Google مرتبط بحسابك في Firebase. يرجى تسجيل الدخول بحساب Google المعتمد للمالك.'
      );
      return;
    }

    if (!isOAuthConfigured) {
      setDriveError(
        'متغير البيئة VITE_GOOGLE_DRIVE_CLIENT_ID غير مضبوط في نسخة البناء الحالية. يرجى ضبطه قبل تفعيل الربط.'
      );
      return;
    }

    const ownerEmail = googleProvider.email || currentOrg.ownerEmail || '';
    const linkedConstraint = currentOrg.driveConnected
      ? {
          linkedSub: currentOrg.driveGoogleSub,
          linkedEmail: currentOrg.driveAccountEmail,
        }
      : undefined;

    setDriveLoading(true);
    try {
      const session = await requestDriveAuthorization(
        googleProvider.uid,
        ownerEmail,
        linkedConstraint
      );

      assertDriveSessionMatchesAccount(session, {
        googleUid: googleProvider.uid,
        email: ownerEmail,
        linkedSub: linkedConstraint?.linkedSub,
        linkedEmail: linkedConstraint?.linkedEmail,
      });

      setDriveSession(session);
      setRemainingMinutes(Math.max(0, Math.floor((session.expiresAt - Date.now()) / 60000)));

      const provisionResult = await provisionOrganizationDriveHierarchy({
        token: session.accessToken,
        org: currentOrg,
        branches,
        yearMonth: currentYearMonth,
      });

      assertCompleteProvisionResult(provisionResult, branches.length);

      await saveDriveConnection({
        driveAccountEmail: session.email,
        driveAccountName: session.name,
        driveGoogleSub: session.sub,
        orgFolderId: provisionResult.orgFolder.folderId,
        orgFolderName: provisionResult.orgFolder.folderName,
        orgFolderLink: provisionResult.orgFolder.webViewLink,
        branchFolders: provisionResult.branchResults.map((r) => ({
          branchId: r.branchId,
          folderId: r.branchFolder.folderId,
          folderName: r.branchFolder.folderName,
          webViewLink: r.branchFolder.webViewLink,
        })),
        monthFolderMap: provisionResult.monthFolderMap,
      });

      setDriveSuccess(
        `تم التحقق الفعلي من حساب (${session.email}) ومجلد المؤسسة "${provisionResult.orgFolder.folderName}" وتهيئة (${provisionResult.branchResults.length}) فرع لشهر ${currentYearMonth} بنجاح.`
      );
    } catch (err: any) {
      setDriveError(err?.message || 'تعذر إتمام ربط Google Drive.');
      setDriveSession(getActiveDriveSession());
    } finally {
      setDriveLoading(false);
    }
  };

  const handleSyncDriveFolders = async () => {
    setDriveError(null);
    setDriveSuccess(null);

    if (!currentOrg || !isOrgOwner) {
      setDriveError('مزامنة مجلدات Drive مقتصرة حصراً على مالك المؤسسة المعتمد.');
      return;
    }

    if (!isGoogleProviderPresent || !googleProvider?.uid) {
      setDriveError('يلزم تسجيل الدخول بحساب Google المعتمد للمالك لإعادة التفويض ومزامنة المجلدات.');
      return;
    }

    const ownerEmail = googleProvider.email || currentOrg.ownerEmail || '';

    // Strict check: signed-in owner Google account must match the organization's linked Drive account
    if (currentOrg.driveGoogleSub && currentOrg.driveGoogleSub !== googleProvider.uid) {
      setDriveError(
        `حساب Google المسجل دخولاً به (${ownerEmail}) لا يطابق حساب Google المرتبط بالمؤسسة (${
          currentOrg.driveAccountEmail || currentOrg.driveGoogleSub
        }). يرجى تسجيل الدخول بالحساب المرتبط أو فصل الربط أولاً.`
      );
      return;
    }
    if (
      currentOrg.driveAccountEmail &&
      ownerEmail &&
      currentOrg.driveAccountEmail.toLowerCase().trim() !== ownerEmail.toLowerCase().trim()
    ) {
      setDriveError(
        `البريد الإلكتروني الحالي (${ownerEmail}) لا يطابق بريد Google المرتبط بالمؤسسة (${currentOrg.driveAccountEmail}). تم إيقاف المزامنة.`
      );
      return;
    }

    setSyncLoading(true);
    try {
      let session = getActiveDriveSession();
      if (session) {
        assertDriveSessionMatchesAccount(session, {
          googleUid: googleProvider.uid,
          email: ownerEmail,
          linkedSub: currentOrg.driveGoogleSub,
          linkedEmail: currentOrg.driveAccountEmail,
        });
      } else {
        if (!isOAuthConfigured) {
          throw new Error('متغير البيئة VITE_GOOGLE_DRIVE_CLIENT_ID غير مضبوط في نسخة البناء الحالية.');
        }
        session = await requestDriveAuthorization(googleProvider.uid, ownerEmail, {
          linkedSub: currentOrg.driveGoogleSub,
          linkedEmail: currentOrg.driveAccountEmail,
        });
        assertDriveSessionMatchesAccount(session, {
          googleUid: googleProvider.uid,
          email: ownerEmail,
          linkedSub: currentOrg.driveGoogleSub,
          linkedEmail: currentOrg.driveAccountEmail,
        });
        setDriveSession(session);
        setRemainingMinutes(Math.max(0, Math.floor((session.expiresAt - Date.now()) / 60000)));
      }

      const provisionResult = await provisionOrganizationDriveHierarchy({
        token: session.accessToken,
        org: currentOrg,
        branches,
        yearMonth: currentYearMonth,
      });

      // Never treat Firestore write alone as proof; ensure every folder passed Drive verification first
      assertCompleteProvisionResult(provisionResult, branches.length);

      await saveDriveConnection({
        driveAccountEmail: session.email,
        driveAccountName: session.name,
        driveGoogleSub: session.sub,
        orgFolderId: provisionResult.orgFolder.folderId,
        orgFolderName: provisionResult.orgFolder.folderName,
        orgFolderLink: provisionResult.orgFolder.webViewLink,
        branchFolders: provisionResult.branchResults.map((r) => ({
          branchId: r.branchId,
          folderId: r.branchFolder.folderId,
          folderName: r.branchFolder.folderName,
          webViewLink: r.branchFolder.webViewLink,
        })),
        monthFolderMap: provisionResult.monthFolderMap,
      });

      setDriveSuccess(
        `تم التحقق الفعلي من مجلد المؤسسة وتحديث مجلدات (${provisionResult.branchResults.length}) فرع لشهر ${currentYearMonth} في حساب (${session.email}) بنجاح.`
      );
    } catch (err: any) {
      setDriveError(err?.message || 'حدث خطأ أثناء مزامنة مجلدات Google Drive.');
      setDriveSession(getActiveDriveSession());
    } finally {
      setSyncLoading(false);
    }
  };

  const handleConfirmDisconnect = async () => {
    setDriveError(null);
    setDriveSuccess(null);

    if (!isOrgOwner) {
      setDriveError('فصل ربط Google Drive مقتصر حصراً على مالك المؤسسة المعتمد.');
      return;
    }

    setDisconnectLoading(true);
    try {
      await disconnectDriveConnection();
      clearDriveSession();
      setDriveSession(null);
      setRemainingMinutes(0);
      setConfirmDisconnect(false);
      setDriveSuccess('تم فصل ربط Google Drive من إعدادات المؤسسة مع الإبقاء على جميع الملفات والسجلات دون حذف.');
    } catch (err: any) {
      setDriveError(err?.message || 'تعذر فصل ربط Google Drive.');
    } finally {
      setDisconnectLoading(false);
    }
  };

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleThemeChange = (mode: 'dark' | 'light') => {
    setTheme(mode);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleBranchSwitch = (branchId: string) => {
    const selected = branches.find((b) => b.id === branchId);
    if (selected) {
      setCurrentBranch(selected);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-500" />
            <span>إعدادات المؤسسة والنظام</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            إدارة بيانات المنشأة، تفضيلات العرض واللغة، ومتابعة جاهزية النشر على GitHub Pages
          </p>
        </div>

        {savedNotice && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-semibold animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>تم حفظ التفضيلات بنجاح</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Core Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Organization Details */}
          <section className="bg-white dark:bg-[#0c1829] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  بيانات المؤسسة المعتمدة
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  المعلومات الأساسية الموثقة في السجل السحابي
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200/80 dark:border-slate-800/80 space-y-1">
                <span className="text-slate-400 block font-medium">اسم المؤسسة</span>
                <span className="text-slate-900 dark:text-white font-bold text-sm">
                  {currentOrg?.name || 'غير محدد'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200/80 dark:border-slate-800/80 space-y-1">
                <span className="text-slate-400 block font-medium">معرف المنشأة (Org ID)</span>
                <span className="text-slate-900 dark:text-slate-200 font-mono font-medium truncate block">
                  {currentOrg?.id || 'غير محدد'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200/80 dark:border-slate-800/80 space-y-1">
                <span className="text-slate-400 block font-medium">السجل التجاري</span>
                <span className="text-slate-900 dark:text-white font-bold">
                  {currentOrg?.commercialRegistration || 'لا يوجد رقم مسجل'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200/80 dark:border-slate-800/80 space-y-1">
                <span className="text-slate-400 block font-medium">العملة الأساسية</span>
                <span className="text-amber-500 font-bold text-sm">
                  {currentOrg?.currency || 'SAR'} (ريال سعودي)
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200/80 dark:border-slate-800/80 space-y-1">
                <span className="text-slate-400 block font-medium">نوع النشاط التجاري</span>
                <span className="text-slate-900 dark:text-white font-medium">
                  {currentOrg?.activityType === 'restaurant'
                    ? 'مطاعم وكافيهات'
                    : currentOrg?.activityType === 'retail'
                    ? 'تجارة تجزئة ومحلات'
                    : currentOrg?.activityType === 'supermarket'
                    ? 'سوبرماركت وتموينات'
                    : 'نشاط تجاري عام'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200/80 dark:border-slate-800/80 space-y-1">
                <span className="text-slate-400 block font-medium">الفرع النشط الحالي</span>
                <select
                  value={currentBranch?.id || ''}
                  onChange={(e) => handleBranchSwitch(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#0c1829] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-1 focus:ring-amber-500"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Card 2: Google Drive Organization Link (Owner Only) */}
          <section className="bg-white dark:bg-[#0c1829] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>ربط Google Drive</span>
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ربط حساب Drive الخاص بمالك المؤسسة للأرشفة اللامركزية • نطاق drive.file فقط
                  </span>
                </div>
              </div>

              {/* Connection Status Badge */}
              <div className="flex flex-wrap items-center gap-2">
                {currentOrg?.driveConnected ? (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>مرتبط بحساب المالك</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-100 dark:bg-[#070e17] border border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>غير مرتبط</span>
                  </div>
                )}

                {driveSession && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#070e17] border border-amber-500/30 text-amber-500 text-[11px] font-bold">
                    <Clock className="w-3 h-3" />
                    <span>
                      جلسة تفويض نشطة: {remainingMinutes > 0 ? `${remainingMinutes} د` : '< 1 د'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Alerts */}
            {driveError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>تنبيه أمان وتفويض:</span>
                </div>
                <p className="pr-6 leading-relaxed text-slate-700 dark:text-slate-300">{driveError}</p>
              </div>
            )}

            {driveSuccess && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>حالة ربط Google Drive:</span>
                </div>
                <p className="pr-6 leading-relaxed text-slate-700 dark:text-slate-300">{driveSuccess}</p>
              </div>
            )}

            {/* Missing VITE_GOOGLE_DRIVE_CLIENT_ID Notice */}
            {isOrgOwner && !isOAuthConfigured && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-500">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>إعداد متغير البيئة مطلوب قبل الربط الفعلي</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  لم يُعثر على متغير البيئة{' '}
                  <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-amber-500">
                    VITE_GOOGLE_DRIVE_CLIENT_ID
                  </code>{' '}
                  في نسخة التشغيل الحالية. يجب تمرير معرّف OAuth 2.0 Web Client ID أثناء بناء التطبيق وتفعيل النطاق المنشور في Google Cloud Console.
                </p>
              </div>
            )}

            {/* Strict Owner Gate */}
            {!isOrgOwner ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  <span>خاص بمالك المؤسسة المعتمد فقط:</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  لا يُسمح للموظفين أو مديري الفروع بربط أو تعديل إعدادات Google Drive. هذا الإجراء متاح حصرياً لحساب مالك المؤسسة ({currentOrg?.ownerEmail || 'المالك'}).
                </p>
              </div>
            ) : !isGoogleProviderPresent ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span>يلزم تسجيل الدخول بحساب Google المعتمد:</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  حسابك الحالي غير مرتبط بمزود Google في جلسة Firebase. لمطابقة هوية المالك بأمان قبل منح صلاحية Drive، يرجى تسجيل الدخول باستخدام زر Google.
                </p>
              </div>
            ) : currentOrg?.driveConnected ? (
              /* Connected State */
              <div className="space-y-4">
                {/* Linked Account & Root Folder Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-slate-400 block text-[11px]">حساب Google المرتبط</span>
                    <span className="font-bold text-slate-900 dark:text-white truncate block">
                      {currentOrg.driveAccountEmail || currentOrg.ownerEmail}
                    </span>
                    <span className="text-[11px] text-amber-500 block truncate">
                      {currentOrg.driveAccountName || currentOrg.ownerName}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-slate-400 block text-[11px]">تاريخ الربط والتحقق</span>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {currentOrg.driveLinkedAt
                        ? new Date(currentOrg.driveLinkedAt).toLocaleString('ar-SA')
                        : 'مربوط'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 truncate block">
                      Sub: {currentOrg.driveGoogleSub || 'موثق'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-slate-400 block text-[11px]">تفويض الجلسة المؤقت (RAM)</span>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {driveSession
                        ? `نشط (${remainingMinutes > 0 ? `${remainingMinutes} دقيقة متبقية` : 'أقل من دقيقة'})`
                        : 'منتهٍ / يتطلب إعادة تفويض عند المزامنة'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      لا يُخزن أي Access Token في Firestore
                    </span>
                  </div>
                </div>

                {/* Organization Root Folder Card */}
                {currentOrg.driveFolderId && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                        <FolderCheck className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>مجلد المؤسسة في Drive:</span>
                        <span className="text-amber-500 font-mono text-[11px] sm:text-xs">
                          {currentOrg.driveFolderName || `AL EQFAL - ${currentOrg.name} - ${currentOrg.id}`}
                        </span>
                      </div>

                      {(currentOrg.driveFolderLink || currentOrg.driveFolderId) && (
                        <a
                          href={buildGoogleDriveFolderUrl(
                            currentOrg.driveFolderLink,
                            currentOrg.driveFolderId,
                            linkedDriveEmail
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
                        >
                          <span>فتح في Google Drive</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate select-all">
                      Folder ID: {currentOrg.driveFolderId}
                    </div>

                    {/* Linked Branches & Current Month Folders */}
                    {branches.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800/70 space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                          <FolderTree className="w-3.5 h-3.5 text-amber-500" />
                          <span>مجلدات الفروع وشهر {currentYearMonth}:</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {branches.map((branch) => {
                            const monthKey = `${branch.id}_${currentYearMonth}`;
                            const monthRef = currentOrg.driveMonthFolderIds?.[monthKey];
                            const targetFolderId = monthRef?.folderId || branch.driveFolderId;
                            const targetLink = monthRef?.webViewLink || branch.driveFolderLink;
                            return (
                              <div
                                key={branch.id}
                                className="p-2.5 rounded-lg bg-white dark:bg-[#0c1829] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                    {branch.name} ({branch.code})
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate">
                                    {branch.driveFolderId
                                      ? monthRef?.folderId
                                        ? `مجلد الفرع + ${currentYearMonth} جاهزان`
                                        : 'مجلد الفرع مربوط'
                                      : 'بانتظار مزامنة مجلد الفرع'}
                                  </div>
                                </div>
                                {targetFolderId && (
                                  <a
                                    href={buildGoogleDriveFolderUrl(
                                      targetLink,
                                      targetFolderId,
                                      linkedDriveEmail
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 rounded bg-slate-100 dark:bg-[#070e17] hover:text-amber-500 text-slate-600 dark:text-slate-300 text-[10px] font-bold shrink-0 inline-flex items-center gap-1"
                                  >
                                    <span>فتح</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleSyncDriveFolders}
                    disabled={syncLoading || driveLoading || disconnectLoading || !isOAuthConfigured}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 shadow-sm flex items-center gap-2 transition-all active:scale-95"
                  >
                    {syncLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <FolderPlus className="w-4 h-4 text-slate-950" />
                    )}
                    <span>
                      {syncLoading
                        ? 'جاري مزامنة المجلدات...'
                        : 'مزامنة مجلدات الفروع والشهر الحالي'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleConnectDrive}
                    disabled={driveLoading || syncLoading || disconnectLoading || !isOAuthConfigured}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#070e17] hover:border-amber-500/50 border border-slate-300 dark:border-slate-800 disabled:opacity-50 flex items-center gap-2 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${driveLoading ? 'animate-spin' : ''}`} />
                    <span>{driveLoading ? 'جاري إعادة الربط...' : 'إعادة ربط'}</span>
                  </button>

                  {!confirmDisconnect ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDisconnect(true)}
                      disabled={driveLoading || syncLoading || disconnectLoading}
                      className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-500 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/25 disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>فصل الاتصال</span>
                    </button>
                  ) : (
                    <div className="w-full p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <span className="text-slate-700 dark:text-slate-200 font-medium">
                        هل تريد فصل ربط Google Drive؟ لن يتم حذف أي ملفات في Drive أو سجلات في النظام.
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleConfirmDisconnect}
                          disabled={disconnectLoading}
                          className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs disabled:opacity-50"
                        >
                          {disconnectLoading ? 'جاري الفصل...' : 'تأكيد الفصل'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDisconnect(false)}
                          disabled={disconnectLoading}
                          className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#0c1829] border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Disconnected State — Primary "ربط Google Drive" Action */
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800 space-y-3.5 text-xs">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  عند ربط حساب{' '}
                  <span className="font-bold text-amber-500">
                    {googleProvider?.email || currentOrg?.ownerEmail}
                  </span>
                  ، سيطلب النظام تفويض نطاق{' '}
                  <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-amber-500">
                    drive.file
                  </code>{' '}
                  فقط، ويتحقق من هوية المالك، ثم ينشئ مجلد المؤسسة{' '}
                  <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-amber-500">
                    AL EQFAL - {currentOrg?.name}
                  </code>{' '}
                  ومجلدات الفروع داخل Google Drive الخاص بالمالك.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleConnectDrive}
                    disabled={driveLoading || !isOAuthConfigured}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 shadow-sm flex items-center gap-2 transition-all active:scale-95"
                  >
                    {driveLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <Link2 className="w-4 h-4 text-slate-950" />
                    )}
                    <span>
                      {driveLoading ? 'جاري التفويض وتهيئة المجلدات...' : 'ربط Google Drive'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Card 2: Appearance & Language Preferences */}
          <section className="bg-white dark:bg-[#0c1829] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  تفضيلات العرض واللغة
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  تخصيص الواجهة واللغة والاتجاه لكل جهاز
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Language Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  لغة النظام (System Language)
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('ar')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      language === 'ar'
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-500 font-bold shadow-sm'
                        : 'bg-slate-50 dark:bg-[#070e17] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span className="text-base block mb-0.5">🇸🇦</span>
                    <span className="text-xs font-bold block">العربية</span>
                    <span className="text-[10px] text-slate-400">RTL (افتراضي)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLanguageChange('en')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      language === 'en'
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-500 font-bold shadow-sm'
                        : 'bg-slate-50 dark:bg-[#070e17] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span className="text-base block mb-0.5">🇬🇧</span>
                    <span className="text-xs font-bold block">English</span>
                    <span className="text-[10px] text-slate-400">LTR Mode</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLanguageChange('ur')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      language === 'ur'
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-500 font-bold shadow-sm'
                        : 'bg-slate-50 dark:bg-[#070e17] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span className="text-base block mb-0.5">🇵🇰</span>
                    <span className="text-xs font-bold block">اردو</span>
                    <span className="text-[10px] text-slate-400">RTL Mode</span>
                  </button>
                </div>
              </div>

              {/* Theme Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  سمة الألوان (Theme Mode)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleThemeChange('dark')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2.5 transition-all ${
                      theme === 'dark'
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-400 font-bold shadow-sm'
                        : 'bg-slate-50 dark:bg-[#070e17] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Moon className="w-4 h-4 text-amber-400" />
                    <span className="text-xs">الوضع الداكن الفاخر (كحلي)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleThemeChange('light')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2.5 transition-all ${
                      theme === 'light'
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-600 font-bold shadow-sm'
                        : 'bg-slate-50 dark:bg-[#070e17] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span className="text-xs">الوضع الفاتح الأنيق (عاجي)</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column (1 Col): System Architecture & GitHub Pages Readiness */}
        <div className="space-y-6">
          {/* Card 3: Architecture & GitHub Pages Info */}
          <section className="bg-white dark:bg-[#0c1829] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>جاهزية النظام والنشر</span>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200/70 dark:border-slate-800/70 space-y-1">
                <span className="text-slate-400 block text-[11px]">الخطة السحابية الحالية</span>
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Firebase Spark (مجانية بالكامل)
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  لا تتطلب فوترة أو بطاقة بنكية، وتعتمد على المعاملات الذرية المحلية المحمية بقواعد أمان Firestore.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200/70 dark:border-slate-800/70 space-y-1">
                <span className="text-slate-400 block text-[11px]">تكوين GitHub Pages</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  base: './' (Relative Assets)
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  المسارات النسبية مهيأة بالكامل لضمان تحميل الخطوط والأيقونات وملفات JS/CSS دون أخطاء 404 عند النشر.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200/70 dark:border-slate-800/70 space-y-1">
                <span className="text-slate-400 block text-[11px]">حماية عزل البيانات</span>
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                  Multi-Tenant Rules Enforced
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  كل مؤسسة معزولة كلياً، وسجلات التدقيق غير قابلة للتعديل أو الحذف، والتصحيح الإداري للمدير محكم بالهللات.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>الإصدار: AL EQFAL v1.0 MVP</span>
              <span className="font-mono">Build: Stable</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
