import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Building2,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Sparkles,
  MapPin,
  FileText,
  DollarSign
} from 'lucide-react';

export const OrganizationOnboarding: React.FC = () => {
  const { completeOrganizationSetup, currentUser, logout } = useAuth();
  const { t, direction } = useLanguage();

  const [orgName, setOrgName] = useState('');
  const [commercialRegistration, setCommercialRegistration] = useState('');
  const [activityType, setActivityType] = useState('restaurant');
  const [currency, setCurrency] = useState('SAR');
  const [firstBranchName, setFirstBranchName] = useState('الفرع الرئيسي');
  const [firstBranchAddress, setFirstBranchAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !firstBranchName.trim()) {
      setErrorMsg('يرجى إدخال اسم المؤسسة واسم الفرع الرئيسي');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      await completeOrganizationSetup({
        orgName,
        commercialRegistration,
        activityType,
        currency,
        firstBranchName,
        firstBranchAddress,
      });
    } catch (err: any) {
      console.error('Error completing organization setup:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء تأسيس المؤسسة. يرجى المحاولة ثانية.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md" dir={direction}>
      <div className="w-full max-w-2xl bg-white dark:bg-[#0c1829] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#0b192c] via-[#0f2038] to-[#1e293b] p-6 sm:p-8 text-white relative border-b border-amber-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  {t('badgeCloudSaaS')}
                </span>
                <h2 className="text-xl sm:text-2xl font-black">
                  تأسيس المؤسسة التجارية الجديدة
                </h2>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-xs flex items-center gap-1.5"
              title={t('navLogout')}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t('navLogout')}</span>
            </button>
          </div>

          <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
            مرحباً بك يا <span className="font-bold text-amber-300">{currentUser?.displayName || currentUser?.email}</span>. خطوة واحدة أخيرة لتجهيز منظومتك المحاسبية وقاعدة بياناتك المنعزلة.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Org Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <FileText className="w-4 h-4 text-amber-500" />
              <span>البيانات الأساسية للمؤسسة</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  اسم المؤسسة / المتجر التجاري *
                </label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="مثال: مطاعم ومقاهي السعادة"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  رقم السجل التجاري (اختياري)
                </label>
                <input
                  type="text"
                  value={commercialRegistration}
                  onChange={(e) => setCommercialRegistration(e.target.value)}
                  placeholder="مثال: 1010000000"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  النشاط التجاري
                </label>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                >
                  <option value="restaurant">مطعم أو كافيه</option>
                  <option value="retail">تجارة تجزئة ومتاجر</option>
                  <option value="supermarket">تموينات وسوبرماركت</option>
                  <option value="services">خدمات تجارية</option>
                  <option value="other">نشاط تجاري آخر</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  العملة المحاسبية الأساسية
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                >
                  <option value="SAR">SAR - ريال سعودي</option>
                  <option value="AED">AED - درهم إماراتي</option>
                  <option value="QAR">QAR - ريال قطري</option>
                  <option value="KWD">KWD - دينار كويتي</option>
                  <option value="USD">USD - دولار أمريكي</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: First Branch Setup */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <MapPin className="w-4 h-4 text-sky-400" />
              <span>إعداد الفرع الأول التلقائي</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  اسم الفرع الرئيسي *
                </label>
                <input
                  type="text"
                  required
                  value={firstBranchName}
                  onChange={(e) => setFirstBranchName(e.target.value)}
                  placeholder="مثال: الفرع الرئيسي - العليا"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  عنوان الفرع أو المدينة (اختياري)
                </label>
                <input
                  type="text"
                  value={firstBranchAddress}
                  onChange={(e) => setFirstBranchAddress(e.target.value)}
                  placeholder="مثال: الرياض - طريق الملك فهد"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Privacy & Security Guarantee */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="leading-relaxed space-y-1">
              <span className="font-bold block">ضمان العزل والخصوصية:</span>
              <span>
                سيتم إنشاء معرف مشفر فريد لمؤسستك في Cloud Firestore، محمي بقواعد أمان تمنع أي وصول من مؤسسات أخرى، وتمنحك وحدك صلاحية إضافة الموظفين واعتماد الإقفالات.
              </span>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-sm sm:text-base text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-98 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Building2 className="w-5 h-5" />
            <span>{loading ? 'جاري تأسيس المؤسسة وحفظ البيانات...' : 'تأكيد التأسيس والدخول إلى لوحة التحكم'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
