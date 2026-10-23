import React, { useState } from 'react';
import { X, Download, Printer, Check, Copy } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTable?: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  defaultTable = '04',
}) => {
  const [tableNumber, setTableNumber] = useState<string>(defaultTable);
  const [theme, setTheme] = useState<'gold' | 'dark'>('gold');
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://sunouf.sa';
  const menuLink = `${currentUrl}?table=${tableNumber}&mode=menu`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(menuLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border-t-4 border-[#C29B38] relative">
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-1.5 rounded-full text-stone-400 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="text-xs font-bold text-[#A37E28] uppercase tracking-wider mb-1">
            رمز الاستجابة السريعة للطاولات (QR Code)
          </div>
          <h3 className="text-xl font-black text-[#333333]">
            كود QR الفاخر لطاولة مطعمك
          </h3>
        </div>

        {/* Table Number Customizer */}
        <div className="mb-5 flex items-center gap-3">
          <label className="text-xs font-bold text-[#333333] shrink-0">
            رقم الطاولة:
          </label>
          <input
            type="text"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            className="flex-1 p-2 bg-[#F9F8F6] border border-[#C29B38]/30 rounded-xl text-xs font-bold text-[#333333] focus:outline-none focus:border-[#C29B38]"
            placeholder="مثال: 04 أو VIP-A"
          />
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => setTheme('gold')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                theme === 'gold'
                  ? 'bg-[#C29B38] text-white border-[#C29B38]'
                  : 'bg-white text-stone-600 border-stone-200'
              }`}
            >
              ذهبي
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-[#333333] text-white border-[#333333]'
                  : 'bg-white text-stone-600 border-stone-200'
              }`}
            >
              داكن
            </button>
          </div>
        </div>

        {/* Printable Card Preview */}
        <div
          id="qr-printable-stand"
          className={`p-6 rounded-2xl text-center border-2 mb-6 transition-all ${
            theme === 'gold'
              ? 'bg-[#F8F3E6] border-[#C29B38] shadow-md'
              : 'bg-[#1F1F1F] text-white border-stone-700 shadow-xl'
          }`}
        >
          {/* Brand header */}
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <img
              src="/assets/aistudio/1792776933838_1__5a26254c.png"
              alt="شعار صنوف SUNOUF"
              className="w-10 h-10 object-contain rounded-full bg-white p-0.5 border border-[#C29B38]/40 shadow-xs"
            />
            <div className="text-sm font-black">
              صُنوف <span className="text-[#C29B38] font-bold text-xs uppercase">SUNOUF</span>
            </div>
          </div>

          <div className="text-xs font-semibold opacity-80 mb-4">
            امسح الكود لتصفح المنيو والطلب مباشرة
          </div>

          {/* Real QR SVG Pattern Representation */}
          <div className="w-44 h-44 mx-auto bg-white p-3 rounded-2xl shadow-inner border border-[#C29B38]/40 flex flex-col items-center justify-center relative">
            <svg
              className="w-full h-full text-[#333333]"
              viewBox="0 0 100 100"
              fill="currentColor"
            >
              {/* Corner position markers */}
              <rect x="5" y="5" width="25" height="25" fill="#333333" rx="4" />
              <rect x="9" y="9" width="17" height="17" fill="white" rx="2" />
              <rect x="13" y="13" width="9" height="9" fill="#C29B38" rx="1.5" />

              <rect x="70" y="5" width="25" height="25" fill="#333333" rx="4" />
              <rect x="74" y="9" width="17" height="17" fill="white" rx="2" />
              <rect x="78" y="13" width="9" height="9" fill="#C29B38" rx="1.5" />

              <rect x="5" y="70" width="25" height="25" fill="#333333" rx="4" />
              <rect x="9" y="74" width="17" height="17" fill="white" rx="2" />
              <rect x="13" y="78" width="9" height="9" fill="#C29B38" rx="1.5" />

              {/* Data matrix dots */}
              <rect x="36" y="8" width="5" height="5" />
              <rect x="44" y="8" width="5" height="5" fill="#C29B38" />
              <rect x="52" y="8" width="5" height="5" />
              <rect x="60" y="8" width="5" height="5" />

              <rect x="36" y="18" width="5" height="5" fill="#C29B38" />
              <rect x="48" y="18" width="5" height="5" />
              <rect x="56" y="18" width="5" height="5" fill="#C29B38" />

              <rect x="8" y="36" width="5" height="5" />
              <rect x="18" y="36" width="5" height="5" fill="#C29B38" />
              <rect x="28" y="36" width="5" height="5" />
              <rect x="36" y="36" width="5" height="5" />
              <rect x="44" y="36" width="5" height="5" />
              <rect x="62" y="36" width="5" height="5" />
              <rect x="72" y="36" width="5" height="5" fill="#C29B38" />
              <rect x="84" y="36" width="5" height="5" />

              {/* Center Sunouf Official Gold Emblem */}
              <circle cx="50" cy="50" r="13" fill="white" stroke="#C29B38" strokeWidth="1" />
              <image href="/assets/aistudio/1792776933838_1__5a26254c.png" x="38" y="38" width="24" height="24" />

              <rect x="8" y="46" width="5" height="5" fill="#C29B38" />
              <rect x="24" y="46" width="5" height="5" />
              <rect x="74" y="46" width="5" height="5" />
              <rect x="86" y="46" width="5" height="5" fill="#C29B38" />

              <rect x="8" y="56" width="5" height="5" />
              <rect x="18" y="56" width="5" height="5" />
              <rect x="28" y="56" width="5" height="5" fill="#C29B38" />
              <rect x="70" y="56" width="5" height="5" />
              <rect x="80" y="56" width="5" height="5" />

              <rect x="36" y="72" width="5" height="5" fill="#C29B38" />
              <rect x="46" y="72" width="5" height="5" />
              <rect x="58" y="72" width="5" height="5" />
              <rect x="72" y="72" width="5" height="5" fill="#C29B38" />
              <rect x="84" y="72" width="5" height="5" />

              <rect x="36" y="82" width="5" height="5" />
              <rect x="48" y="82" width="5" height="5" fill="#C29B38" />
              <rect x="58" y="82" width="5" height="5" />
              <rect x="76" y="82" width="5" height="5" />
              <rect x="86" y="82" width="5" height="5" fill="#C29B38" />
            </svg>
          </div>

          <div className="mt-4 font-black text-sm text-[#C29B38]">
            طاولة رقم: {tableNumber}
          </div>
          <div className="text-[10px] opacity-70 mt-0.5">
            تجربة رقمية فورية · مدعومة بمنصة صنوف
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handlePrint}
              className="py-2.5 px-3 bg-[#333333] hover:bg-[#222222] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كرت الطاولة</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="py-2.5 px-3 bg-[#F8F3E6] hover:bg-[#eae0cc] text-[#333333] border border-[#C29B38]/30 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'تم نسخ الرابط' : 'نسخ رابط المنيو'}</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2 text-xs text-stone-500 hover:text-stone-800 transition-colors"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
