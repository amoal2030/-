import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { UserProfile } from '../../types';
import {
  Users,
  Plus,
  ShieldCheck,
  UserX,
  UserCheck,
  GitBranch,
  Mail,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  Phone
} from 'lucide-react';

export const EmployeesManager: React.FC = () => {
  const {
    employees,
    branches,
    createEmployeeAccount,
    toggleEmployeeStatus,
    updateEmployeeBranch,
    userProfile,
  } = useAuth();
  const { t } = useLanguage();

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [branchId, setBranchId] = useState(branches[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const targetBranch = branches.find((b) => b.id === branchId) || branches[0];

    try {
      const created = await createEmployeeAccount({
        email,
        password,
        displayName: name,
        branchId: targetBranch?.id || 'default',
        branchName: targetBranch?.name || 'الفرع الرئيسي',
        phone,
      });

      setSuccessMsg(`تم إنشاء حساب الموظف ${created.displayName} بنجاح دون تسجيل خروجك.`);
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setTimeout(() => {
        setModalOpen(false);
        setSuccessMsg(null);
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل إنشاء حساب الموظف.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            <span>إدارة موظفي الصندوق والصلاحيات ({employees.length})</span>
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            تحديد الفروع لكل موظف، تفعيل أو تعطيل الحسابات، وضبط صلاحيات إدخال الإقفالات
          </span>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة موظف جديد</span>
        </button>
      </div>

      {/* Staff Table */}
      <div className="bg-white dark:bg-[#0c1829] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
        <table className="w-full text-start text-xs sm:text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-4 text-start">الموظف</th>
              <th className="p-4 text-start">البريد الإلكتروني</th>
              <th className="p-4 text-start">الفرع المخصص</th>
              <th className="p-4 text-start">الدور</th>
              <th className="p-4 text-start">الحالة</th>
              <th className="p-4 text-start">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {/* Show Manager Row */}
            <tr className="bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
              <td className="p-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-xs">
                  ★
                </div>
                <span>{userProfile?.displayName} (أنت)</span>
              </td>
              <td className="p-4 font-mono text-slate-500 dark:text-slate-400">
                {userProfile?.email}
              </td>
              <td className="p-4 text-slate-700 dark:text-slate-300">
                جميع الفروع (مدير عام)
              </td>
              <td className="p-4">
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  المدير الرئيسي
                </span>
              </td>
              <td className="p-4">
                <span className="text-xs font-semibold text-amber-500">نشط دائماً</span>
              </td>
              <td className="p-4 text-xs text-slate-400">مالك المؤسسة</td>
            </tr>

            {/* Employee Rows */}
            {employees
              .filter((emp) => emp.role === 'employee')
              .map((emp) => (
                <tr key={emp.uid} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 font-bold text-slate-900 dark:text-white">
                    {emp.displayName}
                  </td>
                  <td className="p-4 font-mono text-slate-500 dark:text-slate-400">
                    {emp.email}
                  </td>
                  <td className="p-4">
                    <select
                      value={emp.branchId || branches[0]?.id}
                      onChange={(e) => {
                        const target = branches.find((b) => b.id === e.target.value);
                        if (target) {
                          updateEmployeeBranch(emp.uid, target.id, target.name);
                        }
                      }}
                      className="px-2 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                      موظف صندوق
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        emp.isActive
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {emp.isActive ? 'حساب نشط' : 'معطل'}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleEmployeeStatus(emp.uid, !emp.isActive)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        emp.isActive
                          ? 'text-rose-500 hover:bg-rose-500/10 border border-rose-500/20'
                          : 'text-amber-500 hover:bg-amber-500/10 border border-amber-500/20'
                      }`}
                    >
                      {emp.isActive ? 'تعطيل الحساب' : 'إعادة التنشيط'}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {employees.filter((emp) => emp.role === 'employee').length === 0 && (
          <div className="py-8 text-center text-xs text-slate-400">
            لم تقم بإضافة أي موظفي صندوق بعد. اضغط على زر "إضافة موظف جديد" لإنشاء أول حساب لموظفيك.
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0c1829] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                <span>إضافة موظف صندوق جديد</span>
              </h4>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  الاسم الكامل للموظف *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: خالد المحاسب"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  البريد الإلكتروني لتسجيل الدخول *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="khaled@company.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute end-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  كلمة المرور الأولية (6 خانات على الأقل) *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute end-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  الفرع المخصص للموظف
                </label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الهاتف (اختياري)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                ملاحظة أمنية: يتم إنشاء الموظف عبر جلسة معزولة لضمان عدم تسجيل خروجك من حساب المدير.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-xs text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all disabled:opacity-50 mt-2 shadow-sm"
              >
                {loading ? 'جاري إنشاء الحساب في Firebase...' : 'تأكيد إنشاء حساب الموظف'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
