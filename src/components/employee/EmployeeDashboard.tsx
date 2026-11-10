import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ShiftClosing } from '../../types';
import {
  calculateShiftTotals,
  formatCurrency,
  formatDate,
} from '../../utils/accounting';
import {
  Coins,
  CreditCard,
  ShoppingBag,
  Building2,
  Lock,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  Sparkles,
  Paperclip,
  LogOut,
  Bell
} from 'lucide-react';

export const EmployeeDashboard: React.FC = () => {
  const {
    currentUser,
    userProfile,
    currentOrg,
    currentBranch,
    closings,
    submitShiftClosing,
    logout,
  } = useAuth();
  const { language, t } = useLanguage();

  // Employee's own closings
  const myClosings = closings.filter((c) => c.employeeId === currentUser?.uid);

  // Form State
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [period, setPeriod] = useState<'morning' | 'evening'>('morning');
  const [cashSales, setCashSales] = useState('');
  const [cardSales, setCardSales] = useState('');
  const [expenses, setExpenses] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal to view rejection reason
  const [viewingClosing, setViewingClosing] = useState<ShiftClosing | null>(null);

  // Reactive Instant Accounting Calculations
  const calc = calculateShiftTotals(cashSales, cardSales, expenses);

  const handleSubmit = async (targetStatus: 'draft' | 'pending_review') => {
    if (!currentBranch) {
      setErrorMsg('لم يتم تعيين فرع لحسابك. يرجى التواصل مع المدير العام.');
      return;
    }

    if (!calc.isValid) {
      setErrorMsg('يرجى التأكد من إدخال مبالغ مالية صحيحة موجبة.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const saved = await submitShiftClosing({
        branchId: currentBranch.id,
        branchName: currentBranch.name,
        date,
        period,
        cashSales: calc.cashSales,
        cardSales: calc.cardSales,
        expenses: calc.expenses,
        notes,
        status: targetStatus,
      });

      setSuccessMsg(
        targetStatus === 'pending_review'
          ? `تم إرسال إقفال الوردية ${
              period === 'morning' ? 'الصباحية' : 'المسائية'
            } بنجاح للمدير للمراجعة والاعتماد.`
          : 'تم حفظ مسودة الإقفال بنجاح. يمكنك استكمالها لاحقاً.'
      );

      // Reset form
      setCashSales('');
      setCardSales('');
      setExpenses('');
      setNotes('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل حفظ الإقفال.');
    } finally {
      setLoading(false);
    }
  };

  // Check if any returned closings need revision
  const rejectedCount = myClosings.filter((c) => c.status === 'rejected').length;

  return (
    <div className="space-y-8">
      {/* Employee Top Welcome & Locked Branch Card */}
      <div className="bg-white dark:bg-[#0c1829] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>لوحة موظف الصندوق والورديات</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            مرحباً، {userProfile?.displayName || currentUser?.email}
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-amber-500">
              <Building2 className="w-4 h-4" />
              المؤسسة: {currentOrg?.name}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 font-bold text-sky-400">
              <Lock className="w-3.5 h-3.5" />
              الفرع المخصص لك: {currentBranch?.name || 'الفرع الرئيسي'} (مقيد بحسابك)
            </span>
          </div>
        </div>

        {/* Notifications Alert */}
        {rejectedCount > 0 && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <span className="font-bold block">تنبيه من الإدارة:</span>
              <span>لديك {rejectedCount} إقفال معاد للتعديل بحاجة لمراجعتك.</span>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Create Shift Closing Form (Left 7 Cols) + Quick Stats (Right 5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Shift Closing Form: 7 Cols */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0c1829] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  تسجيل إقفال وردية جديدة
                </h3>
                <span className="text-xs text-slate-400">
                  الحساب الفوري التلقائي بدقة الهللات
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setCashSales('1500');
                setCardSales('2000');
                setExpenses('400');
              }}
              className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>تحميل المثال القياسي (1500/2000/400)</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Date & Period */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  تاريخ الوردية *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  فترة الوردية *
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                >
                  <option value="morning">الفترة الصباحية</option>
                  <option value="evening">الفترة المسائية</option>
                </select>
              </div>
            </div>

            {/* Money Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    النقد (كاش) *
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={cashSales}
                    onChange={(e) => setCashSales(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-white focus:border-amber-500"
                  />
                  <span className="absolute end-3 top-3 text-[11px] text-slate-400">
                    {currentOrg?.currency || 'SAR'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-sky-400" />
                    الشبكة (مدى) *
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={cardSales}
                    onChange={(e) => setCardSales(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-white focus:border-amber-500"
                  />
                  <span className="absolute end-3 top-3 text-[11px] text-slate-400">
                    {currentOrg?.currency || 'SAR'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-rose-400" />
                    المشتريات *
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={expenses}
                    onChange={(e) => setExpenses(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-white focus:border-rose-500"
                  />
                  <span className="absolute end-3 top-3 text-[11px] text-slate-400">
                    {currentOrg?.currency || 'SAR'}
                  </span>
                </div>
              </div>
            </div>

            {/* Instant Financial Equations Display Card */}
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                <span className="font-sans font-medium">إجمالي المبيعات = النقد + الشبكة:</span>
                <span className="font-extrabold text-amber-500 text-sm">
                  {formatCurrency(calc.totalSales, currentOrg?.currency || 'SAR', language)}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                <span className="font-sans font-medium">الباقي في الصندوق = النقد - المشتريات:</span>
                <span className="font-extrabold text-sky-400 text-sm">
                  {formatCurrency(calc.remainingInBox, currentOrg?.currency || 'SAR', language)}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="font-sans font-bold">صافي الفترة = إجمالي المبيعات - المشتريات:</span>
                <span className="font-black text-amber-400 text-base">
                  {formatCurrency(calc.netPeriod, currentOrg?.currency || 'SAR', language)}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                ملاحظات الصندوق أو أسباب المصروفات (اختياري)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أدخل أي ملاحظات حول فواتير المشتريات أو عهدة الصندوق..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* Submit & Save Draft Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleSubmit('pending_review')}
                disabled={loading}
                className="flex-1 py-3.5 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all active:scale-98 shadow-md shadow-amber-500/20 disabled:opacity-50"
              >
                {loading ? 'جاري الحفظ...' : 'إرسال الإقفال للمدير للمراجعة'}
              </button>

              <button
                type="button"
                onClick={() => handleSubmit('draft')}
                disabled={loading}
                className="px-4 py-3.5 rounded-xl font-semibold text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                حفظ كمسودة
              </button>
            </div>
          </div>
        </div>

        {/* Employee Summary & Info: 5 Cols */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white dark:bg-[#0c1829] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <FileText className="w-4 h-4 text-amber-500" />
              <span>إحصائيات إقفالاتي السابقة</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 font-mono text-center">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-sans text-slate-400 block mb-1">إجمالي إقفالاتي</span>
                <span className="text-xl font-bold text-slate-900 dark:text-white">
                  {myClosings.length}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-[11px] font-sans text-amber-600 dark:text-amber-400 font-semibold block mb-1">
                  المعتمدة رسمياً
                </span>
                <span className="text-xl font-bold text-amber-500">
                  {myClosings.filter((c) => c.status === 'approved').length}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
                <span className="text-[11px] font-sans text-sky-600 dark:text-sky-400 font-semibold block mb-1">
                  قيد المراجعة
                </span>
                <span className="text-xl font-bold text-sky-400">
                  {myClosings.filter((c) => c.status === 'pending_review').length}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-[11px] font-sans text-rose-600 dark:text-rose-400 font-semibold block mb-1">
                  معادة للتعديل
                </span>
                <span className="text-xl font-bold text-rose-400">
                  {rejectedCount}
                </span>
              </div>
            </div>
          </div>

          {/* Guidelines Notice */}
          <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-2">
            <span className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-500" />
              توجيهات إقفال الصندوق
            </span>
            <ul className="space-y-1 list-disc list-inside leading-relaxed text-[11px]">
              <li>تأكد من عد النقد الفعلي الموجود بالصندوق قبل إدخال الأرقام.</li>
              <li>اطبع إجمالي تقرير الشبكة (مدى) من جهاز نقاط البيع.</li>
              <li>اجمع فواتير المصروفات المدفوعة نقداً خلال الوردية.</li>
              <li>بمجرد اعتماد المدير للإقفال يتم إخلاء مسؤوليتك وقفل السجل رسمياً.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Employee's Own Shift History */}
      <div className="bg-white dark:bg-[#0c1829] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          <span>سجل إقفالاتي السابقة ({myClosings.length})</span>
        </h3>

        {/* Mobile View: Cards on Small Screens (< 768px) */}
        <div className="block md:hidden space-y-3.5">
          {myClosings.map((c) => {
            const statusStyles: Record<string, { label: string; class: string }> = {
              draft: { label: 'مسودة', class: 'bg-slate-100 dark:bg-slate-800 text-slate-400' },
              pending_review: {
                label: 'مرسل للمراجعة',
                class: 'bg-amber-500/20 text-amber-500 border border-amber-500/30',
              },
              approved: {
                label: 'معتمد',
                class: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
              },
              rejected: {
                label: 'معاد للتعديل',
                class: 'bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold',
              },
            };
            const st = statusStyles[c.status] || statusStyles.draft;

            return (
              <div
                key={c.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                      {c.date}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {c.period === 'morning' ? 'صباحية' : 'مسائية'}
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.class}`}>
                    {st.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-white dark:bg-[#0c1829] border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-sans text-slate-400 block">النقد (كاش)</span>
                    <span className="font-bold text-amber-500">{formatCurrency(c.cashSales, currentOrg?.currency || 'SAR', language)}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-[#0c1829] border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-sans text-slate-400 block">الشبكة (مدى)</span>
                    <span className="font-bold text-sky-400">{formatCurrency(c.cardSales, currentOrg?.currency || 'SAR', language)}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-[#0c1829] border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-sans text-slate-400 block">المشتريات</span>
                    <span className="font-bold text-rose-400">{formatCurrency(c.expenses, currentOrg?.currency || 'SAR', language)}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-[#0c1829] border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-sans text-slate-400 block">الباقي بالصندوق</span>
                    <span className="font-bold text-sky-400">{formatCurrency(c.remainingInBox, currentOrg?.currency || 'SAR', language)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] me-1">صافي الفترة:</span>
                    <span className="font-bold text-amber-400 font-mono text-sm">
                      {formatCurrency(c.netPeriod, currentOrg?.currency || 'SAR', language)}
                    </span>
                  </div>

                  {c.status === 'rejected' ? (
                    <button
                      onClick={() => setViewingClosing(c)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 flex items-center gap-1 min-h-[36px]"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>عرض سبب الإرجاع</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      {c.status === 'approved' ? 'مقفل رسمياً' : 'بانتظار المدير'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {myClosings.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              لم تسجل أي إقفالات بعد. استخدم النموذج بالأعلى لتسجيل إقفال ورديتك الحالية.
            </div>
          )}
        </div>

        {/* Desktop View: Wide Table (>= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-start text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5 text-start">التاريخ</th>
                <th className="p-3.5 text-start">الفترة</th>
                <th className="p-3.5 text-start">النقد</th>
                <th className="p-3.5 text-start">الشبكة</th>
                <th className="p-3.5 text-start">المبيعات</th>
                <th className="p-3.5 text-start">المشتريات</th>
                <th className="p-3.5 text-start">باقي الصندوق</th>
                <th className="p-3.5 text-start">صافي الفترة</th>
                <th className="p-3.5 text-start">الحالة</th>
                <th className="p-3.5 text-start">تفاصيل / سبب الإرجاع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {myClosings.map((c) => {
                const statusStyles: Record<string, { label: string; class: string }> = {
                  draft: { label: 'مسودة', class: 'bg-slate-100 dark:bg-slate-800 text-slate-400' },
                  pending_review: {
                    label: 'مرسل للمراجعة',
                    class: 'bg-amber-500/20 text-amber-500 border border-amber-500/30',
                  },
                  approved: {
                    label: 'معتمد',
                    class: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
                  },
                  rejected: {
                    label: 'معاد للتعديل',
                    class: 'bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold',
                  },
                };
                const st = statusStyles[c.status] || statusStyles.draft;

                return (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{c.date}</td>
                    <td className="p-3.5 font-sans">
                      {c.period === 'morning' ? 'صباحية' : 'مسائية'}
                    </td>
                    <td className="p-3.5 text-amber-500 font-bold">{c.cashSales.toFixed(2)}</td>
                    <td className="p-3.5 text-sky-400 font-bold">{c.cardSales.toFixed(2)}</td>
                    <td className="p-3.5 font-black text-slate-900 dark:text-white">
                      {c.totalSales.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-rose-400">{c.expenses.toFixed(2)}</td>
                    <td className="p-3.5 text-sky-400 font-bold">{c.remainingInBox.toFixed(2)}</td>
                    <td className="p-3.5 text-amber-400 font-bold">{c.netPeriod.toFixed(2)}</td>
                    <td className="p-3.5 font-sans">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.class}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="p-3.5 font-sans">
                      {c.status === 'rejected' ? (
                        <button
                          onClick={() => setViewingClosing(c)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 flex items-center gap-1"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>عرض سبب الإرجاع</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {c.status === 'approved' ? 'مقفل رسمياً' : 'بانتظار المدير'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {myClosings.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              لم تسجل أي إقفالات بعد. استخدم النموذج بالأعلى لتسجيل إقفال ورديتك الحالية.
            </div>
          )}
        </div>
      </div>

      {/* Modal for viewing Rejection Reason */}
      {viewingClosing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0c1829] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>ملاحظة المدير على الإقفال</span>
              </h4>
              <button
                onClick={() => setViewingClosing(null)}
                className="text-slate-400 hover:text-white"
              >
                إغلاق
              </button>
            </div>

            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-700 dark:text-rose-300 space-y-1.5 leading-relaxed">
              <span className="font-bold block">توجيه التعديل من المدير:</span>
              <p className="text-sm font-medium">{viewingClosing.rejectionReason}</p>
            </div>

            <div className="text-xs text-slate-500 space-y-1">
              <div>وردية: {viewingClosing.date} ({viewingClosing.period === 'morning' ? 'صباحية' : 'مسائية'})</div>
              <div>المبيعات: {viewingClosing.totalSales} ر.س</div>
            </div>

            <button
              onClick={() => {
                // Populate form with this closing's data for correction
                setDate(viewingClosing.date);
                setPeriod(viewingClosing.period);
                setCashSales(String(viewingClosing.cashSales));
                setCardSales(String(viewingClosing.cardSales));
                setExpenses(String(viewingClosing.expenses));
                setNotes(viewingClosing.notes || '');
                setViewingClosing(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-amber-400 hover:bg-amber-300"
            >
              تحميل البيانات في النموذج لتصحيحها وإعادة الإرسال
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
