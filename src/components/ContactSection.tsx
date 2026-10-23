import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, Phone, Building, Clock, MessageCircle, ExternalLink, Sparkles } from 'lucide-react';
import { PricingPlan, BillingCycle } from '../types';

interface ContactSectionProps {
  selectedPlan?: PricingPlan | null;
  selectedCycle?: BillingCycle;
}

interface PlanChoiceOption {
  id: string;
  planId: string;
  planTitle: string;
  cycleKey: BillingCycle;
  cycleTitle: string;
  price: number;
  label: string;
  badge?: string;
}

export const ALL_PLAN_OPTIONS: PlanChoiceOption[] = [
  // 1. باقة تصفح فقط
  {
    id: 'browse-buyout',
    planId: 'browse',
    planTitle: 'باقة تصفح فقط (Browse Only)',
    cycleKey: 'buyout',
    cycleTitle: 'شراء وتملك دائم مدى الحياة',
    price: 1500,
    label: 'باقة تصفح فقط — تملك دائم مدى الحياة (1,500 ر.س دفعة واحدة)',
    badge: 'تملك دائم',
  },
  {
    id: 'browse-yearly',
    planId: 'browse',
    planTitle: 'باقة تصفح فقط (Browse Only)',
    cycleKey: 'yearly',
    cycleTitle: 'اشتراك سنوي',
    price: 2400,
    label: 'باقة تصفح فقط — اشتراك سنوي (2,400 ر.س / سنوياً)',
  },
  {
    id: 'browse-monthly',
    planId: 'browse',
    planTitle: 'باقة تصفح فقط (Browse Only)',
    cycleKey: 'monthly',
    cycleTitle: 'اشتراك شهري',
    price: 200,
    label: 'باقة تصفح فقط — اشتراك شهري (200 ر.س / شهرياً)',
  },
  {
    id: 'browse-weekly',
    planId: 'browse',
    planTitle: 'باقة تصفح فقط (Browse Only)',
    cycleKey: 'weekly',
    cycleTitle: 'اشتراك أسبوعي',
    price: 50,
    label: 'باقة تصفح فقط — اشتراك أسبوعي (50 ر.س / أسبوعياً)',
  },

  // 2. باقة تصفح + طلب
  {
    id: 'order-buyout',
    planId: 'order',
    planTitle: 'باقة تصفح + طلب (Browse & Order)',
    cycleKey: 'buyout',
    cycleTitle: 'شراء وتملك دائم مدى الحياة',
    price: 1900,
    label: 'باقة تصفح + طلب — تملك دائم مدى الحياة (1,900 ر.س دفعة واحدة) ★ الأكثر طلباً',
    badge: 'الأكثر طلباً',
  },
  {
    id: 'order-yearly',
    planId: 'order',
    planTitle: 'باقة تصفح + طلب (Browse & Order)',
    cycleKey: 'yearly',
    cycleTitle: 'اشتراك سنوي',
    price: 4800,
    label: 'باقة تصفح + طلب — اشتراك سنوي (4,800 ر.س / سنوياً)',
  },
  {
    id: 'order-monthly',
    planId: 'order',
    planTitle: 'باقة تصفح + طلب (Browse & Order)',
    cycleKey: 'monthly',
    cycleTitle: 'اشتراك شهري',
    price: 400,
    label: 'باقة تصفح + طلب — اشتراك شهري (400 ر.س / شهرياً)',
  },
  {
    id: 'order-weekly',
    planId: 'order',
    planTitle: 'باقة تصفح + طلب (Browse & Order)',
    cycleKey: 'weekly',
    cycleTitle: 'اشتراك أسبوعي',
    price: 100,
    label: 'باقة تصفح + طلب — اشتراك أسبوعي (100 ر.س / أسبوعياً)',
  },

  // 3. باقة تصفح + طلبات + حجز (الجناح الشامل)
  {
    id: 'full-buyout',
    planId: 'full',
    planTitle: 'باقة تصفح + طلبات + حجز (Full Suite)',
    cycleKey: 'buyout',
    cycleTitle: 'شراء وتملك دائم مدى الحياة',
    price: 2500,
    label: 'باقة الجناح الشامل والحجوزات — تملك دائم مدى الحياة (2,500 ر.س دفعة واحدة) 👑 المتكامل',
    badge: 'الجناح الشامل',
  },
  {
    id: 'full-yearly',
    planId: 'full',
    planTitle: 'باقة تصفح + طلبات + حجز (Full Suite)',
    cycleKey: 'yearly',
    cycleTitle: 'اشتراك سنوي',
    price: 7200,
    label: 'باقة الجناح الشامل والحجوزات — اشتراك سنوي (7,200 ر.س / سنوياً)',
  },
  {
    id: 'full-monthly',
    planId: 'full',
    planTitle: 'باقة تصفح + طلبات + حجز (Full Suite)',
    cycleKey: 'monthly',
    cycleTitle: 'اشتراك شهري',
    price: 600,
    label: 'باقة الجناح الشامل والحجوزات — اشتراك شهري (600 ر.س / شهرياً)',
  },
  {
    id: 'full-weekly',
    planId: 'full',
    planTitle: 'باقة تصفح + طلبات + حجز (Full Suite)',
    cycleKey: 'weekly',
    cycleTitle: 'اشتراك أسبوعي',
    price: 150,
    label: 'باقة الجناح الشامل والحجوزات — اشتراك أسبوعي (150 ر.س / أسبوعياً)',
  },
];

