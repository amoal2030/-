import React from 'react';

interface FooterProps {
  onScrollTo: (id: string) => void;
  onOpenQrDemo: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onScrollTo, onOpenQrDemo }) => {
  return (
    <footer className="bg-[#1A1A1A] text-stone-300 py-14 border-t border-[#C29B38]/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-stone-800">
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/assets/aistudio/1792776933838_1__5a26254c.png"
                alt="شعار صنوف SUNOUF"
                className="w-12 h-12 object-contain rounded-full bg-white p-0.5 border border-[#C29B38]/40 shadow-sm"
              />
              <span className="text-xl font-black text-white">
                صُنوف <span className="text-[#C29B38] font-bold text-sm tracking-widest uppercase">SUNOUF</span>
              </span>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed max-w-sm">
              المنصة السحابية المتقدمة لقوائم الطعام الرقمية الذكية، إدارة الطلبات المباشرة، وحجز الطاولات والمناسبات للعلامات التجارية والمطاعم الراقية في المملكة والخليج.
            </p>

            <div className="text-[11px] text-stone-500 space-y-1">
              <div>المكدس التقني: HTML5 · Tailwind CSS · JavaScript ES6 · C++ Crow Engine</div>
              <div>خادم الباك إند: C++ Framework Port 8080 · معالجة فائقة السرعة</div>
            </div>
          </div>

          {/* Nav Quick Links */}
          <div className="md:col-span-3 space-y-3">
            <div className="text-xs font-bold text-white uppercase tracking-wider">
              خدمات المنصة
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onScrollTo('simulator')}
                  className="hover:text-[#C29B38] transition-colors"
                >
                  01. تصفح فقط (Browse Only)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onScrollTo('simulator')}
                  className="hover:text-[#C29B38] transition-colors"
                >
                  02. تصفح + طلب (Browse & Order)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onScrollTo('simulator')}
                  className="hover:text-[#C29B38] transition-colors"
                >
                  03. تصفح + طلب + حجز (Full Suite)
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenQrDemo}
                  className="hover:text-[#C29B38] transition-colors"
                >
                  توليد كود QR للطاولة
                </button>
              </li>
            </ul>
          </div>

          {/* Pricing & Backend Links */}
          <div className="md:col-span-4 space-y-3">
            <div className="text-xs font-bold text-white uppercase tracking-wider">
              الاشتراكات والتقنية
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onScrollTo('pricing')}
                  className="hover:text-[#C29B38] transition-colors"
                >
                  خطة التملك الدائم (1500 ر.س - 2500 ر.س)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onScrollTo('pricing')}
                  className="hover:text-[#C29B38] transition-colors"
                >
                  الاشتراكات الأسبوعية والشهرية والسنوية
                </button>
              </li>
              <li>
                <button
                  onClick={() => onScrollTo('contact')}
                  className="text-[#C29B38] hover:text-[#D8B458] font-bold transition-colors"
                >
                  طلب انضمام المطعم وتفعيل فوري
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Quiet Bottom Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-500 gap-4">
          <div>
            جميع الحقوق محفوظة © {new Date().getFullYear()} منصة صُنوف (SUNOUF) لتقنية المطاعم.
          </div>
          <div className="flex items-center gap-4">
            <span>الهوية والألوان الرسمية: الذهبي (#C29B38) والفحمي (#333333)</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
