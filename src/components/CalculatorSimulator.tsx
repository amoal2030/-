import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { calculateShiftTotals, formatCurrency } from '../utils/accounting';
import {
  Calculator,
  Coins,
  CreditCard,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Info,
  RotateCcw
} from 'lucide-react';

export const CalculatorSimulator: React.FC = () => {
  const { t, language } = useLanguage();

  // Test case default: 1500 Cash, 2000 Card, 400 Purchases
  const [cash, setCash] = useState<string>('1500');
  const [card, setCard] = useState<string>('2000');
  const [expenses, setExpenses] = useState<string>('400');
  const [currency, setCurrency] = useState<string>('SAR');

  const calculations = calculateShiftTotals(cash, card, expenses);

  const handleLoadBenchmark = () => {
    setCash('1500');
    setCard('2000');
    setExpenses('400');
  };

  const handleReset = () => {
    setCash('0');
    setCard('0');
    setExpenses('0');
  };

  return (
    <section id="simulator" className="py-20 bg-slate-100/70 dark:bg-[#0b192c]/60 border-y border-slate-200 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Calculator className="w-3.5 h-3.5" />
            <span>{t('simTitle')}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('simTitle')}
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-300">
            {t('simSubtitle')}
          </p>

          {/* Benchmark Load Bar */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleLoadBenchmark}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-sm transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{t('simLoadExample')}</span>
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة التعيين</span>
            </button>
          </div>
        </div>

        {/* Main Grid: Inputs on Left, Equations & Outputs on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Input Cards: 5 Cols */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-[#0c1829] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-lg space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  مدخلات الوردية المالية
                </span>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
                >
                  <option value="SAR">SAR (ر.س)</option>
                  <option value="AED">AED (د.إ)</option>
                  <option value="QAR">QAR (ر.ق)</option>
                  <option value="KWD">KWD (د.ك)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>

              {/* Cash Sales Input */}
              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-500" />
                    {t('simCash')}
                  </span>
                  <span className="text-[11px] text-slate-400">نقد الكاش الفعلي</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cash}
                    onChange={(e) => setCash(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-900 dark:text-white font-mono text-base font-bold transition-all"
                  />
                  <span className="absolute end-3 top-3.5 text-xs font-medium text-slate-400">
                    {currency}
                  </span>
                </div>
              </div>

              {/* Card Sales Input */}
              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-sky-400" />
                    {t('simCard')}
                  </span>
                  <span className="text-[11px] text-slate-400">مدى / فيزا / ماستر</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={card}
                    onChange={(e) => setCard(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-900 dark:text-white font-mono text-base font-bold transition-all"
                  />
                  <span className="absolute end-3 top-3.5 text-xs font-medium text-slate-400">
                    {currency}
                  </span>
                </div>
              </div>

              {/* Expenses Input */}
              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-rose-400" />
                    {t('simExpenses')}
                  </span>
                  <span className="text-[11px] text-slate-400">مصروفات وفواتير الوردية</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={expenses}
                    onChange={(e) => setExpenses(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-slate-900 dark:text-white font-mono text-base font-bold transition-all"
                  />
                  <span className="absolute end-3 top-3.5 text-xs font-medium text-slate-400">
                    {currency}
                  </span>
                </div>
              </div>

              {/* Verification Info Note */}
              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t('simTestNotes')}
                </p>
              </div>
            </div>
          </div>

          {/* Results & Math Breakdown: 7 Cols */}
          <div className="lg:col-span-7 space-y-4">
            {/* Output Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Sales */}
              <div className="bg-white dark:bg-[#0c1829] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-md relative overflow-hidden group">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-amber-300" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                  {t('simTotalSales')}
                </span>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
                  {formatCurrency(calculations.totalSales, currency, language)}
                </div>
                <div className="mt-2 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded inline-block">
                  {t('simTotalFormula')}
                </div>
              </div>

              {/* Remaining in Box */}
              <div className="bg-white dark:bg-[#0c1829] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-md relative overflow-hidden group">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sky-500 to-indigo-400" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                  {t('simRemainingInBox')}
                </span>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
                  {formatCurrency(calculations.remainingInBox, currency, language)}
                </div>
                <div className="mt-2 text-[11px] font-medium text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded inline-block">
                  {t('simRemainingFormula')}
                </div>
              </div>

              {/* Net Period */}
              <div className="bg-white dark:bg-[#0c1829] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-md relative overflow-hidden group">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 to-yellow-500" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                  {t('simNetPeriod')}
                </span>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
                  {formatCurrency(calculations.netPeriod, currency, language)}
                </div>
                <div className="mt-2 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded inline-block">
                  {t('simNetFormula')}
                </div>
              </div>
            </div>

            {/* Live Formula Walkthrough Card */}
            <div className="bg-white dark:bg-[#0c1829] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-500" />
                <span>تفصيل المعادلات الحسابية المعتمدة وفقاً للبيانات المدخلة</span>
              </h3>

              <div className="space-y-3 font-mono text-xs sm:text-sm">
                {/* 1. Total Sales Calculation Row */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-500 font-bold flex items-center justify-center text-xs">
                      1
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-sans font-medium">
                      إجمالي المبيعات = النقد + الشبكة
                    </span>
                  </div>
                  <div className="text-slate-900 dark:text-white font-bold">
                    {formatCurrency(calculations.cashSales, currency, language)} +{' '}
                    {formatCurrency(calculations.cardSales, currency, language)} ={' '}
                    <span className="text-amber-500">
                      {formatCurrency(calculations.totalSales, currency, language)}
                    </span>
                  </div>
                </div>

                {/* 2. Remaining in Box Calculation Row */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-xs">
                      2
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-sans font-medium">
                      الباقي في الصندوق = النقد - المشتريات
                    </span>
                  </div>
                  <div className="text-slate-900 dark:text-white font-bold">
                    {formatCurrency(calculations.cashSales, currency, language)} -{' '}
                    {formatCurrency(calculations.expenses, currency, language)} ={' '}
                    <span className="text-sky-400">
                      {formatCurrency(calculations.remainingInBox, currency, language)}
                    </span>
                  </div>
                </div>

                {/* 3. Net Period Calculation Row */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
                      3
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-sans font-medium">
                      صافي الفترة = إجمالي المبيعات - المشتريات
                    </span>
                  </div>
                  <div className="text-slate-900 dark:text-white font-bold">
                    {formatCurrency(calculations.totalSales, currency, language)} -{' '}
                    {formatCurrency(calculations.expenses, currency, language)} ={' '}
                    <span className="text-amber-400">
                      {formatCurrency(calculations.netPeriod, currency, language)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Alert */}
              <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>الحالة الحسابية: متطابقة بدقة عشرية سليمة</span>
                <span className="font-semibold text-amber-500">خالٍ من الفروقات</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
