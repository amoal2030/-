import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ManagerOverview } from './manager/ManagerOverview';
import { BranchesManager } from './manager/BranchesManager';
import { EmployeesManager } from './manager/EmployeesManager';
import { ClosingsReview } from './manager/ClosingsReview';
import { FinancialReports } from './manager/FinancialReports';
import { AuditLogsView } from './manager/AuditLogsView';
import { SettingsView } from './manager/SettingsView';
import { EmployeeDashboard } from './employee/EmployeeDashboard';
import { useTheme } from '../context/ThemeContext';
import { SupportedLanguage } from '../types';
import { getActiveDriveSession } from '../services/driveService';
import {
  Building2,
  Lock,
  LogOut,
  GitBranch,
  Users,
  FileSpreadsheet,
  FileText,
  History,
  TrendingUp,
  HardDrive,
  ShieldCheck,
  RefreshCw,
  Bell,
  Settings,
  Sun,
  Moon,
  Globe,
  ChevronDown,
  AlertTriangle,
  Clock
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const {
    currentUser,
    userProfile,
    currentOrg,
    branches,
    currentBranch,
    closings,
    driveReadiness,
    logout,
    refreshTenantData,
  } = useAuth();
  const { t, language, setLanguage, direction } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const isManager = userProfile?.role === 'manager';

  // Manager navigation tab state (including new Settings tab)
  const [managerTab, setManagerTab] = useState<'overview' | 'closings' | 'reports' | 'branches' | 'employees' | 'audit' | 'settings'>('overview');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [hasActiveDriveSession, setHasActiveDriveSession] = useState<boolean>(() => Boolean(getActiveDriveSession()));

  useEffect(() => {
    const syncSessionFlag = () => setHasActiveDriveSession(Boolean(getActiveDriveSession()));
    syncSessionFlag();
    const interval = setInterval(syncSessionFlag, 15000);
    return () => clearInterval(interval);
  }, [managerTab, currentOrg?.driveConnected, currentOrg?.driveWriteVerifiedAt]);

  // Count pending reviews for manager badge
  const pendingCount = closings.filter((c) => c.status === 'pending_review').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#070e17] text-slate-900 dark:text-slate-100" dir={direction}>
      {/* Top Organization Header */}
      <header className="bg-white dark:bg-[#0c1829] border-b border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Org Badge & Name */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[#0b192c] border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold shadow-md shrink-0">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white truncate max-w-[120px] xs:max-w-[170px] sm:max-w-none">
                    {currentOrg?.name || 'مؤسستي التجارية'}
                  </h1>
                  <span
                    className={`text-[10px] sm:text-[11px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full border shrink-0 ${
                      isManager
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        : 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                    }`}
                  >
                    {isManager ? 'المدير' : 'موظف'}
                  </span>
                </div>
                <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                  <span className="truncate">{currentBranch?.name || 'الفرع الرئيسي'}</span>
                  <span>•</span>
                  <span>{currentOrg?.currency || 'SAR'}</span>
                </div>
              </div>
            </div>

            {/* Header Controls: Theme, Language, Profile & Logout */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? t('lightMode') : t('darkMode')}
                className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 bg-slate-50 dark:bg-[#070e17] transition-colors"
                title={theme === 'dark' ? t('lightMode') : t('darkMode')}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-700" />
                )}
              </button>

              {/* Language Switcher Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLangMenuOpen(!langMenuOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#070e17] hover:border-amber-500/40 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-amber-500" />
                  <span className="uppercase">{language}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {langMenuOpen && (
                  <div className="absolute end-0 mt-1 w-32 rounded-xl bg-white dark:bg-[#0c1829] border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-50 text-xs font-semibold">
                    <button
                      onClick={() => {
                        setLanguage('ar');
                        setLangMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-start flex items-center justify-between ${
                        language === 'ar' ? 'text-amber-500 font-bold bg-amber-500/10' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>العربية</span>
                      <span>🇸🇦</span>
                    </button>
                    <button
                      onClick={() => {
                        setLanguage('en');
                        setLangMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-start flex items-center justify-between ${
                        language === 'en' ? 'text-amber-500 font-bold bg-amber-500/10' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>English</span>
                      <span>🇬🇧</span>
                    </button>
                    <button
                      onClick={() => {
                        setLanguage('ur');
                        setLangMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-start flex items-center justify-between ${
                        language === 'ur' ? 'text-amber-500 font-bold bg-amber-500/10' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>اردو</span>
                      <span>🇵🇰</span>
                    </button>
                  </div>
                )}
              </div>

              {/* User Identity Info */}
              <div className="hidden lg:flex flex-col text-end ps-2 border-s border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                  {userProfile?.displayName || currentUser?.displayName || currentUser?.email}
                </span>
                <span className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                  {currentUser?.email}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors"
                title={t('navLogout')}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t('navLogout')}</span>
              </button>
            </div>
          </div>

          {/* Manager Sub-Navigation (Adaptive: Selector on mobile, Tabs on desktop) */}
          {isManager && (
            <div className="py-2.5 border-t border-slate-100 dark:border-slate-800/80 no-print">
              {/* Mobile Tab Selector (Visible on small screens < 768px) */}
              <div className="block md:hidden">
                <label htmlFor="mobile-manager-nav" className="sr-only">
                  اختر الشاشة
                </label>
                <div className="relative">
                  <select
                    id="mobile-manager-nav"
                    value={managerTab}
                    onChange={(e) => setManagerTab(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="overview">📊 الرئيسية والإحصائيات</option>
                    <option value="closings">📑 مراجعة الإقفالات {pendingCount > 0 ? `(${pendingCount} معلق)` : ''}</option>
                    <option value="reports">📈 التقارير المالية والمجاميع</option>
                    <option value="branches">🏢 إدارة الفروع ({branches.length})</option>
                    <option value="employees">👥 إدارة الموظفين والصلاحيات</option>
                    <option value="audit">🛡️ سجل العمليات والرقابة</option>
                    <option value="settings">⚙️ إعدادات المؤسسة والنظام</option>
                  </select>
                </div>
              </div>

              {/* Desktop Sub-Navigation Bar (Visible on screens >= 768px) */}
              <div className="hidden md:flex items-center gap-1.5 overflow-x-auto text-xs font-semibold scrollbar-none">
                <button
                  onClick={() => setManagerTab('overview')}
                  className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    managerTab === 'overview'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>الرئيسية والإحصائيات</span>
                </button>

                <button
                  onClick={() => setManagerTab('closings')}
                  className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    managerTab === 'closings'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>مراجعة الإقفالات</span>
                  {pendingCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] flex items-center justify-center font-bold">
                      {pendingCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setManagerTab('reports')}
                  className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    managerTab === 'reports'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>التقارير المالية والمجاميع</span>
                </button>

                <button
                  onClick={() => setManagerTab('branches')}
                  className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    managerTab === 'branches'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>إدارة الفروع ({branches.length})</span>
                </button>

                <button
                  onClick={() => setManagerTab('employees')}
                  className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    managerTab === 'employees'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>إدارة الموظفين</span>
                </button>

                <button
                  onClick={() => setManagerTab('audit')}
                  className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    managerTab === 'audit'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>سجل الرقابة</span>
                </button>

                <button
                  onClick={() => setManagerTab('settings')}
                  className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    managerTab === 'settings'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>الإعدادات</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full space-y-6">
        {isManager && !driveReadiness.isReady && managerTab !== 'settings' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border border-rose-500/35 flex flex-wrap items-center justify-between gap-4 no-print">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                  {driveReadiness.message}
                </p>
                {driveReadiness.detail && (
                  <p className="text-slate-600 dark:text-slate-300">{driveReadiness.detail}</p>
                )}
                <p className="text-slate-500 dark:text-slate-400">
                  إدخال الورديات والعمليات التشغيلية الجديدة متوقف تلقائياً للمدير والموظفين حتى إتمام الربط واختبار الكتابة والقراءة.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setManagerTab('settings')}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-sm shrink-0 transition-colors"
            >
              ربط والتحقق من Google Drive
            </button>
          </div>
        )}

        {isManager && driveReadiness.isReady && !hasActiveDriveSession && managerTab !== 'settings' && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-2.5 text-xs text-amber-700 dark:text-amber-300">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                انتهت صلاحية جلسة تفويض Google Drive المؤقتة أو لم تُفعّل في هذا المتصفح. يرجى إعادة التفويض من الإعدادات عند الحاجة للفحص أو المزامنة.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setManagerTab('settings')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 shrink-0 transition-colors"
            >
              إعادة التفويض الآن
            </button>
          </div>
        )}

        {isManager ? (
          /* Manager View Router */
          <>
            {managerTab === 'overview' && (
              <ManagerOverview onNavigateTab={(tab) => setManagerTab(tab)} />
            )}
            {managerTab === 'closings' && <ClosingsReview />}
            {managerTab === 'reports' && <FinancialReports />}
            {managerTab === 'branches' && <BranchesManager />}
            {managerTab === 'employees' && <EmployeesManager />}
            {managerTab === 'audit' && <AuditLogsView />}
            {managerTab === 'settings' && <SettingsView />}
          </>
        ) : (
          /* Dedicated Employee View */
          <EmployeeDashboard />
        )}
      </main>

      {/* Dashboard Bottom Attribution */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800/80 py-4 text-xs text-slate-500 dark:text-slate-400 bg-white/40 dark:bg-[#0c1829]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-start">
          <p>© {new Date().getFullYear()} {currentOrg?.name || 'الإقفال | AL EQFAL'}</p>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <span>صمم من موقع خدماتي البرمجية</span>
            <a
              href="https://amoal2030.github.io/a1/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 underline font-medium transition-colors"
              dir="ltr"
            >
              https://amoal2030.github.io/a1/
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
