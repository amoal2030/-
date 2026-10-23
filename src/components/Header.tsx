import React from 'react';

interface HeaderProps {
  onOpenContact: () => void;
  onScrollTo: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenContact, onScrollTo }) => {
  return (
    <header className="sticky top-0 z-40 bg-[#F9F8F6]/95 backdrop-blur-md border-b border-[#C29B38]/20 transition-all">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark with Official Logo */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-3 whitespace-nowrap shrink-0 group py-0.5"
        >
          <img
            src="/assets/aistudio/1792776933838_1__5a26254c.png"
            alt="شعار منصة صنوف SUNOUF"
            className="w-10 h-10 object-contain rounded-full border border-[#C29B38]/40 shadow-xs group-hover:scale-105 transition-transform"
          />
          <span className="text-xl font-black text-[#333333] tracking-tight">
            صُنوف <span className="text-[#C29B38] font-bold text-sm tracking-widest uppercase">SUNOUF</span>
          </span>
        </a>

        {/* Zone 2: 4–5 Single-Line Nav Links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-[#333333]/80">
          <button
            onClick={() => onScrollTo('simulator')}
            className="hover:text-[#C29B38] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            محاكي الخدمات الحي
          </button>
          <button
            onClick={() => onScrollTo('pricing')}
            className="hover:text-[#C29B38] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            باقات الأسعار
          </button>
          <button
            onClick={() => onScrollTo('testimonials')}
            className="hover:text-[#C29B38] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            آراء المطاعم
          </button>
          <button
            onClick={() => onScrollTo('contact')}
            className="hover:text-[#C29B38] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            طلب الانضمام
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenContact}
            className="px-5 py-2.5 text-sm font-bold text-white bg-[#C29B38] hover:bg-[#A37E28] active:scale-[0.98] rounded-lg shadow-sm hover:shadow-md transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            طلب اشتراك أو تجربة
          </button>
        </div>
      </div>
    </header>
  );
};
