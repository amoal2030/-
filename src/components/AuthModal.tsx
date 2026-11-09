import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  X,
  Lock,
  Building2,
  Mail,
  KeyRound,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: 'manager' | 'employee' | 'register';
  onClose: () => void;
  onSuccess?: (userType: 'manager' | 'employee', data?: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialTab = 'manager',
  onClose,
  onSuccess,
}) => {
  const { t, direction } = useLanguage();
  const [activeTab, setActiveTab] = useState<'manager' | 'employee' | 'register'>(initialTab);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [activity, setActivity] = useState('restaurant');
  const [currency, setCurrency] = useState('SAR');
  const [firstBranch, setFirstBranch] = useState('الفرع الرئيسي');
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleManagerSignIn = async () => {
    setLoading(true);
    setInfoMessage(
      'سيتم ربط حساب المدير بحساب Google الرسمي عند تفعيل إعدادات Firebase الخارجية.'
    );
    // Simulating initial setup readiness
    setTimeout(() => {
      setLoading(false);
      if (onSuccess) {
        onSuccess('manager', { email: 'manager@example.com', name: 'المدير العام' });
      }
    }, 1200);
  };

  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setInfoMessage('جاري التحقق من بيانات الموظف والفرع التابع له...');
    setTimeout(() => {
      setLoading(false);
      if (onSuccess) {
        onSuccess('employee', { email, name: 'موظف الصندوق' });
      }
    }, 1000);
  };

  const handleRegisterOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !firstBranch) return;
    setLoading(true);
    setInfoMessage('جاري تأسيس مساحة المؤسسة المنعزلة وإعداد الفرع الرئيسي...');
    setTimeout(() => {
      setLoading(false);
      if (onSuccess) {
        onSuccess('manager', {
          orgName,
          firstBranch,
          activity,
          currency,
          role: 'manager',
        });
      }
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm transition-all animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#0c1829] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        dir={direction}
      >
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0b192c] border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t('authModalTitle')}
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t('brandName')} | {t('brandSub')}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 p-2 bg-slate-100 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('manager');
              setInfoMessage(null);
            }}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'manager'
                ? 'bg-white dark:bg-[#0c1829] text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t('authManagerTab')}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('employee');
              setInfoMessage(null);
            }}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'employee'
                ? 'bg-white dark:bg-[#0c1829] text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t('authEmployeeTab')}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setInfoMessage(null);
            }}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'register'
                ? 'bg-white dark:bg-[#0c1829] text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t('authRegisterOrgTab')}
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 space-y-5">
          {/* Manager Login Tab */}
          {activeTab === 'manager' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{t('authNoticeManager')}</p>
              </div>

              {/* Official Google Sign In Button */}
              <button
                type="button"
                onClick={handleGoogleManagerSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070e17] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white text-sm font-semibold shadow-sm hover:shadow transition-all active:scale-98 disabled:opacity-50"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>{loading ? 'جاري التحقق...' : t('authGoogleSignIn')}</span>
              </button>

              <div className="text-center text-xs text-slate-500 dark:text-slate-400">
                {t('authGoogleSub')}
              </div>
            </div>
          )}

          {/* Employee Login Tab */}
          {activeTab === 'employee' && (
            <form onSubmit={handleEmployeeLogin} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{t('authNoticeEmployee')}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('authEmail')}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cashier@store.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute end-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('authPassword')}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute end-3 top-3" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-sm text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all active:scale-98 shadow-sm"
              >
                {loading ? 'جاري التحقق...' : t('authSubmitLogin')}
              </button>
            </form>
          )}

          {/* Register New Organization Tab */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterOrg} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('authOrgName')} *
                </label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="مثال: مطاعم ومقاهي السعادة"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('authActivity')}
                  </label>
                  <select
                    value={activity}
                    onChange={(e) => setActivity(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="restaurant">{t('authActivityOptions').restaurant}</option>
                    <option value="retail">{t('authActivityOptions').retail}</option>
                    <option value="supermarket">{t('authActivityOptions').supermarket}</option>
                    <option value="services">{t('authActivityOptions').services}</option>
                    <option value="other">{t('authActivityOptions').other}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('authCurrency')}
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="SAR">SAR - ريال سعودي</option>
                    <option value="AED">AED - درهم إماراتي</option>
                    <option value="QAR">QAR - ريال قطري</option>
                    <option value="KWD">KWD - دينار كويتي</option>
                    <option value="USD">USD - دولار أمريكي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('authFirstBranch')} *
                </label>
                <input
                  type="text"
                  required
                  value={firstBranch}
                  onChange={(e) => setFirstBranch(e.target.value)}
                  placeholder="مثال: فرع التحلية الرئيسي"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                {t('authDriveInfo')}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-sm text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all active:scale-98 shadow-sm flex items-center justify-center gap-2"
              >
                <Building2 className="w-4 h-4" />
                <span>{loading ? 'جاري التأسيس...' : t('authSubmitRegister')}</span>
              </button>
            </form>
          )}

          {infoMessage && (
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              {infoMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