export const ContactSection: React.FC<ContactSectionProps> = ({
  selectedPlan,
  selectedCycle = 'buyout',
}) => {
  const CONTACT_PHONE_DISPLAY = '0541821068';
  const CONTACT_WHATSAPP_NUMBER = '966541821068';

  const [restaurantName, setRestaurantName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('الرياض');
  const [selectedOptionId, setSelectedOptionId] = useState<string>('order-buyout');
  const [branchesCount, setBranchesCount] = useState('فرع واحد');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [lastWhatsAppUrl, setLastWhatsAppUrl] = useState<string>('');

  // Update selected plan option if passed from external pricing card click
  useEffect(() => {
    if (selectedPlan) {
      const match = ALL_PLAN_OPTIONS.find(
        (o) => o.planId === selectedPlan.mode && o.cycleKey === selectedCycle
      );
      if (match) {
        setSelectedOptionId(match.id);
      }
    }
  }, [selectedPlan, selectedCycle]);

  const currentSelectedOption =
    ALL_PLAN_OPTIONS.find((o) => o.id === selectedOptionId) || ALL_PLAN_OPTIONS[4];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Construct detailed formatted WhatsApp message
    const lines = [
      `*طلب انضمام واشتراك جديد - منصة صُنوف (SUNOUF)*`,
      `-------------------------------------------`,
      `*اسم المطعم / المقهى:* ${restaurantName || 'غير محدد'}`,
      `*اسم المسؤول / المدير:* ${managerName || 'غير محدد'}`,
      `*رقم جوال للتواصل:* ${phone || 'غير محدد'}`,
      `*المدينة:* ${city}`,
      `*عدد الفروع:* ${branchesCount}`,
      `-------------------------------------------`,
      `*تفاصيل الباقة المطلوبة:*`,
      `• *الباقة:* ${currentSelectedOption.planTitle}`,
      `• *نوع الاشتراك:* ${currentSelectedOption.cycleTitle}`,
      `• *السعر:* ${currentSelectedOption.price.toLocaleString()} ر.س`,
      `-------------------------------------------`,
      notes ? `*ملاحظات ومتطلبات خاصة:*%0A${notes}%0A-------------------------------------------` : '',
      `مرسل مباشرة عبر الموقع الرسمي لمنصة صُنوف.`,
    ].filter(Boolean);

    const fullMessage = lines.join('\n');
    const waUrl = `https://wa.me/${CONTACT_WHATSAPP_NUMBER}?text=${encodeURIComponent(fullMessage)}`;

    setLastWhatsAppUrl(waUrl);
    setSubmitted(true);

    // Open WhatsApp directly in new window/tab
    try {
      window.open(waUrl, '_blank');
    } catch {
      // Fallback handled by the UI
    }
  };

  return (
    <section id="contact" className="py-16 lg:py-24 bg-white border-b border-[#C29B38]/15">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Description & Direct Info */}
          <div className="lg:col-span-5 space-y-6">
            <div className="text-xs font-bold tracking-widest text-[#C29B38] uppercase">
              انضم إلى نخبة مطاعم ومقاهي المملكة
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#333333] leading-snug">
              ابدأ تشغيل منصة "صنوف" في مطعمك خلال 24 ساعة
            </h2>
            <p className="text-sm text-[#333333]/80 leading-relaxed">
              فريقنا المتخصص يتولى إدخال قائمتك وتنسيق صورها بألوان هويتك الرسمية، وتوليد رموز الـ QR لجميع طاولاتك، مع إمكانية التملك الدائم مدى الحياة.
            </p>

            <div className="pt-6 border-t border-[#C29B38]/15 space-y-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F8F3E6] border border-[#C29B38]/30 flex items-center justify-center text-[#C29B38] shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-stone-500 font-medium">الاستشارات والطلب المباشر (اتصال وواتساب):</div>
                  <a
                    href={`https://wa.me/${CONTACT_WHATSAPP_NUMBER}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-black text-base text-[#333333] hover:text-[#C29B38] transition-colors dir-ltr text-right inline-block"
                  >
                    {CONTACT_PHONE_DISPLAY}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F8F3E6] border border-[#C29B38]/30 flex items-center justify-center text-[#C29B38] shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-stone-500 font-medium">سرعة التجهيز والتشغيل:</div>
                  <div className="font-bold text-sm text-[#333333]">
                    خلال نفس اليوم وتدريب مجاني للفريق
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F8F3E6] border border-[#C29B38]/30 flex items-center justify-center text-[#C29B38] shrink-0">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-stone-500 font-medium">نطاق التغطية:</div>
                  <div className="font-bold text-sm text-[#333333]">
                    جميع مدن ومناطق المملكة والخليج العربي
                  </div>
                </div>
              </div>
            </div>

            {/* Live WhatsApp Direct Card */}
            <div className="p-4 bg-[#F8F3E6] rounded-2xl border border-[#C29B38]/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#333333]">
                    تواصل فوري عبر الواتساب
                  </div>
                  <div className="text-[11px] text-stone-500 dir-ltr text-right">
                    {CONTACT_PHONE_DISPLAY}
                  </div>
                </div>
              </div>
              <a
                href={`https://wa.me/${CONTACT_WHATSAPP_NUMBER}?text=${encodeURIComponent('السلام عليكم، أود الاستفسار عن باقات منصة صنوف (SUNOUF) للمطاعم.')}`}
                target="_blank"
                rel="noreferrer"
                className="py-1.5 px-3 bg-[#25D366] hover:bg-[#20be5a] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-xs"
              >
                <span>محادثة فورية</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Right Lead Capture Form */}
          <div className="lg:col-span-7 bg-[#F9F8F6] rounded-3xl p-7 sm:p-9 border border-[#C29B38]/30 shadow-md">
            {submitted ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#F8F3E6] text-[#25D366] border-2 border-[#25D366] flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h3 className="text-xl font-black text-[#333333]">
                  تم تجهيز طلبكم وإضافته للواتساب!
                </h3>
                <p className="text-xs sm:text-sm text-[#333333]/80 max-w-md mx-auto leading-relaxed">
                  تم فتح محادثة WhatsApp مباشرة مع فريق صنوف على الرقم <span className="font-bold text-[#C29B38] dir-ltr inline-block">{CONTACT_PHONE_DISPLAY}</span> لإتمام تفعيل مطعم <span className="font-bold text-[#333333]">{restaurantName || 'مطعمكم'}</span>.
                </p>

                {/* Summary of Selected Package */}
                <div className="p-4 bg-white rounded-2xl border border-[#C29B38]/30 max-w-md mx-auto text-right text-xs space-y-2">
                  <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                    <span className="text-stone-500">الباقة المختارة:</span>
                    <span className="font-black text-[#C29B38]">{currentSelectedOption.planTitle}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                    <span className="text-stone-500">نوع الخطة:</span>
                    <span className="font-bold text-[#333333]">{currentSelectedOption.cycleTitle}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500">السعر الإجمالي:</span>
                    <span className="text-sm font-black text-[#C29B38] tabular-nums">
                      {currentSelectedOption.price.toLocaleString()} ر.س
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href={lastWhatsAppUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto px-6 py-3 bg-[#25D366] hover:bg-[#20be5a] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>إعادة فتح محادثة الواتساب</span>
                  </a>

                  <button
                    onClick={() => setSubmitted(false)}
                    className="w-full sm:w-auto px-5 py-3 bg-[#F8F3E6] hover:bg-[#eae0cc] text-[#333333] text-xs font-bold rounded-xl border border-[#C29B38]/30 transition-colors"
                  >
                    تعديل البيانات أو طلب باقة أخرى
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#333333] mb-1.5">
                      اسم المطعم أو المقهى: *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: روشان كافيه ومطعم نجد"
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                      className="w-full p-3 bg-white border border-[#C29B38]/30 rounded-xl text-xs text-[#333333] focus:outline-none focus:border-[#C29B38]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#333333] mb-1.5">
                      اسم المسؤول / المدير: *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="الاسم الكريم"
                      value={managerName}
                      onChange={(e) => setManagerName(e.target.value)}
                      className="w-full p-3 bg-white border border-[#C29B38]/30 rounded-xl text-xs text-[#333333] focus:outline-none focus:border-[#C29B38]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#333333] mb-1.5">
                      رقم الجوال (واتساب للتواصل): *
                    </label>
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      placeholder="05xxxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-3 bg-white border border-[#C29B38]/30 rounded-xl text-xs text-[#333333] text-right focus:outline-none focus:border-[#C29B38]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#333333] mb-1.5">
                      المدينة:
                    </label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full p-3 bg-white border border-[#C29B38]/30 rounded-xl text-xs text-[#333333] focus:outline-none focus:border-[#C29B38]"
                    >
                      <option value="الرياض">الرياض</option>
                      <option value="جدة">جدة</option>
                      <option value="الدمام والخبر">الدمام والخبر</option>
                      <option value="مكة المكرمة">مكة المكرمة</option>
                      <option value="المدينة المنورة">المدينة المنورة</option>
                      <option value="القصيم">القصيم</option>
                      <option value="أبها وخميس مشيط">أبها وخميس مشيط</option>
                      <option value="أخرى">مدينة أخرى في المملكة والخليج</option>
                    </select>
                  </div>
                </div>

                {/* Comprehensive Package Selector Showing ALL Packages with Full Details */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#333333]">
                      الباقة المطلوبة (جميع الباقات والخيارات متاحة بالكامل): *
                    </label>
                    <span className="text-[10px] text-[#A37E28] font-bold">
                      {currentSelectedOption.price.toLocaleString()} ر.س
                    </span>
                  </div>

                  <select
                    value={selectedOptionId}
                    onChange={(e) => setSelectedOptionId(e.target.value)}
                    className="w-full p-3 bg-white border-2 border-[#C29B38] rounded-xl text-xs text-[#333333] font-bold focus:outline-none shadow-xs"
                  >
                    {/* المجموعة الأولى: تصفح فقط */}
                    <optgroup label="⭐️ الباقة الأولى: تصفح فقط (Browse Only)">
                      <option value="browse-buyout">
                        1. تصفح فقط — تملك دائم مدى الحياة (1,500 ر.س دفعة واحدة)
                      </option>
                      <option value="browse-yearly">
                        1. تصفح فقط — اشتراك سنوي (2,400 ر.س / سنوياً)
                      </option>
                      <option value="browse-monthly">
                        1. تصفح فقط — اشتراك شهري (200 ر.س / شهرياً)
                      </option>
                      <option value="browse-weekly">
                        1. تصفح فقط — اشتراك أسبوعي (50 ر.س / أسبوعياً)
                      </option>
                    </optgroup>

                    {/* المجموعة الثانية: تصفح + طلب */}
                    <optgroup label="🔥 الباقة الثانية: تصفح + طلب (Browse & Order) — الأكثر طلباً">
                      <option value="order-buyout">
                        2. تصفح + طلب — تملك دائم مدى الحياة (1,900 ر.س دفعة واحدة) [الأكثر طلباً]
                      </option>
                      <option value="order-yearly">
                        2. تصفح + طلب — اشتراك سنوي (4,800 ر.س / سنوياً)
                      </option>
                      <option value="order-monthly">
                        2. تصفح + طلب — اشتراك شهري (400 ر.س / شهرياً)
                      </option>
                      <option value="order-weekly">
                        2. تصفح + طلب — اشتراك أسبوعي (100 ر.س / أسبوعياً)
                      </option>
                    </optgroup>

                    {/* المجموعة الثالثة: تصفح + طلبات + حجز */}
                    <optgroup label="👑 الباقة الثالثة: الجناح الشامل والحجوزات (Full Suite)">
                      <option value="full-buyout">
                        3. الجناح الشامل والحجوزات — تملك دائم مدى الحياة (2,500 ر.س دفعة واحدة) [شامل]
                      </option>
                      <option value="full-yearly">
                        3. الجناح الشامل والحجوزات — اشتراك سنوي (7,200 ر.س / سنوياً)
                      </option>
                      <option value="full-monthly">
                        3. الجناح الشامل والحجوزات — اشتراك شهري (600 ر.س / شهرياً)
                      </option>
                      <option value="full-weekly">
                        3. الجناح الشامل والحجوزات — اشتراك أسبوعي (150 ر.س / أسبوعياً)
                      </option>
                    </optgroup>
                  </select>

                  {/* Selected Plan Details Card Indicator */}
                  <div className="mt-2 p-2.5 bg-[#F8F3E6] rounded-xl border border-[#C29B38]/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#C29B38]" />
                      <span className="font-bold text-[#333333]">
                        {currentSelectedOption.planTitle}
                      </span>
                      <span className="text-stone-500">({currentSelectedOption.cycleTitle})</span>
                    </div>
                    <span className="font-black text-[#C29B38] tabular-nums">
                      {currentSelectedOption.price.toLocaleString()} ر.س
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#333333] mb-1.5">
                      عدد الفروع:
                    </label>
                    <select
                      value={branchesCount}
                      onChange={(e) => setBranchesCount(e.target.value)}
                      className="w-full p-3 bg-white border border-[#C29B38]/30 rounded-xl text-xs text-[#333333] focus:outline-none focus:border-[#C29B38]"
                    >
                      <option value="فرع واحد">فرع واحد (الافتراضي)</option>
                      <option value="فرعين إلى 3 فروع">2 إلى 3 فروع</option>
                      <option value="4 فروع فما فوق">4 فروع فما فوق (خصم سلاسل)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#333333] mb-1.5">
                      الرقم المعتمد لإرسال الطلب:
                    </label>
                    <div className="w-full p-3 bg-stone-100 border border-stone-200 rounded-xl text-xs font-black text-[#333333] dir-ltr text-right">
                      {CONTACT_PHONE_DISPLAY}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#333333] mb-1.5">
                    ملاحظات أو متطلبات خاصة:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="هل تود ربط طابعات كاشير، أو تحتاج مساعدة في تصوير وإدخال أطباقك؟"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3 bg-white border border-[#C29B38]/30 rounded-xl text-xs text-[#333333] focus:outline-none focus:border-[#C29B38]"
                  ></textarea>
                </div>

                {/* Submit to WhatsApp Button */}
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 bg-[#C29B38] hover:bg-[#A37E28] active:scale-[0.99] text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5 text-white" />
                  <span>إرسال الطلب والتواصل مع فريق صنوف (عبر WhatsApp)</span>
                  <Send className="w-4 h-4 text-white/80" />
                </button>

                <div className="text-center text-[11px] text-stone-500 pt-1">
                  سيتم فتح محادثة WhatsApp مباشرة على الرقم <span className="font-bold text-[#C29B38] dir-ltr inline-block">{CONTACT_PHONE_DISPLAY}</span> مرفقاً بها تفاصيل طلبك بالكامل.
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
