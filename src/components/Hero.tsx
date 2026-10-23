import React from 'react';
import { HERO_IMAGE } from '../data/mockData';

interface HeroProps {
  onExploreSimulator: () => void;
  onExplorePricing: () => void;
  onOpenQrDemo: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  onExploreSimulator,
  onExplorePricing,
  onOpenQrDemo,
}) => {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-20 border-b border-[#C29B38]/15 bg-[#F9F8F6]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Split Grid: Value Proposition + High Impact Image Focal Carrier */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Column 1: Copy and Primary CTAs */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Official Logo Brand Lockup */}
            <div className="flex items-center gap-3.5 mb-5">
              <img
                src="/assets/aistudio/1792776933838_1__5a26254c.png"
                alt="شعار صُنوف SUNOUF"
                className="w-14 h-14 object-contain rounded-full shadow-md border-2 border-[#C29B38]/40 p-0.5 bg-white"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold tracking-widest text-[#C29B38] uppercase">
                  منصة الجيل القادم لقطاع المطاعم والمقاهي الراقية
                </span>
                <span className="text-sm font-black text-[#333333]">
                  صُنوف <span className="text-[#C29B38] font-bold text-xs uppercase tracking-wider">SUNOUF</span>
                </span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#333333] leading-[1.25] tracking-tight mb-5" style={{ textWrap: 'balance' }}>
              منصة <span className="text-[#C29B38]">صُنوف</span> الرقمية للمنيو الذكي، إدارة الطلبات، وحجز الطاولات
            </h1>

            <p className="text-base lg:text-lg text-[#333333]/80 leading-relaxed mb-8 max-w-2xl font-normal">
              ارتقِ بتجربة ضيوفك مع منيو رقمي فاخر يحمل هوية مطعمك الخاصة. اختر بين التصفح برمز QR فائق السرعة، الطلب المباشر الفوري عبر WhatsApp أو الكاشير، أو الجناح الكامل لإدارة حجوزات الطاولات والمناسبات الخاصة.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 mb-10">
              <button
                onClick={onExploreSimulator}
                className="px-6 py-3.5 text-sm font-bold text-white bg-[#C29B38] hover:bg-[#A37E28] active:scale-[0.98] rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2"
              >
                <span>تجربة المحاكي التفاعلي الحي</span>
                <span aria-hidden="true" className="text-xs">←</span>
              </button>

              <button
                onClick={onExplorePricing}
                className="px-6 py-3.5 text-sm font-bold text-[#333333] bg-[#F8F3E6] hover:bg-[#eadecc] border border-[#C29B38]/30 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                خطط الأسعار والاشتراكات
              </button>

              <button
                onClick={onOpenQrDemo}
                className="px-4 py-3.5 text-xs font-semibold text-[#A37E28] hover:text-[#C29B38] transition-colors cursor-pointer whitespace-nowrap shrink-0 underline decoration-[#C29B38]/40 underline-offset-4"
              >
                معاينة وتوليد كود QR للطاولة
              </button>
            </div>

            {/* Unboxed Metadata Strip */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-semibold text-[#333333]/70 pt-4 border-t border-[#C29B38]/20">
              <span>خيار التملك الدائم بـ 1500 ر.س</span>
              <span aria-hidden="true" className="text-[#C29B38]">·</span>
              <span>طلب مباشر فوري عبر واتساب</span>
              <span aria-hidden="true" className="text-[#C29B38]">·</span>
              <span>دعم كامل لسيرفر C++ Crow فائق السرعة</span>
              <span aria-hidden="true" className="text-[#C29B38]">·</span>
              <span>تحديث أسعار وقوائم طعام بلحظات</span>
            </div>
          </div>

          {/* Column 2: High Impact 16:9 Image with Gold Frame Accent */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-[#C29B38]/30 group">
              <img
                src={HERO_IMAGE}
                alt="أجواء مطعم فاخر يستخدم منصة صنوف للمنيو الرقمي"
                referrerPolicy="no-referrer"
                className="w-full aspect-[4/3] lg:aspect-square object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-6 text-white">
                <div className="text-xs font-medium text-[#D8B458] mb-1">
                  أجواء الضيافة الراقية
                </div>
                <div className="text-lg font-bold">
                  مطعم ومقهى نجد الفاخر
                </div>
                <div className="text-xs text-stone-300 mt-1">
                  تجربة رقمية تعكس عراقة الضيافة وأناقة التقديم
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Claim-to-Proof Adjacency Strip: 4 KPI Metrics */}
        <div className="mt-14 pt-10 border-t border-[#C29B38]/20 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-4 rounded-xl bg-[#F8F3E6]/60 border border-[#C29B38]/20">
            <div className="text-2xl lg:text-3xl font-black text-[#C29B38] tabular-nums">
              0.3 ثانية
            </div>
            <div className="text-xs text-[#333333]/70 font-semibold mt-1">
              سرعة فتح المنيو عبر مسح الـ QR
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F8F3E6]/60 border border-[#C29B38]/20">
            <div className="text-2xl lg:text-3xl font-black text-[#C29B38] tabular-nums">
              +35%
            </div>
            <div className="text-xs text-[#333333]/70 font-semibold mt-1">
              معدل زيادة طلب الأطباق والحلويات
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F8F3E6]/60 border border-[#C29B38]/20">
            <div className="text-2xl lg:text-3xl font-black text-[#C29B38] tabular-nums">
              100%
            </div>
            <div className="text-xs text-[#333333]/70 font-semibold mt-1">
              دقة تفاصيل الأصناف ومسببات الحساسية
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F8F3E6]/60 border border-[#C29B38]/20">
            <div className="text-2xl lg:text-3xl font-black text-[#C29B38] tabular-nums">
              3 باقات
            </div>
            <div className="text-xs text-[#333333]/70 font-semibold mt-1">
              تصفح · طلب مباشر · حجز طاولات
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
