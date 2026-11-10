import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ShiftClosing } from '../../types';
import {
  formatCurrency,
  formatDate,
  exportClosingsToCSV,
} from '../../utils/accounting';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Filter,
  ArrowUpDown,
  Building2,
  Users,
  Coins,
  CreditCard,
  ShoppingBag,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export const FinancialReports: React.FC = () => {
  const { closings, branches, employees, currentOrg } = useAuth();
  const { language, t } = useLanguage();

  // Filter States: DEFAULT TO 'approved' TO ENSURE STRICT FINANCIAL INTEGRITY
  const [statusScope, setStatusScope] = useState<'approved' | 'all' | 'pending_review' | 'draft'>('approved');
  const [dateFilterType, setDateFilterType] = useState<'today' | 'week' | 'month' | 'year' | 'all' | 'custom'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

  const todayStr = new Date().toISOString().split('T')[0];

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const firstOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];

  // Filtering
  const filtered = closings.filter((c) => {
    // 1. Status Scope (Default: Approved only)
    if (statusScope !== 'all' && c.status !== statusScope) return false;

    // 2. Date filter
    if (dateFilterType === 'today' && c.date !== todayStr) return false;
    if (dateFilterType === 'week' && (c.date < oneWeekAgo || c.date > todayStr)) return false;
    if (dateFilterType === 'month' && c.date < firstOfMonth) return false;
    if (dateFilterType === 'year' && c.date < firstOfYear) return false;
    if (dateFilterType === 'custom') {
      if (fromDate && c.date < fromDate) return false;
      if (toDate && c.date > toDate) return false;
    }

    // 3. Branch filter
    if (selectedBranchId !== 'all' && c.branchId !== selectedBranchId) return false;

    // 4. Employee filter
    if (selectedEmployeeId !== 'all' && c.employeeId !== selectedEmployeeId) return false;

    // 5. Period filter
    if (selectedPeriod !== 'all' && c.period !== selectedPeriod) return false;

    return true;
  });

  // Totals calculations for Bottom Summary Bar
  const totalCash = filtered.reduce((acc, c) => acc + c.cashSales, 0);
  const totalCard = filtered.reduce((acc, c) => acc + c.cardSales, 0);
  const totalSales = filtered.reduce((acc, c) => acc + c.totalSales, 0);
  const totalExpenses = filtered.reduce((acc, c) => acc + c.expenses, 0);
  const totalRemainingInBox = filtered.reduce((acc, c) => acc + c.remainingInBox, 0);
  const totalNetPeriod = filtered.reduce((acc, c) => acc + c.netPeriod, 0);

  const handleExportCSV = () => {
    exportClosingsToCSV(filtered, currentOrg?.currency || 'SAR');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header and Export Controls (Hidden in Print) */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            <span>التقارير المالية والمحاسبية الدقيقة ({filtered.length} وردية)</span>
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            كشف حساب تفصيلي لجميع فترات الورديات مع شريط المجاميع السفلية وإمكانية التصدير
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 shadow-sm flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4 text-amber-500" />
            <span>تصدير Excel (CSV)</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-sm flex items-center gap-2 transition-all active:scale-95"
          >
            <Printer className="w-4 h-4 text-slate-950" />
            <span>طباعة التقرير / PDF</span>
          </button>
        </div>
      </div>

      {/* Financial Scope Badge & Integrity Notice */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0c1829] border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs no-print shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-500" />
          <span className="text-slate-600 dark:text-slate-300">
            نطاق الاحتساب المالي:
          </span>
          <span className={`px-2 py-0.5 rounded-full font-bold ${
            statusScope === 'approved'
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}>
            {statusScope === 'approved' ? 'الإقفالات المعتمدة رسمياً فقط (مطابقة مالية مؤكدة)' : 'شامل المسودات وغير المعتمد'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span className="text-slate-400">تغيير نطاق الاعتماد:</span>
          <button
            onClick={() => setStatusScope('approved')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              statusScope === 'approved'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-500 hover:text-white'
            }`}
          >
            المعتمدة فقط (افتراضي)
          </button>
          <button
            onClick={() => setStatusScope('all')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              statusScope === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-500 hover:text-white'
            }`}
          >
            كافة الحالات
          </button>
        </div>
      </div>

      {/* Filter Ribbon (Hidden in Print) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1829] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 no-print">
        {/* Quick Date Presets */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-slate-400 me-2">الفترة الزمنية:</span>
          {[
            { id: 'all', label: 'كافة الفترات' },
            { id: 'today', label: 'اليوم' },
            { id: 'week', label: 'آخر 7 أيام' },
            { id: 'month', label: 'الشهر الحالي' },
            { id: 'year', label: 'السنة الحالية' },
            { id: 'custom', label: 'تخصيص تاريخ' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => setDateFilterType(preset.id as any)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                dateFilterType === preset.id
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Detailed Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {dateFilterType === 'custom' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  من تاريخ
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  إلى تاريخ
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              الفرع
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="all">جميع الفروع</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              الموظف
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="all">جميع الموظفين</option>
              {employees.map((emp) => (
                <option key={emp.uid} value={emp.uid}>
                  {emp.displayName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              الفترة
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="all">الصباحية والمسائية</option>
              <option value="morning">صباحية</option>
              <option value="evening">مسائية</option>
            </select>
          </div>
        </div>
      </div>

      {/* Official Report Header for Print */}
      <div className="hidden print-only mb-6 text-center border-b pb-4">
        <h2 className="text-xl font-bold">تقرير إقفالات الوردية - {currentOrg?.name}</h2>
        <p className="text-xs text-gray-500">
          تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA')} • العملة: {currentOrg?.currency || 'SAR'} • النطاق: {statusScope === 'approved' ? 'الإقفالات المعتمدة' : 'شامل'}
        </p>
      </div>

      {/* Mobile Report Cards (< 768px) */}
      <div className="block md:hidden space-y-3 no-print">
        {filtered.map((closing) => {
          const statusLabels: Record<string, string> = {
            draft: 'مسودة',
            pending_review: 'مرسل للمراجعة',
            approved: 'معتمد',
            rejected: 'معاد للتعديل',
          };
          return (
            <div
              key={closing.id}
              className="p-4 rounded-2xl bg-white dark:bg-[#0c1829] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5 text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{closing.branchName}</h4>
                  <span className="text-[11px] text-slate-400">
                    {closing.date} • {closing.period === 'morning' ? 'صباحية' : 'مسائية'} • {closing.employeeName}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                  closing.status === 'approved'
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                }`}>
                  {statusLabels[closing.status] || closing.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200/70 dark:border-slate-800/70">
                  <span className="text-[10px] text-slate-400 block font-medium">إجمالي المبيعات</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{closing.totalSales.toFixed(2)}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200/70 dark:border-slate-800/70">
                  <span className="text-[10px] text-slate-400 block font-medium">صافي الفترة</span>
                  <span className="font-mono font-bold text-amber-500">{closing.netPeriod.toFixed(2)}</span>
                </div>
                <div className="p-1.5 px-2 rounded-lg bg-slate-50/50 dark:bg-[#070e17]/50 text-[11px] flex justify-between">
                  <span className="text-slate-400">النقد:</span>
                  <span className="font-mono text-amber-500">{closing.cashSales.toFixed(2)}</span>
                </div>
                <div className="p-1.5 px-2 rounded-lg bg-slate-50/50 dark:bg-[#070e17]/50 text-[11px] flex justify-between">
                  <span className="text-slate-400">الشبكة:</span>
                  <span className="font-mono text-sky-400">{closing.cardSales.toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Mobile Grand Total Card */}
        {filtered.length > 0 && (
          <div className="p-4 rounded-2xl bg-[#0b192c] text-white border border-amber-500/40 shadow-lg space-y-2">
            <span className="text-xs font-bold text-amber-400 block">إجمالي الفترة المعروضة ({filtered.length} وردية)</span>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-400 block">إجمالي المبيعات</span>
                <span className="text-sm font-bold text-white">{totalSales.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">صافي الفترة</span>
                <span className="text-sm font-bold text-amber-400">{totalNetPeriod.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">مجموع النقد</span>
                <span className="text-xs text-amber-400">{totalCash.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">مجموع الشبكة</span>
                <span className="text-xs text-sky-400">{totalCard.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Financial Report Table (Desktop & Print) */}
      <div className="hidden md:block bg-white dark:bg-[#0c1829] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5 text-start">التاريخ</th>
                <th className="p-3.5 text-start">الفرع</th>
                <th className="p-3.5 text-start">الموظف</th>
                <th className="p-3.5 text-start">الفترة</th>
                <th className="p-3.5 text-start">النقد</th>
                <th className="p-3.5 text-start">الشبكة</th>
                <th className="p-3.5 text-start">الإجمالي</th>
                <th className="p-3.5 text-start">المشتريات</th>
                <th className="p-3.5 text-start">الباقي بالصندوق</th>
                <th className="p-3.5 text-start">الصافي</th>
                <th className="p-3.5 text-start">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {filtered.map((closing) => {
                const statusLabels: Record<string, string> = {
                  draft: 'مسودة',
                  pending_review: 'مرسل للمراجعة',
                  approved: 'معتمد',
                  rejected: 'معاد للتعديل',
                };
                return (
                  <tr
                    key={closing.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      {closing.date}
                    </td>
                    <td className="p-3.5 font-sans text-slate-700 dark:text-slate-300">
                      {closing.branchName}
                    </td>
                    <td className="p-3.5 font-sans text-slate-700 dark:text-slate-300">
                      {closing.employeeName}
                    </td>
                    <td className="p-3.5 font-sans">
                      <span className="px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {closing.period === 'morning' ? 'صباحية' : 'مسائية'}
                      </span>
                    </td>
                    <td className="p-3.5 text-amber-500 font-bold">
                      {closing.cashSales.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-sky-400 font-bold">
                      {closing.cardSales.toFixed(2)}
                    </td>
                    <td className="p-3.5 font-black text-slate-900 dark:text-white">
                      {closing.totalSales.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-rose-400">
                      {closing.expenses.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-sky-400 font-bold">
                      {closing.remainingInBox.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-amber-400 font-bold">
                      {closing.netPeriod.toFixed(2)}
                    </td>
                    <td className="p-3.5 font-sans">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        closing.status === 'approved'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        {statusLabels[closing.status] || closing.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* MANDATORY BOTTOM SUMMARY TOTALS BAR */}
            <tfoot className="bg-slate-100 dark:bg-[#070e17] border-t-2 border-slate-300 dark:border-slate-700 font-mono text-xs sm:text-sm font-bold">
              <tr>
                <td colSpan={4} className="p-4 text-slate-900 dark:text-white font-sans font-black">
                  المجموع الكلي ({filtered.length} وردية معروضة):
                </td>
                <td className="p-4 text-amber-500 font-black">
                  {totalCash.toFixed(2)}
                </td>
                <td className="p-4 text-sky-400 font-black">
                  {totalCard.toFixed(2)}
                </td>
                <td className="p-4 text-slate-900 dark:text-white font-black text-sm">
                  {totalSales.toFixed(2)}
                </td>
                <td className="p-4 text-rose-400 font-black">
                  {totalExpenses.toFixed(2)}
                </td>
                <td className="p-4 text-sky-400 font-black">
                  {totalRemainingInBox.toFixed(2)}
                </td>
                <td className="p-4 text-amber-400 font-black text-sm">
                  {totalNetPeriod.toFixed(2)}
                </td>
                <td className="p-4 font-sans text-xs text-slate-400">
                  {currentOrg?.currency || 'SAR'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-xs text-slate-400">
            لا توجد سجلات مطابقة لمعايير البحث في التقارير.
          </div>
        )}
      </div>

      {/* Summary Stat Cards Below Table */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 no-print">
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#0c1829] border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-[11px] text-slate-500 block mb-1">مجموع النقد</span>
          <span className="font-mono font-bold text-amber-500 text-sm">
            {formatCurrency(totalCash, currentOrg?.currency || 'SAR', language)}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-[#0c1829] border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-[11px] text-slate-500 block mb-1">مجموع الشبكة</span>
          <span className="font-mono font-bold text-sky-400 text-sm">
            {formatCurrency(totalCard, currentOrg?.currency || 'SAR', language)}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
          <span className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold block mb-1">
            مجموع المبيعات
          </span>
          <span className="font-mono font-black text-slate-900 dark:text-white text-base">
            {formatCurrency(totalSales, currentOrg?.currency || 'SAR', language)}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-[#0c1829] border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-[11px] text-slate-500 block mb-1">مجموع المشتريات</span>
          <span className="font-mono font-bold text-rose-400 text-sm">
            {formatCurrency(totalExpenses, currentOrg?.currency || 'SAR', language)}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-center">
          <span className="text-[11px] text-sky-700 dark:text-sky-300 font-semibold block mb-1">
            باقي الصناديق
          </span>
          <span className="font-mono font-bold text-sky-400 text-sm">
            {formatCurrency(totalRemainingInBox, currentOrg?.currency || 'SAR', language)}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-center">
          <span className="text-[11px] text-amber-700 dark:text-amber-300 font-bold block mb-1">
            صافي الفترات
          </span>
          <span className="font-mono font-black text-amber-500 text-base">
            {formatCurrency(totalNetPeriod, currentOrg?.currency || 'SAR', language)}
          </span>
        </div>
      </div>
    </div>
  );
};
