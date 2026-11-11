import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { CalculatorSimulator } from './CalculatorSimulator';
import {
  Lock,
  Building2,
  ShieldCheck,
  Clock,
  HardDrive,
  Users,
  FileSpreadsheet,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Layers,
  Send,
  HelpCircle,
  FileText,
  DollarSign,
  TrendingUp,
  Receipt
} from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: (initialTab: 'manager' | 'employee' | 'register') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  const { t, direction, language } = useLanguage();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Contact Form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactOrg, setContactOrg] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactEmail) return;
    setContactSubmitted(true);
    setTimeout(() => {
      setContactName('');
      setContactEmail('');
      setContactOrg('');
      setContactMsg('');
    }, 3000);
  };

  const faqs = [
    { q: t('faqQ1'), a: t('faqA1') },
    { q: t('faqQ2'), a: t('faqA2') },
    { q: t('faqQ3'), a: t('faqA3') },
    { q: t('faqQ4'), a: t('faqA4') },
    { q: t('faqQ5'), a: t('faqA5') },
  ];

  const features = [
    {
      icon: ShieldCheck,
      title: t('featMultiTenantTitle'),
      desc: t('featMultiTenantDesc'),
      accent: 'border-amber-500/40 text-amber-500',
    },
    {
      icon: Clock,
      title: t('featShiftControlTitle'),
      desc: t('featShiftControlDesc'),
      accent: 'border-sky-500/40 text-sky-400',
    },
    {
      icon: TrendingUp,
      title: t('featAccurateMathTitle'),
      desc: t('featAccurateMathDesc'),
      accent: 'border-amber-400/40 text-amber-400',
    },
    {
      icon: HardDrive,
      title: t('featDriveIntegrationTitle'),
      desc: t('featDriveIntegrationDesc'),
      accent: 'border-indigo-400/40 text-indigo-400',
    },
    {
      icon: Users,
      title: t('featRoleAccessTitle'),
      desc: t('featRoleAccessDesc'),
      accent: 'border-amber-500/40 text-amber-500',
    },
    {
      icon: FileSpreadsheet,
      title: t('featAuditAndReportsTitle'),
      desc: t('featAuditAndReportsDesc'),
      accent: 'border-sky-400/40 text-sky-400',
    },
  ];

  const steps = [
    { num: '01', title: t('step1Title'), desc: t('step1Desc'), icon: Receipt },
    { num: '02', title: t('step2Title'), desc: t('step2Desc'), icon: TrendingUp },
    { num: '03', title: t('step3Title'), desc: t('step3Desc'), icon: FileText },
    { num: '04', title: t('step4Title'), desc: t('step4Desc'), icon: ShieldCheck },
    { num: '05', title: t('step5Title'), desc: t('step5Desc'), icon: HardDrive },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section id="hero" className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32">
        {/* Background Decorative Glows */}
        <div className="absolute top-1/4 -start-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 -end-20 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content (7 Cols) */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-start">
              {/* Top SaaS Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('badgeCloudSaaS')}</span>
              </div>

              {/* Title */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]">
                <span>{t('brandName')}</span>{' '}
                <span className="text-amber-500">| {t('brandSub')}</span>
                <span className="block text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-700 dark:text-slate-300 mt-3 font-sans">
                  {t('tagline')}
                </span>
              </h1>

              {/* Description */}
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                {t('heroDescription')}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 sm:gap-4 pt-2">
                <button
                  onClick={() => onOpenAuth('register')}
                  className="px-5 sm:px-6 py-3.5 rounded-xl font-bold text-xs sm:text-base text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/35 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
                  <span>{t('ctaStartNow')}</span>
                  {direction === 'rtl' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => onOpenAuth('manager')}
                  className="px-5 sm:px-6 py-3.5 rounded-xl font-bold text-xs sm:text-base text-slate-900 dark:text-white bg-white dark:bg-[#0c1829] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-sm transition-all flex items-center gap-2 active:scale-95"
                >
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span>{t('navLogin')}</span>
                </button>

                <button
                  onClick={() => {
                    const el = document.getElementById('simulator');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-4 sm:px-5 py-3.5 rounded-xl font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>{t('ctaExploreDemo')}</span>
                </button>
              </div>

              {/* Trust Badges */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-slate-200 dark:border-slate-800/80 max-w-lg">
                <div className="text-center lg:text-start">
                  <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white font-mono">
                    100%
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    عزل تام للبيانات
                  </div>
                </div>
                <div className="text-center lg:text-start">
                  <div className="text-lg sm:text-xl font-extrabold text-amber-500 font-mono">
                    0.00
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    فروقات أو كسور
                  </div>
                </div>
                <div className="text-center lg:text-start">
                  <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white font-mono">
                    Google Drive
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    أرشفة سحابية
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card: High-Fidelity Shift Closing Sheet Mockup (5 Cols) */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl bg-gradient-to-b from-[#0f2038] to-[#070e17] p-1.5 shadow-2xl border border-amber-500/30">
                <div className="rounded-xl bg-[#0b192c] p-6 text-white space-y-5">
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-400">سجل إقفال وردية</div>
                        <div className="text-sm font-bold text-white">الفرع الرئيسي • الفترة المسائية</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      معتمد رسمياً
                    </span>
                  </div>

                  {/* Date & Staff */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-slate-400 block">التاريخ:</span>
                      <span className="font-mono font-medium text-slate-200">2026-11-09</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">الموظف المسؤول:</span>
                      <span className="font-medium text-slate-200">أحمد المحاسب</span>
                    </div>
                  </div>

                  {/* Benchmark Figures Breakdown */}
                  <div className="space-y-2.5 text-xs font-mono">
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                      <span className="text-slate-300 font-sans">مبيعات النقد (كاش):</span>
                      <span className="font-bold text-amber-400">1,500.00 ر.س</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                      <span className="text-slate-300 font-sans">مبيعات الشبكة (مدى/بطاقات):</span>
                      <span className="font-bold text-sky-400">2,000.00 ر.س</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                      <span className="text-slate-300 font-sans">المشتريات والمصروفات:</span>
                      <span className="font-bold text-rose-400">400.00 ر.س</span>
                    </div>
                    <div className="flex justify-between items-center py-2 bg-amber-500/10 px-3 rounded-lg border border-amber-500/20">
                      <span className="text-slate-200 font-sans font-semibold">إجمالي المبيعات:</span>
                      <span className="font-extrabold text-amber-300 text-sm">3,500.00 ر.س</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 px-3">
                      <span className="text-slate-300 font-sans">الباقي في الصندوق:</span>
                      <span className="font-bold text-slate-100">1,100.00 ر.س</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 px-3">
                      <span className="text-slate-300 font-sans">صافي الفترة:</span>
                      <span className="font-bold text-amber-400">3,100.00 ر.س</span>
                    </div>
                  </div>

                  {/* Drive Sync Confirmation */}
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 text-slate-300">
                      <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                      <span>مرفقات الفواتير محفوظة في Google Drive</span>
                    </div>
                    <span className="text-amber-400 font-semibold">مزامنة كاملة</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-slate-50 dark:bg-[#070e17] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold mb-3">
              <Layers className="w-3.5 h-3.5" />
              <span>{t('navFeatures')}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('featuresTitle')}
            </h2>
            <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-300">
              {t('featuresSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#0c1829] rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-amber-500/40 transition-all duration-300 group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-[#0b192c] border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                      <Icon className={`w-6 h-6 ${feat.accent}`} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                      {feat.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    <span>ميزة قياسية مدمجة</span>
                    {direction === 'rtl' ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20 bg-slate-100/60 dark:bg-[#0b192c]/50 border-y border-slate-200 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold mb-3">
              <Clock className="w-3.5 h-3.5" />
              <span>{t('navHowItWorks')}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('workflowTitle')}
            </h2>
            <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-300">
              {t('workflowSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {steps.map((st, idx) => {
              const Icon = st.icon;
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#0c1829] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black font-mono text-amber-500/40 dark:text-amber-500/30">
                      {st.num}
                    </span>
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {st.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {st.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Accounting Simulator Section */}
      <CalculatorSimulator />

      {/* Benefits for Owners vs Employees */}
      <section id="benefits" className="py-20 bg-slate-50 dark:bg-[#070e17] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold mb-3">
              <Users className="w-3.5 h-3.5" />
              <span>{t('navBenefits')}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('benefitsTitle')}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Owner Benefits */}
            <div className="bg-white dark:bg-[#0c1829] rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {t('ownerBenefitsTitle')}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    تحكم، رقابة مالية، وأمان سحابي
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {[t('ownerBen1'), t('ownerBen2'), t('ownerBen3'), t('ownerBen4')].map((b, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {b}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Employee Benefits */}
            <div className="bg-white dark:bg-[#0c1829] rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {t('employeeBenefitsTitle')}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    سرعة، إخلاء مسؤولية، ودقة خالية من الأخطاء
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {[t('employeeBen1'), t('employeeBen2'), t('employeeBen3'), t('employeeBen4')].map((b, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {b}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-slate-100/60 dark:bg-[#0b192c]/50 border-t border-slate-200 dark:border-slate-800/80 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold mb-3">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{t('navFaq')}</span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('faqTitle')}
            </h2>
            <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
              {t('faqSubtitle')}
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#0c1829] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-start font-bold text-sm sm:text-base text-slate-900 dark:text-white"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180 text-amber-500' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section id="contact" className="py-20 bg-white dark:bg-[#070e17] transition-colors">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('contactTitle')}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300">
              {t('contactSubtitle')}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-[#0c1829] rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-lg">
            {contactSubmitted ? (
              <div className="text-center py-8 space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-500 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t('contactSuccess')}
                </h3>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t('contactName')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t('contactEmail')} *
                    </label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('contactOrg')}
                  </label>
                  <input
                    type="text"
                    value={contactOrg}
                    onChange={(e) => setContactOrg(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('contactMessage')} *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={contactMsg}
                    onChange={(e) => setContactMsg(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl font-bold text-sm text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
                >
                  <Send className="w-4 h-4" />
                  <span>{t('contactSend')}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
