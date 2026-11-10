import React, { useState } from 'react';
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
  Sparkles
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { currentOrg, currentBranch, branches, userProfile, setCurrentBranch } = useAuth();
  const { language, setLanguage, t, direction } = useLanguage();
  const { theme, toggleTheme, setTheme } = useTheme();

  const [savedNotice, setSavedNotice] = useState(false);

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
