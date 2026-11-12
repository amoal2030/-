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
  GitBranch,
  CheckCircle2,
  Info,
  ExternalLink,
  Laptop,
  Smartphone,
  Sparkles,
  AlertCircle,
  Clock,
  KeyRound,
  FolderPlus,
  FolderCheck,
  RefreshCw,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import {
  requestDriveAuthorization,
  getActiveDriveSession,
  clearDriveSession,
  inspectOrCreateTestFolder,
  DriveTokenSession,
  TestFolderInspectionResult,
} from '../../services/driveService';

export const SettingsView: React.FC = () => {
  const { currentOrg, currentBranch, branches, userProfile, setCurrentBranch, currentUser } = useAuth();
  const { language, setLanguage, t, direction } = useLanguage();
  const { theme, toggleTheme, setTheme } = useTheme();

  const [savedNotice, setSavedNotice] = useState(false);

  // Google Drive Phase 1 In-Memory Sandbox States (Zero Firestore Writes)
  const [driveSession, setDriveSession] = useState<DriveTokenSession | null>(() => getActiveDriveSession());
  const [driveLoading, setDriveLoading] = useState(false);
  const [folderLoading, setFolderLoading] = useState(false);
  const [folderResult, setFolderResult] = useState<TestFolderInspectionResult | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [remainingMinutes, setRemainingMinutes] = useState<number>(0);

  // Verify that the logged in user is the verified organization owner
  const isOrgOwner = Boolean(
    currentUser &&
    currentOrg &&
    userProfile?.role === 'manager' &&
    currentUser.uid === currentOrg.ownerId
  );

  // Extract the Google provider specifically (do NOT assume providerData[0])
  const googleProvider = currentUser?.providerData?.find((p) => p.providerId === 'google.com') || null;
  const isGoogleProviderPresent = Boolean(googleProvider);

  // Dynamic token lifetime countdown
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

  const handleAuthorizeDrive = async () => {
    setDriveError(null);
    setFolderResult(null);

    if (!isOrgOwner) {
      setDriveError('عفواً، هذا الإجراء مخصص حصرياً لمالك المؤسسة المعتمد في السجل.');
      return;
    }

    if (!googleProvider?.uid) {
      setDriveError(
        'لم يتم العثور على مزود Google مرتبط بحسابك في Firebase. يرجى تسجيل الدخول بحساب Google المعتمد للمالك.'
      );
      return;
    }

    setDriveLoading(true);
    try {
      const session = await requestDriveAuthorization(
        googleProvider.uid,
        googleProvider.email || currentOrg?.ownerEmail || ''
      );
      setDriveSession(session);
      const diffMs = session.expiresAt - Date.now();
      setRemainingMinutes(Math.max(0, Math.floor(diffMs / 60000)));
    } catch (err: any) {
      setDriveError(err?.message || 'فشل تفويض Google Drive.');
      setDriveSession(null);
    } finally {
      setDriveLoading(false);
    }
  };

  const handleInspectFolder = async () => {
    setDriveError(null);
    setFolderResult(null);

    const session = getActiveDriveSession();
    if (!session?.accessToken) {
      setDriveError('انتهت صلاحية جلسة التفويض المؤقتة في الذاكرة. يرجى إعادة التفويض أولاً.');
      setDriveSession(null);
      return;
    }

    setFolderLoading(true);
    try {
      const result = await inspectOrCreateTestFolder(session.accessToken);
      setFolderResult(result);
      if (result.status === 'error') {
        setDriveError(result.message);
      }
    } catch (err: any) {
      setDriveError(err?.message || 'حدث خطأ غير متوقع أثناء فحص مجلد الاختبار.');
    } finally {
      setFolderLoading(false);
    }
  };

  const handleClearDriveSession = () => {
    clearDriveSession();
    setDriveSession(null);
    setFolderResult(null);
    setDriveError(null);
    setRemainingMinutes(0);
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

          {/* Card: Google Drive Phase 1 Sandbox (Zero Firestore Writes) */}
          <section className="bg-white dark:bg-[#0c1829] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>ربط Google Drive التجريبي — المرحلة الأولى</span>
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    مخصص لمالك المؤسسة المعتمد فقط • جلسة مؤقتة في الذاكرة (لا كتابة في قاعدة البيانات)
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              {driveSession ? (
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>مفوض مؤقتاً للجلسة الحالية</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-100 dark:bg-[#070e17] border border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>غير مفوض (في الذاكرة)</span>
                </div>
              )}
            </div>

            {/* Error or Notice Alert */}
            {driveError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>تنبيه أمان وتفويض:</span>
                </div>
                <p className="pr-6 leading-relaxed text-slate-700 dark:text-slate-300">{driveError}</p>
              </div>
            )}

            {/* Owner Pre-Check Notice */}
            {!isOrgOwner ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  <span>خاص بمالك المنشأة المعتمد:</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  حسابك الحالي مسجل بالدور ({userProfile?.role || 'مستخدم'}). هذا الاختبار متاح حصرياً لحساب مالك المنشأة المسجل ({currentOrg?.ownerEmail || 'المالك'}).
                </p>
              </div>
            ) : !isGoogleProviderPresent ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span>يلزم تسجيل الدخول بحساب Google:</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  تم تسجيل دخولك بالبريد وكلمة المرور دون مزود Google في Firebase. لمطابقة الهوية بأمان، يرجى تسجيل الخروج ثم الدخول باستخدام زر Google للمالك.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Active Session Details */}
                {driveSession ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800 space-y-1">
                        <span className="text-slate-400 block text-[11px]">حساب Google المتحقق منه</span>
                        <span className="font-bold text-slate-900 dark:text-white truncate block">
                          {driveSession.email}
                        </span>
                        <span className="text-[10px] text-amber-500 block">
                          {driveSession.name || 'مالك المؤسسة'}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800 space-y-1">
                        <span className="text-slate-400 block text-[11px]">معرف مزود Google (Sub ID)</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300 truncate block text-[11px]">
                          {driveSession.sub}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          مطابق لـ Firebase Google UID
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800 space-y-1">
                        <span className="text-slate-400 block text-[11px] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>صلاحية التوكن المتبقية</span>
                        </span>
                        <span className="font-bold text-amber-500 text-sm block">
                          {remainingMinutes > 0 ? `${remainingMinutes} دقيقة` : 'أقل من دقيقة'}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          مشتقة من expires_in الفعلي
                        </span>
                      </div>
                    </div>

                    {/* Temporary Session Notice */}
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-500">
                        <Info className="w-3.5 h-3.5" />
                        <span>تنبيه الجلسة المؤقتة (Phase 1):</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        رمز الوصول محفوظ في ذاكرة المتصفح فقط خلال هذه الجلسة، ولم يتم ولن يتم حفظ أي رمز أو معرّف في Firestore أو التخزين المحلي. تحديث الصفحة أو إغلاقها سيتطلب إعادة منح التفويض.
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleInspectFolder}
                        disabled={folderLoading}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 shadow-sm flex items-center gap-2 transition-all active:scale-95"
                      >
                        {folderLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        ) : (
                          <FolderPlus className="w-4 h-4 text-slate-950" />
                        )}
                        <span>
                          {folderLoading ? 'جاري فحص مجلد الاختبار في Drive...' : 'فحص / إنشاء مجلد الاختبار (AL EQFAL - TEST)'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleClearDriveSession}
                        className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 bg-slate-100 dark:bg-[#070e17] border border-slate-300 dark:border-slate-800 flex items-center gap-2 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>مسح التوكن من الذاكرة</span>
                      </button>
                    </div>

                    {/* Inspection Result Card */}
                    {folderResult && (
                      <div className="p-4 rounded-xl border space-y-3 bg-slate-50 dark:bg-[#070e17] border-slate-200 dark:border-slate-800 text-xs">
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
                          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                            <FolderCheck className="w-4 h-4 text-amber-500" />
                            <span>نتيجة فحص مجلد الاختبار:</span>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                              folderResult.status === 'created_new' || folderResult.status === 'found_single'
                                ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                            }`}
                          >
                            {folderResult.status === 'created_new'
                              ? 'تم إنشاء مجلد جديد'
                              : folderResult.status === 'found_single'
                              ? 'تم اعتماد مجلد قائم'
                              : folderResult.status === 'found_multiple'
                              ? 'تعدد المجلدات (توقف أمني)'
                              : 'تعثر الفحص'}
                          </span>
                        </div>

                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                          {folderResult.message}
                        </p>

                        {folderResult.folderId && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                            <div className="p-2.5 rounded-lg bg-white dark:bg-[#0c1829] border border-slate-200 dark:border-slate-800">
                              <span className="text-slate-400 block text-[10px] font-sans">معرّف المجلد في Drive (Folder ID)</span>
                              <span className="text-amber-500 font-bold truncate block select-all">
                                {folderResult.folderId}
                              </span>
                            </div>

                            <div className="p-2.5 rounded-lg bg-white dark:bg-[#0c1829] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                              <div>
                                <span className="text-slate-400 block text-[10px] font-sans">معاينة مباشرة</span>
                                <span className="text-slate-700 dark:text-slate-300 font-sans">
                                  {folderResult.folderName || 'AL EQFAL - TEST'}
                                </span>
                              </div>
                              {folderResult.webViewLink && (
                                <a
                                  href={folderResult.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-bold font-sans text-xs flex items-center gap-1 transition-colors"
                                >
                                  <span>فتح المجلد</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {folderResult.status === 'found_multiple' && folderResult.matchingFolderIds && (
                          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 space-y-1 text-[11px]">
                            <span className="text-rose-500 font-bold block">معرفات المجلدات المتطابقة في حساب Drive:</span>
                            <div className="space-y-0.5 font-mono text-slate-700 dark:text-slate-300">
                              {folderResult.matchingFolderIds.map((id) => (
                                <div key={id} className="truncate select-all bg-white dark:bg-[#0c1829] px-2 py-1 rounded border border-rose-500/20">
                                  {id}
                                </div>
                              ))}
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
                              تم التوقف فوراً دون اختيار عشوائي. يرجى حذف المجلدات الزائدة أو دمجها في Google Drive ثم إعادة الفحص.
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Initial Authorization Button */
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800 space-y-3">
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      لبدء فحص أو إنشاء مجلد الاختبار <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-amber-500">AL EQFAL - TEST</code>، يلزم تفويض حساب Google الخاص بمالك المؤسسة ({googleProvider?.email || currentOrg?.ownerEmail}).
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleAuthorizeDrive}
                        disabled={driveLoading}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 shadow-sm flex items-center gap-2 transition-all active:scale-95"
                      >
                        {driveLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        ) : (
                          <KeyRound className="w-4 h-4 text-slate-950" />
                        )}
                        <span>
                          {driveLoading ? 'جاري التحقق من هوية Google...' : 'بدء تفويض Google Drive المؤقت للاختبار'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
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
