import React from 'react';
import { Quote } from 'lucide-react';
import { TESTIMONIALS } from '../data/mockData';

export const Testimonials: React.FC = () => {
  return (
    <section id="testimonials" className="py-16 lg:py-24 bg-[#F9F8F6] border-b border-[#C29B38]/15">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="text-xs font-bold tracking-widest text-[#C29B38] uppercase mb-2">
            شهادات شركاء النجاح
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#333333] mb-4">
            تجارب حقيقية من نخبة مدراء المطاعم والمقاهي في المملكة
          </h2>
          <p className="text-sm lg:text-base text-[#333333]/80 leading-relaxed">
            تعرّف كيف ساهمت منصة "صنوف" في رفع كفاءة التشغيل وأناقة التقديم وزيادة الإيرادات اليومية.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-7 border border-[#C29B38]/25 shadow-sm flex flex-col justify-between hover:border-[#C29B38]/60 transition-all"
            >
              <div>
                <Quote className="w-8 h-8 text-[#C29B38]/30 mb-4" />
                <p className="text-xs sm:text-sm text-[#333333] leading-relaxed mb-6 font-normal">
                  "{t.quote}"
                </p>
              </div>

              <div className="pt-4 border-t border-[#C29B38]/15">
                <div className="text-xs font-extrabold text-[#C29B38] tabular-nums mb-2">
                  {t.stat}
                </div>
                <div className="text-sm font-black text-[#333333]">
                  {t.name}
                </div>
                <div className="text-xs text-stone-500 font-medium">
                  {t.role} · {t.restaurant}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
