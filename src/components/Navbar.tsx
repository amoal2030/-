import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { SupportedLanguage } from '../types';
import {
  Sun,
  Moon,
  Globe,
  Menu,
  X,
  Lock,
  Building2,
  Calculator,
  HelpCircle,
  PhoneCall,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronDown
} from 'lucide-react';

interface NavbarProps {
  onOpenAuth: (initialTab: 'manager' | 'employee' | 'register') => void;
  onNavigateSection?: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, onNavigateSection }) => {
  const { language, setLanguage, t, direction } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const handleNavClick = (sectionId: string) => {
    setMobileMenuOpen(false);
    if (onNavigateSection) {
      onNavigateSection(sectionId);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const languages: { code: SupportedLanguage; label: string; flag: string }[] = [
    { code: 'ar', label: 'العربية', flag: '🇸🇦' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'ur', label: 'اردو', flag: '🇵🇰' },
  ];

  const currentLangObj = languages.find((l) => l.code === language) || languages[0];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/90 dark:bg-[#070e17]/90 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Brand */}
          <div
            onClick={() => handleNavClick('hero')}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none group shrink-0"
          >
            <div className="relative flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#0b192c] to-[#1e293b] border border-amber-500/30 shadow-md shadow-amber-500/10 group-hover:border-amber-400 transition-all shrink-0">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 group-hover:scale-110 transition-transform" />
              <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-amber-400 rounded-full ring-2 ring-[#070e17]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {t('brandName')}
                </span>
                <span className="text-[10px] sm:text-xs font-semibold px-1 sm:px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  {t('brandSub')}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden md:inline-block">
                {t('tagline')}
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            <button
              onClick={() => handleNavClick('features')}
              className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-amber-400 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors"
            >
              {t('navFeatures')}
            </button>
            <button
              onClick={() => handleNavClick('how-it-works')}
              className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-amber-400 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors"
            >
              {t('navHowItWorks')}
            </button>
            <button
              onClick={() => handleNavClick('simulator')}
              className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-amber-400 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-1.5"
            >
              <Calculator className="w-4 h-4 text-amber-500" />
              <span>{t('navSimulator')}</span>
            </button>
            <button
              onClick={() => handleNavClick('benefits')}
              className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-amber-400 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors"
            >
              {t('navBenefits')}
            </button>
            <button
              onClick={() => handleNavClick('faq')}
              className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-amber-400 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors"
            >
              {t('navFaq')}
            </button>
            <button
              onClick={() => handleNavClick('contact')}
              className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-amber-400 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors"
            >
              {t('navContact')}
            </button>
          </nav>

          {/* Right Action Tools: Language, Theme, Auth */}
          <div className="flex items-center gap-1 sm:gap-2.5">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors min-h-[36px]"
                title={t('language')}
                aria-label="تغيير اللغة"
              >
                <Globe className="w-3.5 h-3.5 text-amber-500" />
                <span className="uppercase text-[11px]">{currentLangObj.code}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 hidden xs:inline" />
              </button>

              {langDropdownOpen && (
                <div
                  className={`absolute top-full mt-1.5 w-36 rounded-xl bg-white dark:bg-[#0c1829] border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-50 ${
                    direction === 'rtl' ? 'left-0' : 'right-0'
                  }`}
                >
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLanguage(l.code);
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium transition-colors ${
                        language === l.code
                          ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{l.flag}</span>
                        <span>{l.label}</span>
                      </span>
                      {language === l.code && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dark / Light Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              title={theme === 'dark' ? t('lightMode') : t('darkMode')}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* Sign In Button - ALWAYS visible on mobile & desktop */}
            <button
              onClick={() => onOpenAuth('manager')}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-colors min-h-[36px]"
              title={t('navLogin')}
            >
              <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{t('navLogin')}</span>
            </button>

            {/* Register New Organization Button */}
            <button
              onClick={() => onOpenAuth('register')}
              className="inline-flex items-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-lg shadow-sm shadow-amber-500/20 hover:shadow-amber-500/30 transition-all active:scale-95 min-h-[36px]"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-950 shrink-0" />
              <span className="hidden sm:inline">{t('navRegisterOrg')}</span>
              <span className="sm:hidden text-xs">تأسيس</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 sm:p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="Toggle Mobile Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden px-4 pt-3 pb-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070e17] space-y-3">
          {/* Quick Auth Cards at Top of Mobile Drawer */}
          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth('manager');
              }}
              className="p-3 text-start text-xs font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-[#0c1829] border border-amber-500/30 rounded-xl hover:bg-amber-500/10 flex flex-col gap-1 min-h-[50px] justify-center"
            >
              <span className="flex items-center gap-1.5 text-amber-500">
                <Lock className="w-3.5 h-3.5" />
                <span>دخول المدير</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">عبر Google</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth('employee');
              }}
              className="p-3 text-start text-xs font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-[#0c1829] border border-sky-500/30 rounded-xl hover:bg-sky-500/10 flex flex-col gap-1 min-h-[50px] justify-center"
            >
              <span className="flex items-center gap-1.5 text-sky-400">
                <Lock className="w-3.5 h-3.5" />
                <span>دخول الموظف</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">بالبريد والرقم السري</span>
            </button>
          </div>

          {/* Nav links */}
          <button
            onClick={() => handleNavClick('features')}
            className="w-full text-start px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t('navFeatures')}
          </button>
          <button
            onClick={() => handleNavClick('how-it-works')}
            className="w-full text-start px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t('navHowItWorks')}
          </button>
          <button
            onClick={() => handleNavClick('simulator')}
            className="w-full text-start px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
          >
            <span>{t('navSimulator')}</span>
            <Calculator className="w-4 h-4 text-amber-500" />
          </button>
          <button
            onClick={() => handleNavClick('benefits')}
            className="w-full text-start px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t('navBenefits')}
          </button>
          <button
            onClick={() => handleNavClick('faq')}
            className="w-full text-start px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t('navFaq')}
          </button>
          <button
            onClick={() => handleNavClick('contact')}
            className="w-full text-start px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t('navContact')}
          </button>

          <div className="pt-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth('register');
              }}
              className="w-full py-3 px-4 text-center text-xs font-bold text-slate-950 bg-amber-400 rounded-xl hover:bg-amber-300 shadow-sm"
            >
              {t('navRegisterOrg')}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
