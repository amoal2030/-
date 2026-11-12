import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Lock, ShieldCheck, HardDrive, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();

  return (
    <footer className="bg-[#0b192c] text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#0b192c] to-[#1e293b] border border-amber-500/40 text-amber-400">
                <Lock className="w-4 h-4" />
              </div>
              <span className="text-xl font-black text-white">
                {t('brandName')} <span className="text-amber-400">| {t('brandSub')}</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed">
              {t('tagline')}. منظومة محاسبية سحابية متقدمة لإدارة الورديات وإقفال الصناديق والمبيعات اليومية بدقة وانضباط مالي.
            </p>
            <div className="flex items-center gap-3 text-xs text-amber-400/90 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>عزل كامل لقواعد البيانات والحسابات لكل مؤسسة</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              أقسام النظام
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <a href="#features" className="hover:text-amber-400 transition-colors">
                  {t('navFeatures')}
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-amber-400 transition-colors">
                  {t('navHowItWorks')}
                </a>
              </li>
              <li>
                <a href="#simulator" className="hover:text-amber-400 transition-colors">
                  {t('navSimulator')}
                </a>
              </li>
              <li>
                <a href="#benefits" className="hover:text-amber-400 transition-colors">
                  {t('navBenefits')}
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-amber-400 transition-colors">
                  {t('navFaq')}
                </a>
              </li>
            </ul>
          </div>

          {/* Languages & Drive */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              {t('language')} / Localization
            </h4>
            <div className="flex flex-col gap-2 text-xs">
              <button
                onClick={() => setLanguage('ar')}
                className={`text-start px-2.5 py-1.5 rounded transition-colors ${
                  language === 'ar' ? 'bg-amber-500/20 text-amber-400 font-bold' : 'hover:text-white'
                }`}
              >
                🇸🇦 العربية (Arabic - RTL)
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`text-start px-2.5 py-1.5 rounded transition-colors ${
                  language === 'en' ? 'bg-amber-500/20 text-amber-400 font-bold' : 'hover:text-white'
                }`}
              >
                🇬🇧 English (English - LTR)
              </button>
              <button
                onClick={() => setLanguage('ur')}
                className={`text-start px-2.5 py-1.5 rounded transition-colors ${
                  language === 'ur' ? 'bg-amber-500/20 text-amber-400 font-bold' : 'hover:text-white'
                }`}
              >
                🇵🇰 اردو (Urdu - RTL)
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>{t('allRightsReserved')}</div>
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-center">
            <span>صمم من موقع خدماتي البرمجية</span>
            <a
              href="https://amoal2030.github.io/a1/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 underline font-semibold transition-colors"
              dir="ltr"
            >
              https://amoal2030.github.io/a1/
            </a>
          </div>
          <div className="text-slate-500 text-[11px]">
            {t('noGreenNotice')}
          </div>
        </div>
      </div>
    </footer>
  );
};
