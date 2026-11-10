import React from 'react';
import { ShiftClosing } from '../../types';
import { formatCurrency } from '../../utils/accounting';

interface FinancialChartsProps {
  closings: ShiftClosing[];
  currency: string;
  language: 'ar' | 'en' | 'ur';
}

export const FinancialCharts: React.FC<FinancialChartsProps> = ({
  closings,
  currency,
  language,
}) => {
  // Aggregate data by date (last 7 days)
  const last7DaysMap = new Map<string, { date: string; cash: number; card: number; total: number }>();

  // Sort closings by date
  const sorted = [...closings].sort((a, b) => a.date.localeCompare(b.date));

  sorted.forEach((c) => {
    const existing = last7DaysMap.get(c.date) || { date: c.date, cash: 0, card: 0, total: 0 };
    existing.cash += c.cashSales;
    existing.card += c.cardSales;
    existing.total += c.totalSales;
    last7DaysMap.set(c.date, existing);
  });

  const dailyData = Array.from(last7DaysMap.values()).slice(-7);
  const maxSales = Math.max(...dailyData.map((d) => d.total), 100);

  // Totals for cash vs card split
  const totalCash = closings.reduce((sum, c) => sum + c.cashSales, 0);
  const totalCard = closings.reduce((sum, c) => sum + c.cardSales, 0);
  const grandTotal = totalCash + totalCard;
  const cashPercentage = grandTotal > 0 ? Math.round((totalCash / grandTotal) * 100) : 50;
  const cardPercentage = grandTotal > 0 ? 100 - cashPercentage : 50;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Daily Sales Trend Chart (2 Cols) */}
      <div className="lg:col-span-2 bg-white dark:bg-[#0c1829] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              حركة المبيعات اليومية (النقد والشبكة)
            </h4>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              مقارنة الإيرادات اليومية المعتمدة
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-amber-500 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              النقد (كاش)
            </span>
            <span className="flex items-center gap-1.5 text-sky-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              الشبكة (مدى/بطاقات)
            </span>
          </div>
        </div>

        {dailyData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-slate-400">
            لا توجد بيانات مسجلة كافية لعرض الرسم البياني بعد
          </div>
        ) : (
          <div className="h-52 flex items-end justify-between gap-2 sm:gap-4 pt-6 pb-2 px-2">
            {dailyData.map((d, idx) => {
              const heightTotal = Math.round((d.total / maxSales) * 100);
              const cashShare = d.total > 0 ? (d.cash / d.total) * 100 : 50;
              const cardShare = 100 - cashShare;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] p-1.5 rounded shadow pointer-events-none whitespace-nowrap mb-1">
                    <div>{d.date}</div>
                    <div className="font-bold text-amber-400">
                      {formatCurrency(d.total, currency, language)}
                    </div>
                  </div>

                  {/* Dual Bar */}
                  <div
                    className="w-full max-w-[42px] rounded-t-lg overflow-hidden flex flex-col justify-end transition-all duration-300 group-hover:brightness-110"
                    style={{ height: `${Math.max(heightTotal, 8)}%` }}
                  >
                    <div
                      className="w-full bg-sky-400 transition-all"
                      style={{ height: `${cardShare}%` }}
                      title={`شبكة: ${d.card}`}
                    />
                    <div
                      className="w-full bg-amber-400 transition-all"
                      style={{ height: `${cashShare}%` }}
                      title={`نقد: ${d.cash}`}
                    />
                  </div>

                  <span className="text-[10px] font-mono text-slate-400 truncate max-w-[50px]">
                    {d.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Cash vs Network Distribution Split */}
      <div className="bg-white dark:bg-[#0c1829] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 flex flex-col justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
            توزيع قنوات الدفع (نقد مقابل شبكة)
          </h4>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            نسبة السيولة النقدية مقابل المدفوعات الإلكترونية
          </span>
        </div>

        {grandTotal === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            سيتم احتساب النسبة فور اعتماد أول إقفال
          </div>
        ) : (
          <div className="space-y-5">
            {/* Split Progress Bar */}
            <div className="h-4 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex shadow-inner">
              <div
                className="bg-amber-400 transition-all duration-500"
                style={{ width: `${cashPercentage}%` }}
              />
              <div
                className="bg-sky-400 transition-all duration-500"
                style={{ width: `${cardPercentage}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold block">
                  النقد (كاش) {cashPercentage}%
                </span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                  {formatCurrency(totalCash, currency, language)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
                <span className="text-[11px] text-sky-700 dark:text-sky-300 font-semibold block">
                  الشبكة (مدى) {cardPercentage}%
                </span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                  {formatCurrency(totalCard, currency, language)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="text-[11px] text-slate-400 p-2.5 rounded-lg bg-slate-50 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800 text-center">
          مطابقة تامة بدقة الهللات
        </div>
      </div>
    </div>
  );
};
