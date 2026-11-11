/**
 * الإقفال | AL EQFAL
 * Main Application Component with Firebase Multi-Tenant Authentication & Architecture
 */

import React, { useState } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { OrganizationOnboarding } from './components/OrganizationOnboarding';
import { Dashboard } from './components/Dashboard';
import { CheckCircle2, Lock, ShieldCheck, Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { direction, t } = useLanguage();
  const { currentUser, userProfile, currentOrg, loading, needsOnboarding, authNotice, clearAuthNotice } = useAuth();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'manager' | 'employee' | 'register'>('manager');
  const [showPhasesOverview, setShowPhasesOverview] = useState(false);

  // Synchronize URL hash (#login, #register, ?login=true) for direct navigation
  React.useEffect(() => {
    const handleUrlAuth = () => {
      const hash = window.location.hash;
      const search = new URLSearchParams(window.location.search);
      if (
        hash === '#login' ||
        hash === '#auth' ||
        hash === '#register' ||
        search.get('login') !== null ||
        search.get('auth') !== null
      ) {
        const tab =
          hash === '#register' || search.get('tab') === 'register'
            ? 'register'
            : search.get('role') === 'employee' || hash === '#employee'
            ? 'employee'
            : 'manager';
        setAuthInitialTab(tab);
        setAuthModalOpen(true);
      }
    };

    handleUrlAuth();
    window.addEventListener('hashchange', handleUrlAuth);
    return () => window.removeEventListener('hashchange', handleUrlAuth);
  }, []);

  const handleOpenAuth = (tab: 'manager' | 'employee' | 'register') => {
    setAuthInitialTab(tab);
    setAuthModalOpen(true);
  };

  const handleCloseAuth = () => {
    setAuthModalOpen(false);
    if (window.location.hash === '#login' || window.location.hash === '#auth' || window.location.hash === '#register') {
      try {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      } catch (e) {
        // Safe fallback
      }
    }
  };

  // Global Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#070e17] text-slate-900 dark:text-white" dir={direction}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#0b192c] border border-amber-500/40 text-amber-400 mx-auto flex items-center justify-center shadow-2xl relative">
            <Lock className="w-7 h-7 animate-pulse text-amber-400" />
            <div className="absolute inset-0 rounded-3xl border-2 border-amber-400/20 border-t-amber-400 animate-spin" />
          </div>
          <div>
            <h2 className="text-lg font-bold">الإقفال | AL EQFAL</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">جاري الاتصال بقاعدة بيانات Cloud Firestore...</p>
          </div>
        </div>
      </div>
    );
  }

  // Safe In-App Notification Banner (iFrame & Sandbox compliant)
  const NoticeBanner = authNotice ? (
    <div className="fixed top-4 inset-x-4 max-w-md mx-auto z-50 p-4 rounded-2xl bg-[#0b192c] border border-amber-500/50 shadow-2xl text-white flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 animate-pulse" />
        <p className="text-xs text-slate-200 font-medium">{authNotice.message}</p>
      </div>
      <button
        onClick={clearAuthNotice}
        className="text-xs text-amber-400 hover:text-amber-300 font-medium shrink-0 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20"
      >
        إغلاق
      </button>
    </div>
  ) : null;

  // First-time Manager Setup Screen
  if (currentUser && needsOnboarding) {
    return (
      <>
        {NoticeBanner}
        <OrganizationOnboarding />
      </>
    );
  }

  // Authenticated Organization Dashboard (Manager or Employee)
  if (currentUser && currentOrg) {
    return (
      <>
        {NoticeBanner}
        <Dashboard />
      </>
    );
  }

  // Public Landing Page (Visitors & Unauthenticated Users)
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#070e17] text-slate-900 dark:text-slate-100 transition-colors" dir={direction}>
      {NoticeBanner}
      {/* Top Navigation */}
      <Navbar onOpenAuth={handleOpenAuth} />

      {/* Main Landing & Presentation */}
      <main className="flex-1">
        <LandingPage onOpenAuth={handleOpenAuth} />
      </main>

      {/* Footer */}
      <Footer />

      {/* Auth & Registration Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialTab={authInitialTab}
        onClose={handleCloseAuth}
      />

      {/* Phase 2 Operational Floating Badge */}
      <aside aria-label="حالة مراحل التأسيس" className="fixed bottom-4 start-4 z-40 hidden sm:block">
        <div className="bg-[#0b192c]/95 backdrop-blur-md text-white border border-amber-500/40 rounded-2xl p-3.5 shadow-xl text-xs max-w-sm space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-bold text-amber-300">مراحل تأسيس مشروع الإقفال</span>
            </div>
            <button
              onClick={() => setShowPhasesOverview(!showPhasesOverview)}
              className="text-[11px] text-slate-300 hover:text-white underline"
            >
              {showPhasesOverview ? 'إخفاء' : 'عرض التفاصيل'}
            </button>
          </div>

          <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>المرحلة 2: ربط Firebase وقواعد البيانات والأمان (مكتملة بنجاح)</span>
          </div>

          {showPhasesOverview && (
            <div className="pt-2 border-t border-slate-700 space-y-1.5 text-[11px] text-slate-400">
              <div className="text-amber-400 font-semibold">الميزات الفعالة حالياً:</div>
              <div>• Firebase Authentication لمصادقة المدير عبر Google والموظف بالبريد.</div>
              <div>• إنشاء حساب الموظف بواسطة المدير دون تسجيل خروج المدير.</div>
              <div>• Cloud Firestore مهيأة بهيكل Multi-Tenant وعزل تام بين المؤسسات.</div>
              <div>• نشر قواعد الأمان Firestore Security Rules.</div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
