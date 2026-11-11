import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency } from '../../utils/accounting';
import { FinancialCharts } from '../common/Charts';
import {
  Coins,
  CreditCard,
  ShoppingBag,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  RotateCcw,
  GitBranch,
  Users,
  HardDrive,
  ShieldCheck,
  Calendar,
  Sparkles
} from 'lucide-react';

interface ManagerOverviewProps {
  onNavigateTab: (tab: 'branches' | 'employees' | 'closings' | 'reports') => void;
}

export const ManagerOverview: React.FC<ManagerOverviewProps> = ({ onNavigateTab }) => {
  const { closings, branches, employees, currentOrg } = useAuth();
  const { language, t } = useLanguage();

  const [filterBranchId, setFilterBranchId] = useState<string>('all');

  // Filter closings for stats
  const activeClosings = closings.filter((c) => {
    if (filterBranchId !== 'all' && c.branchId !== filterBranchId) return false;
    return true;
  });

  // Approved and all totals
  const totalSales = activeClosings.reduce((sum, c) => sum + c.totalSales, 0);
  const totalCash = activeClosings.reduce((sum, c) => sum + c.cashSales, 0);
  const totalCard = activeClosings.reduce((sum, c) => sum + c.cardSales, 0);
  const totalExpenses = activeClosings.reduce((sum, c) => sum + c.expenses, 0);
  const totalRemainingInBox = activeClosings.reduce((sum, c) => sum + c.remainingInBox, 0);
  const totalNetPeriod = activeClosings.reduce((sum, c) => sum + c.netPeriod, 0);

  // Status counts
  const pendingCount = activeClosings.filter((c) => c.status === 'pending_review').length;
  const approvedCount = activeClosings.filter((c) => c.status === 'approved').length;
  const rejectedCount = activeClosings.filter((c) => c.status === 'rejected').length;

  return (
    <div className="space-y-8">
      {/* Top Filter and Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            مؤشرات الأداء المالي والإقفالات
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            ملخص فوري لجميع صناديق الفروع والمبيعات والمصروفات
          </span>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterBranchId}
            onChange={(e) => setFilterBranchId(e.target.value)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#0c1829] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white shadow-sm"
          >
            <option value="all">جميع الفروع ({branches.length})</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 10 Required KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        {/* 1. Total Sales */}
        <div className="bg-white dark:bg-[#0c1829] rounded-2xl p-3 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-amber-500" />
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1 truncate">
            إجمالي المبيعات
          </span>
          <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white font-mono truncate">
            {formatCurrency(totalSales, currentOrg?.currency || 'SAR', language)}
          </div>
          <span className="text-[9px] sm:text-[10px] text-amber-500 font-medium">نقد + شبكة</span>
        </div>

        {/* 2. Total Cash */}
        <div className="bg-white dark:bg-[#0c1829] rounded-2xl p-3 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-amber-400" />
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1 truncate">
            إجمالي النقد (كاش)
          </span>
          <div className="text-base sm:text-xl font-black text-amber-500 font-mono truncate">
            {formatCurrency(totalCash, currentOrg?.currency || 'SAR', language)}
          </div>
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">السيولة المستلمة</span>
        </div>

        {/* 3. Total Card */}
        <div className="bg-white dark:bg-[#0c1829] rounded-2xl p-3 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-sky-400" />
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1 truncate">
            إجمالي الشبكة (مدى)
          </span>
          <div className="text-base sm:text-xl font-black text-sky-400 font-mono truncate">
            {formatCurrency(totalCard, currentOrg?.currency || 'SAR', language)}
          </div>
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">مدفوعات نقاط البيع</span>
        </div>

        {/* 4. Total Expenses */}
        <div className="bg-white dark:bg-[#0c1829] rounded-2xl p-3 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-rose-400" />
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1 truncate">
            إجمالي المشتريات
          </span>
          <div className="text-base sm:text-xl font-black text-rose-400 font-mono truncate">
            {formatCurrency(totalExpenses, currentOrg?.currency || 'SAR', language)}
          </div>
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">مصروفات الصناديق</span>
        </div>

        {/* 5. Remaining in Box */}
        <div className="bg-white dark:bg-[#0c1829] rounded-2xl p-3 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-sky-500" />
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1 truncate">
            الكاش المتبقي بالصندوق
          </span>
          <div className="text-base sm:text-xl font-black text-sky-500 font-mono truncate">
            {formatCurrency(totalRemainingInBox, currentOrg?.currency || 'SAR', language)}
          </div>
          <span className="text-[9px] sm:text-[10px] text-sky-600 dark:text-sky-400 font-medium">
            النقد - المشتريات
          </span>
        </div>

        {/* 6. Net Revenue */}
        <div className="bg-white dark:bg-[#0c1829] rounded-2xl p-3 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-amber-400" />
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1 truncate">
            صافي المبيعات
          </span>
          <div className="text-base sm:text-xl font-black text-amber-400 font-mono truncate">
            {formatCurrency(totalNetPeriod, currentOrg?.currency || 'SAR', language)}
          </div>
          <span className="text-[9px] sm:text-[10px] text-amber-500 font-medium">المبيعات - المشتريات</span>
        </div>

        {/* 7. Total Closings */}
        <div className="bg-white dark:bg-[#0c1829] rounded-2xl p-3 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-slate-400" />
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1 truncate">
            عدد الإقفالات
          </span>
          <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white font-mono">
            {activeClosings.length}
          </div>
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">جميع الورديات</span>
        </div>

        {/* 8. Pending Closings */}
        <div
          onClick={() => onNavigateTab('closings')}
          className="bg-white dark:bg-[#0c1829] rounded-2xl p-3 sm:p-5 border border-amber-500/30 shadow-sm relative overflow-hidden group cursor-pointer hover:border-amber-400 transition-colors"
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-amber-500 animate-pulse" />
          <span className="text-[10px] sm:text-[11px] font-medium text-amber-600 dark:text-amber-400 block mb-1 flex items-center justify-between">
            <span>معلق للمراجعة</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </span>
          <div className="text-base sm:text-xl font-black text-amber-500 font-mono">
            {pendingCount}
          </div>
          <span className="text-[9px] sm:text-[10px] text-amber-600 dark:text-amber-400 font-semibold underline">
            فحص واعتماد الآن ←
          </span>
        </div>

        {/* 9. Approved Closings */}
        <div className="bg-white dark:bg-[#0c1829] rounded-2xl p-3 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-amber-400" />
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1 flex items-center justify-between">
            <span>إقفالات معتمدة</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
          </span>
          <div className="text-base sm:text-xl font-black text-amber-400 font-mono">
            {approvedCount}
          </div>
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">مقفلة رسمياً</span>
        </div>

        {/* 10. Rejected Closings */}
        <div className="bg-white dark:bg-[#0c1829] rounded-2xl p-3 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-rose-500" />
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1 flex items-center justify-between">
            <span>معاد للتعديل</span>
            <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
          </span>
          <div className="text-base sm:text-xl font-black text-rose-400 font-mono">
            {rejectedCount}
          </div>
          <span className="text-[9px] sm:text-[10px] text-rose-500 font-medium">بانتظار تصحيح الموظف</span>
        </div>
      </div>

      {/* Visual Charts */}
      <FinancialCharts
        closings={activeClosings}
        currency={currentOrg?.currency || 'SAR'}
        language={language}
      />

      {/* Pending Reviews Alert Banner */}
      {pendingCount > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0b192c] to-[#0f2038] text-white border border-amber-500/40 flex flex-wrap items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold">
                لديك {pendingCount} إقفال وردية بانتظار المراجعة والاعتماد
              </h4>
              <p className="text-xs text-slate-300">
                قام الموظفون برفع مبيعات النقد والشبكة والمرفقات؛ يمكنك اعتمادها الآن لإدراجها في الكشوفات الرسمية.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('closings')}
            className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-md transition-all active:scale-95"
          >
            الانتقال لجدول الإقفالات
          </button>
        </div>
      )}
    </div>
  );
};
