/**
 * الإقفال | AL EQFAL
 * Main Application Component
 */

import React, { useState } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { CheckCircle2, ChevronRight, Layers, Lock, ShieldCheck } from 'lucide-react';

const AppContent: React.FC = () => {
  const { direction, t } = useLanguage();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'manager' | 'employee' | 'register'>('manager');
  const [showPhasesOverview, setShowPhasesOverview] = useState(false);

  const handleOpenAuth = (tab: 'manager' | 'employee' | 'register') => {
    setAuthInitialTab(tab);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#070e17] text-slate-900 dark:text-slate-100 transition-colors" dir={direction}>
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
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(role, data) => {
          setAuthModalOpen(false);
        }}
      />

      {/* Phase Status Floating Indicator (Shows Phase 1 Complete & Next Phase Ready) */}
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
            <span>المرحلة الأولى: الهوية والواجهات واللغات والمعادلات (مكتملة بنجاح)</span>
          </div>

          {showPhasesOverview && (
            <div className="pt-2 border-t border-slate-700 space-y-1.5 text-[11px] text-slate-400">
              <div className="text-amber-400 font-semibold">جاهز للانتقال إلى المرحلة الثانية:</div>
              <div>• تفعيل Firebase Authentication وتسجيل الدخول بحساب Google.</div>
              <div>• إنشاء قاعدة بيانات Cloud Firestore متعددة المؤسسات مع قواعد الأمان.</div>
              <div>• عزل بيانات كل مؤسسة وفروعها بالكامل.</div>
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
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}
