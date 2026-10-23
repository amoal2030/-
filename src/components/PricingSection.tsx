import React, { useState, useMemo } from 'react';
import { Check, HelpCircle, Sparkles, TrendingUp, ShieldCheck } from 'lucide-react';
import { PRICING_PLANS } from '../data/mockData';
import { BillingCycle, PricingPlan } from '../types';

interface PricingSectionProps {
  onSelectPlan: (plan: PricingPlan, cycle: BillingCycle) => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onSelectPlan }) => {
  const [cycle, setCycle] = useState<BillingCycle>('buyout');

  // ROI Calculator states
  const [dailyOrders, setDailyOrders] = useState<number>(65);
  const [avgTicket, setAvgTicket] = useState<number>(75);

  const calculatedUplift = useMemo(() => {
    // Standard F&B digital menu uplift averages ~20% through visual menu items & desserts upsell
    const monthlyGross = dailyOrders * avgTicket * 30;
    const estimatedIncrease = monthlyGross * 0.18;
    const waiterHoursSavedMonthly = dailyOrders * 30 * 2.5 / 60; // 2.5 min saved per order
    return {
      monthlyGross,
      estimatedIncrease: Math.round(estimatedIncrease),
      waiterHoursSavedMonthly: Math.round(waiterHoursSavedMonthly),
    };
  }, [dailyOrders, avgTicket]);

  const cycleLabels: Record<BillingCycle, { label: string; periodText: string }> = {
    weekly: { label: 'أسبوعي', periodText: 'ر.س / أسبوعياً' },
    monthly: { label: 'شهري', periodText: 'ر.س / شهرياً' },
    yearly: { label: 'سنوي', periodText: 'ر.س / سنوياً' },
    buyout: { label: 'شراء ملكية تامة', periodText: 'ر.س / تدفع مرة واحدة مدى الحياة' },
  };

  return (
    <section id="pricing" className="py-16 lg:py-24 bg-[#F9F8F6] border-b border-[#C29B38]/15">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="text-xs font-bold tracking-widest text-[#C29B38] uppercase mb-2">
            جدول الأسعار والاشتراكات الواضحة
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#333333] mb-4">
            استثمار مرن بلا عمولات خفية مع خيار التملك الدائم
          </h2>
          <p className="text-sm lg:text-base text-[#333333]/80 leading-relaxed">
            اختر بين الاشتراك الأسبوعي، الشهري، السنوي، أو التملك الدائم لمنصتك مدى الحياة دون أي رسوم تجديد دورية.
          </p>
        </div>

        {/* 4-Period Switcher Segmented Control */}
        <div className="flex justify-center mb-12">
          <div className="p-1.5 bg-[#F8F3E6] border border-[#C29B38]/30 rounded-2xl shadow-inner grid grid-cols-2 sm:grid-cols-4 gap-1 w-full max-w-2xl">
            {(['weekly', 'monthly', 'yearly', 'buyout'] as BillingCycle[]).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
                  cycle === c
                    ? 'bg-[#C29B38] text-white shadow-md'
                    : 'text-[#333333] hover:text-[#C29B38] hover:bg-white/50'
                }`}
              >
                <span>{cycleLabels[c].label}</span>
                {c === 'buyout' && (
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-black">
                    وفر للأبد
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 3 Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-16">
          {PRICING_PLANS.map((plan) => {
            const price = plan.prices[cycle];
            const isFeatured = plan.isPopular;

            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-7 flex flex-col justify-between transition-all relative ${
                  isFeatured
                    ? 'bg-white border-2 border-[#C29B38] shadow-xl md:-translate-y-2'
                    : 'bg-[#F9F8F6] border border-[#C29B38]/25 shadow-sm hover:border-[#C29B38]/60'
                }`}
              >
                {isFeatured && (
                  <div className="absolute -top-3.5 right-6 px-4 py-1 bg-[#C29B38] text-white text-[11px] font-black rounded-full uppercase tracking-wider shadow-sm">
                    {plan.tag}
                  </div>
                )}

                <div>
                  <div className="text-xs font-bold text-[#A37E28] uppercase tracking-wider mb-1">
                    {plan.subtitle}
                  </div>
                  <h3 className="text-xl font-black text-[#333333] mb-2">
                    {plan.title}
                  </h3>
                  <p className="text-xs text-[#333333]/75 leading-relaxed mb-6 min-h-[36px]">
                    {plan.highlight}
                  </p>

                  {/* Price Block */}
                  <div className="py-4 px-5 rounded-xl bg-[#F8F3E6]/70 border border-[#C29B38]/20 mb-6">
                    <div className="flex items-baseline gap-1 text-[#333333]">
                      <span className="text-3xl sm:text-4xl font-black text-[#C29B38] tabular-nums">
                        {price}
                      </span>
                      <span className="text-xs font-bold text-[#333333]">ر.س</span>
                    </div>
                    <div className="text-[11px] font-semibold text-stone-500 mt-0.5">
                      {cycleLabels[cycle].periodText}
                    </div>
                  </div>

                  {/* Features list */}
                  <div className="space-y-3 text-xs text-[#333333] mb-8">
                    <div className="font-bold text-[#333333] text-[11px] uppercase tracking-wider">
                      المزايا المشمولة:
                    </div>
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-[#C29B38] shrink-0 mt-0.5" />
                        <span className="leading-snug">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => onSelectPlan(plan, cycle)}
                    className={`w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                      isFeatured
                        ? 'bg-[#C29B38] hover:bg-[#A37E28] text-white shadow-md'
                        : 'bg-white hover:bg-[#F8F3E6] text-[#333333] border border-[#C29B38]/40 hover:border-[#C29B38]'
                    }`}
                  >
                    <span>طلب {plan.title}</span>
                    <span aria-hidden="true">←</span>
                  </button>

                  <div className="mt-2.5 text-center text-[11px] text-stone-500">
                    {cycle === 'buyout'
                      ? 'ملكية كاملة مدى الحياة بكود المصدر'
                      : 'تفعيل فوري خلال دقائق'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive ROI Calculator for Restaurant Owners */}
        <div className="bg-white rounded-3xl p-8 lg:p-10 border border-[#C29B38]/30 shadow-md mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Calculator Inputs */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-2 text-xs font-bold text-[#C29B38] uppercase tracking-wider">
                <TrendingUp className="w-4 h-4" />
                <span>حاسبة العائد الاستثماري لمطعمك</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-[#333333]">
                كم سيرتفع دخلك الشهري بعد تطبيق قائمة "صنوف" الفاخرة؟
              </h3>
              <p className="text-xs sm:text-sm text-[#333333]/80 leading-relaxed">
                الصور الاحترافية والطلب السلس يقللان تردد الضيف ويرفعان متوسط طلب الحلويات والمقبلات والمشروبات بنسبة تتجاوز 18%.
              </p>

              {/* Slider 1: Daily Orders */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-[#333333]">
                  <span>متوسط عدد الطلبات اليومية:</span>
                  <span className="text-[#C29B38] font-black text-sm tabular-nums">
                    {dailyOrders} طلب / يومياً
                  </span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={250}
                  step={5}
                  value={dailyOrders}
                  onChange={(e) => setDailyOrders(parseInt(e.target.value))}
                  className="w-full accent-[#C29B38] cursor-pointer"
                />
              </div>

              {/* Slider 2: Average Check */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-[#333333]">
                  <span>متوسط قيمة الفاتورة الحالية:</span>
                  <span className="text-[#C29B38] font-black text-sm tabular-nums">
                    {avgTicket} ر.س
                  </span>
                </div>
                <input
                  type="range"
                  min={25}
                  max={250}
                  step={5}
                  value={avgTicket}
                  onChange={(e) => setAvgTicket(parseInt(e.target.value))}
                  className="w-full accent-[#C29B38] cursor-pointer"
                />
              </div>
            </div>

            {/* Calculator Results Display */}
            <div className="lg:col-span-5 bg-[#F8F3E6] rounded-2xl p-6 border border-[#C29B38]/30 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-[#A37E28] mb-1">
                  الزيادة التقديرية في الأرباح الشهرية
                </div>
                <div className="text-3xl sm:text-4xl font-black text-[#C29B38] tabular-nums mb-3">
                  +{calculatedUplift.estimatedIncrease.toLocaleString()} <span className="text-sm font-bold text-[#333333]">ر.س / شهرياً</span>
                </div>
                <div className="text-xs text-[#333333]/80 leading-relaxed space-y-2 border-t border-[#C29B38]/20 pt-3">
                  <div className="flex justify-between">
                    <span>مبيعات المطعم الشهرية الحالية:</span>
                    <span className="font-bold tabular-nums">{calculatedUplift.monthlyGross.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ساعات عمل المباشرين الموفرة:</span>
                    <span className="font-bold text-[#A37E28] tabular-nums">{calculatedUplift.waiterHoursSavedMonthly} ساعة / شهرياً</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#C29B38]/20 text-[11px] text-stone-600 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#C29B38] shrink-0" />
                <span>تكلفة باقة التملك (1500 ر.س) تُسترد خلال أول 3 أيام فقط!</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-white rounded-3xl p-6 lg:p-8 border border-[#C29B38]/25 shadow-sm overflow-x-auto">
          <h3 className="text-lg font-black text-[#333333] mb-6">
            مقارنة شاملة بين باقات منصة صنوف (SUNOUF)
          </h3>
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-[#C29B38]/20 text-stone-500 font-bold">
                <th className="py-3 px-3">الخاصية والوظيفة</th>
                <th className="py-3 px-3 text-center">تصفح فقط (1500 ر.س)</th>
                <th className="py-3 px-3 text-center text-[#C29B38]">تصفح + طلب (1900 ر.س)</th>
                <th className="py-3 px-3 text-center">الجناح الشامل (2500 ر.س)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-[#333333]">
              <tr>
                <td className="py-3 px-3 font-semibold">توليد وطباعة كود QR مخصص للطاولات</td>
                <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-[#C29B38] mx-auto" /></td>
                <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-[#C29B38] mx-auto" /></td>
                <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-[#C29B38] mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold">عرض الصور عالية الدقة ومسببات الحساسية</td>
                <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-[#C29B38] mx-auto" /></td>
                <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-[#C29B38] mx-auto" /></td>
                <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-[#C29B38] mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold">سلة إلكترونية وإرسال فوري لواتساب الكاشير</td>
                <td className="py-3 px-3 text-center text-stone-300">-</td>
                <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-[#C29B38] mx-auto" /></td>
                <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-[#C29B38] mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold">إدارة حجز الطاولات والمناسبات والحفلات</td>
                <td className="py-3 px-3 text-center text-stone-300">-</td>
                <td className="py-3 px-3 text-center text-stone-300">-</td>
                <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-[#C29B38] mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold">ربط مع سيرفر C++ Crow فائق السرعة عبر REST API</td>
                <td className="py-3 px-3 text-center text-stone-300">-</td>
                <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-[#C29B38] mx-auto" /></td>
                <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-[#C29B38] mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold">عمولات مبيعات مقتطعة</td>
                <td className="py-3 px-3 text-center font-bold text-emerald-600">0% (صفر)</td>
                <td className="py-3 px-3 text-center font-bold text-emerald-600">0% (صفر)</td>
                <td className="py-3 px-3 text-center font-bold text-emerald-600">0% (صفر)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
