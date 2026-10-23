import React, { useState, useMemo } from 'react';
import {
  Search,
  ShoppingCart,
  Calendar,
  Sparkles,
  QrCode,
  CheckCircle2,
  Share2,
  Clock,
  Users,
  MapPin,
  Flame,
  AlertCircle,
  Plus,
  Minus,
  X,
  Phone,
  MessageCircle,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { CATEGORIES, MENU_ITEMS } from '../data/mockData';
import { ServiceMode, MenuItem, CartItem, ReservationData } from '../types';

interface PhoneSimulatorProps {
  currentMode: ServiceMode;
  onChangeMode: (mode: ServiceMode) => void;
  onOpenQrModal: (tableNo: string) => void;
}

export const PhoneSimulator: React.FC<PhoneSimulatorProps> = ({
  currentMode,
  onChangeMode,
  onOpenQrModal,
}) => {
  // Mobile UI States
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string>('04');
  const [cart, setCart] = useState<CartItem[]>([
    { item: MENU_ITEMS[0], quantity: 1 },
    { item: MENU_ITEMS[2], quantity: 2 },
  ]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isReservationOpen, setIsReservationOpen] = useState<boolean>(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState<MenuItem | null>(null);
  const [orderSentSuccess, setOrderSentSuccess] = useState<{ id: string; total: number; via: 'whatsapp' | 'api' } | null>(null);
  const [reservationSuccess, setReservationSuccess] = useState<{ id: string; date: string; time: string; guests: number } | null>(null);

  // Reservation form internal state
  const [reservationForm, setReservationForm] = useState<ReservationData>({
    guestName: 'محمد العتيبي',
    phone: '0501234567',
    date: '2026-10-25',
    time: '20:30',
    guestsCount: 4,
    occasion: 'عشاء فاخر',
    seatingArea: 'indoor',
    notes: 'طاولة بجانب النافذة إن أمكن',
  });

  // Filtered menu
  const filteredItems = useMemo(() => {
    return MENU_ITEMS.filter((item) => {
      const matchCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [activeCategory, searchQuery]);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === itemId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((c) => c.item.id !== itemId);
      }
      return prev.map((c) =>
        c.item.id === itemId ? { ...c, quantity: c.quantity - 1 } : c
      );
    });
  };

  const getItemQuantity = (itemId: string) => {
    const found = cart.find((c) => c.item.id === itemId);
    return found ? found.quantity : 0;
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, curr) => acc + curr.item.price * curr.quantity, 0);
  }, [cart]);

  const cartItemsCount = useMemo(() => {
    return cart.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [cart]);

  // Handle WhatsApp Order Generation
  const handleSendWhatsAppOrder = () => {
    const itemsText = cart
      .map(
        (c) =>
          `• ${c.item.name} (${c.quantity}x) = ${(c.item.price * c.quantity).toFixed(0)} ر.س`
      )
      .join('%0A');

    const totalText = `المجموع الإجمالي: ${cartTotal} ر.س`;
    const tableText = `رقم الطاولة: ${selectedTable}`;
    const timestamp = new Date().toLocaleTimeString('ar-SA');
    const orderRef = `ORD-${Math.floor(100 + Math.random() * 900)}`;

    const message = `*طلب جديد عبر منصة صنوف*%0A---------------------------%0A*رقم الطلب:* ${orderRef}%0A*${tableText}*%0A*الوقت:* ${timestamp}%0A---------------------------%0A*الأصناف المطلوبة:*%0A${itemsText}%0A---------------------------%0A*${totalText}*%0A%0Aيرجى تأكيد استلام الطلب وتجهيزه. شكراً لكم!`;

    // Demo notification
    setOrderSentSuccess({
      id: orderRef,
      total: cartTotal,
      via: 'whatsapp',
    });
    setIsCartOpen(false);

    try {
      window.open(`https://wa.me/966541821068?text=${message}`, '_blank');
    } catch {
      // Ignore if blocked
    }
  };

  // Handle Server API Order
  const handleSendApiOrder = () => {
    const orderRef = `ORD-${Math.floor(100 + Math.random() * 900)}`;
    setOrderSentSuccess({
      id: orderRef,
      total: cartTotal,
      via: 'api',
    });
    setIsCartOpen(false);
  };

  // Handle Reservation Submission
  const handleConfirmReservation = (e: React.FormEvent) => {
    e.preventDefault();
    const ref = `RSV-${Math.floor(1000 + Math.random() * 9000)}`;
    setReservationSuccess({
      id: ref,
      date: reservationForm.date,
      time: reservationForm.time,
      guests: reservationForm.guestsCount,
    });
    setIsReservationOpen(false);
  };

  return (
    <section id="simulator" className="py-16 lg:py-24 bg-[#F9F8F6] border-b border-[#C29B38]/15">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="text-xs font-bold tracking-widest text-[#C29B38] uppercase mb-2">
            محاكي حي وتجربة تفاعلية مباشرة
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#333333] mb-4">
            جرّب خدمات "صنوف" الثلاث كما يراها ضيفك على هاتفه
          </h2>
          <p className="text-sm lg:text-base text-[#333333]/80 leading-relaxed">
            بدّل بين مستويات الخدمة الثلاثة أدناه لمشاهدة التحول الفوري في واجهة الجوال: من التصفح السريع برمز QR، إلى الطلب عبر WhatsApp والسيرفر، وحتى الحجز المسبق للطاولات والمناسبات.
          </p>
        </div>

        {/* Outer Mode Switcher Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10 max-w-3xl mx-auto">
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 p-1.5 bg-[#F8F3E6] border border-[#C29B38]/30 rounded-2xl shadow-inner gap-1">
            <button
              onClick={() => onChangeMode('browse')}
              className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                currentMode === 'browse'
                  ? 'bg-[#C29B38] text-white shadow-md'
                  : 'text-[#333333] hover:text-[#C29B38] hover:bg-white/50'
              }`}
            >
              <span>1. تصفح فقط</span>
              <span className="text-[10px] opacity-80">(QR & صور)</span>
            </button>

            <button
              onClick={() => onChangeMode('order')}
              className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                currentMode === 'order'
                  ? 'bg-[#C29B38] text-white shadow-md'
                  : 'text-[#333333] hover:text-[#C29B38] hover:bg-white/50'
              }`}
            >
              <span>2. تصفح + طلب</span>
              <span className="text-[10px] opacity-80">(واتساب & سلة)</span>
            </button>

            <button
              onClick={() => onChangeMode('full')}
              className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                currentMode === 'full'
                  ? 'bg-[#C29B38] text-white shadow-md'
                  : 'text-[#333333] hover:text-[#C29B38] hover:bg-white/50'
              }`}
            >
              <span>3. تصفح + طلب + حجز</span>
              <span className="text-[10px] opacity-80">(شامل الحجوزات)</span>
            </button>
          </div>
        </div>

        {/* Simulator Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Context & Controls (lg:col-span-4) */}
          <div className="lg:col-span-4 order-2 lg:order-1 space-y-5">
            {/* Active Service Status Card */}
            <div className="p-6 bg-white rounded-2xl border border-[#C29B38]/25 shadow-sm">
              <div className="text-xs font-bold text-[#A37E28] uppercase tracking-wider mb-1">
                الوضع النشط حالياً في المحاكي
              </div>
              <h3 className="text-xl font-black text-[#333333] mb-3">
                {currentMode === 'browse' && 'الخدمة الأولى: تصفح فقط'}
                {currentMode === 'order' && 'الخدمة الثانية: تصفح + طلب فوري'}
                {currentMode === 'full' && 'الخدمة الثالثة: الجناح الشامل والحجوزات'}
              </h3>
              <p className="text-xs text-[#333333]/80 leading-relaxed mb-4">
                {currentMode === 'browse' &&
                  'يقدم لضيوفك تجربة تصفح بصرية سلسة للأطباق والحلويات، مع السعرات الحرارية، ومسببات الحساسية، وكود QR مخصص لكل طاولة بدون الحاجة لتحميل أي تطبيق.'}
                {currentMode === 'order' &&
                  'يسمح لرواد المطعم باختيار وجباتهم، تحديد رقم الطاولة، وتأكيد الطلب مباشرة إلى رقم WhatsApp الخاص بالكاشير أو استقباله في شاشة المطبخ.'}
                {currentMode === 'full' &&
                  'المجموعة الكاملة للضيافة الفاخرة: منيو رقمي ذكي، طلبات مباشرة، ونظام متطور لحجز الطاولات والمناسبات الخاصة وحفلات كبار الشخصيات.'}
              </p>

              {/* Table Selector Control */}
              <div className="pt-4 border-t border-[#C29B38]/15">
                <label className="block text-xs font-bold text-[#333333] mb-2">
                  رقم الطاولة الحالية في المقهى/المطعم:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['01', '04', '09', 'VIP'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSelectedTable(tab)}
                      className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        selectedTable === tab
                          ? 'bg-[#C29B38] text-white border-[#C29B38]'
                          : 'bg-[#F8F3E6] text-[#333333] border-[#C29B38]/20 hover:border-[#C29B38]'
                      }`}
                    >
                      طاولة {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons on desktop */}
              <div className="mt-5 pt-4 border-t border-[#C29B38]/15 flex flex-col gap-2.5">
                <button
                  onClick={() => onOpenQrModal(selectedTable)}
                  className="w-full py-2.5 px-3 text-xs font-bold text-[#A37E28] hover:text-[#C29B38] bg-[#F8F3E6] border border-[#C29B38]/30 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>توليد ومعاينة كود QR للطاولة ({selectedTable})</span>
                </button>

                {currentMode !== 'browse' && (
                  <button
                    onClick={() => setIsCartOpen(true)}
                    className="w-full py-2.5 px-3 text-xs font-bold text-white bg-[#333333] hover:bg-[#222222] rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4 text-[#C29B38]" />
                    <span>فتح سلة الطلب التجريبية ({cartItemsCount} أصناف)</span>
                  </button>
                )}

                {currentMode === 'full' && (
                  <button
                    onClick={() => setIsReservationOpen(true)}
                    className="w-full py-2.5 px-3 text-xs font-bold text-white bg-[#C29B38] hover:bg-[#A37E28] rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>اختبار نموذج حجز طاولة أو مناسبة</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Feature Checklist */}
            <div className="p-5 bg-[#F8F3E6]/70 rounded-2xl border border-[#C29B38]/25 text-xs text-[#333333]/80 space-y-2.5">
              <div className="font-bold text-[#333333] text-sm mb-1">
                لماذا تفضل المطاعم منصة صنوف؟
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#C29B38] shrink-0" />
                <span>ألوان وهوية الشعار الرسمية الفاخرة تعزز هيبة علامتك</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#C29B38] shrink-0" />
                <span>لا عمولات مقتطعة على المبيعات الشهرية نهائياً</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#C29B38] shrink-0" />
                <span>إمكانية الشراء والتملك الدائم مدى الحياة بـ 1500 ر.س فقط</span>
              </div>
            </div>
          </div>

          {/* Central Phone Mockup (lg:col-span-8 flex justify-center) */}
          <div className="lg:col-span-8 order-1 lg:order-2 flex flex-col items-center">
            {/* Smartphone Outer Shell */}
            <div className="relative w-full max-w-[390px] h-[780px] bg-[#1A1A1A] rounded-[48px] p-3 shadow-[0_25px_60px_-15px_rgba(194,155,56,0.3)] border-4 border-[#C29B38]/40 ring-1 ring-black">
              {/* Dynamic Island / Notch */}
              <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-30 flex items-center justify-end px-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#333333] mr-1"></div>
              </div>

              {/* Phone Inner Screen Screen */}
              <div className="w-full h-full bg-[#F9F8F6] rounded-[40px] overflow-hidden flex flex-col relative select-none">
                {/* Mobile Status Bar */}
                <div className="pt-3 px-6 pb-2 flex items-center justify-between text-[11px] font-bold text-[#333333] z-20 bg-[#F9F8F6]">
                  <span>20:30</span>
                  <div className="flex items-center gap-1.5 text-stone-600">
                    <span className="text-[10px]">5G</span>
                    <span className="w-4 h-2 border border-stone-600 rounded-sm inline-block relative">
                      <span className="absolute inset-0.5 bg-[#C29B38] rounded-xs"></span>
                    </span>
                  </div>
                </div>

                {/* Mobile Restaurant Header */}
                <div className="px-4 py-2.5 bg-white border-b border-[#C29B38]/20 flex items-center justify-between z-10 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <img
                      src="/assets/aistudio/1792776933838_1__5a26254c.png"
                      alt="شعار صنوف"
                      className="w-8 h-8 rounded-full object-contain border border-[#C29B38]/30 shadow-2xs bg-white"
                    />
                    <div>
                      <div className="text-xs font-black text-[#333333] leading-tight">
                        مطعم نجد الفاخر
                      </div>
                      <div className="text-[10px] text-[#A37E28] font-semibold">
                        صنوف · طاولة ({selectedTable})
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {currentMode !== 'browse' && (
                      <button
                        onClick={() => setIsCartOpen(true)}
                        className="relative p-2 rounded-lg bg-[#F8F3E6] text-[#333333] hover:text-[#C29B38] transition-colors"
                        title="عرض السلة"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        {cartItemsCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#C29B38] text-white text-[9px] font-black rounded-full flex items-center justify-center">
                            {cartItemsCount}
                          </span>
                        )}
                      </button>
                    )}

                    {currentMode === 'full' && (
                      <button
                        onClick={() => setIsReservationOpen(true)}
                        className="p-2 rounded-lg bg-[#C29B38] text-white text-xs font-bold flex items-center gap-1"
                        title="حجز طاولة"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-[10px]">حجز</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Search & Categories Bar */}
                <div className="p-3 bg-[#F9F8F6] space-y-2 border-b border-[#C29B38]/15">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="ابحث عن طبق، حلوى، أو مشروب..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-3 pr-8 py-1.5 text-xs bg-white border border-[#C29B38]/20 rounded-xl text-[#333333] placeholder-stone-400 focus:outline-none focus:border-[#C29B38]"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Horizontal Category Strip */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                          activeCategory === cat.id
                            ? 'bg-[#C29B38] text-white shadow-xs'
                            : 'bg-white text-[#333333] border border-stone-200 hover:border-[#C29B38]/40'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile Scrollable Menu Feed */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 phone-screen-scroll pb-20">
                  {/* Mode Banner inside simulator */}
                  <div className="p-2.5 bg-[#F8F3E6] border border-[#C29B38]/30 rounded-xl text-center">
                    <div className="text-[11px] font-bold text-[#A37E28]">
                      {currentMode === 'browse' && ' وضع التصفح السريع · رمز QR طاولة ' + selectedTable}
                      {currentMode === 'order' && ' وضع الطلب المباشر · أضف وجباتك للسلة وارسلها لواتساب'}
                      {currentMode === 'full' && ' الجناح المتكامل · طلبات فورية + حجز طاولات ومناسبات'}
                    </div>
                  </div>

                  {filteredItems.length === 0 ? (
                    <div className="py-10 text-center text-stone-400 text-xs">
                      لا توجد أطباق مطابقة للبحث
                    </div>
                  ) : (
                    filteredItems.map((item) => {
                      const qty = getItemQuantity(item.id);
                      return (
                        <div
                          key={item.id}
                          className="bg-white rounded-xl border border-[#C29B38]/20 overflow-hidden shadow-xs hover:border-[#C29B38]/40 transition-all"
                        >
                          <div className="flex gap-3 p-2.5">
                            {/* Dish Thumbnail */}
                            <div
                              onClick={() => setSelectedItemDetail(item)}
                              className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden shrink-0 bg-stone-100 cursor-pointer"
                            >
                              <img
                                src={item.image}
                                alt={item.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                              {item.isChefSpecial && (
                                <span className="absolute top-1 right-1 px-1 py-0.5 bg-[#C29B38] text-white text-[8px] font-bold rounded">
                                  مميز
                                </span>
                              )}
                            </div>

                            {/* Dish Info */}
                            <div className="flex-1 flex flex-col justify-between">
                              <div onClick={() => setSelectedItemDetail(item)} className="cursor-pointer">
                                <h4 className="text-xs font-bold text-[#333333] leading-snug">
                                  {item.name}
                                </h4>
                                <p className="text-[10px] text-stone-500 line-clamp-2 mt-0.5 leading-normal">
                                  {item.description}
                                </p>
                              </div>

                              <div className="flex items-center justify-between mt-2 pt-1 border-t border-stone-100">
                                <div className="text-xs font-black text-[#C29B38] tabular-nums">
                                  {item.price} <span className="text-[10px] font-normal text-stone-500">ر.س</span>
                                </div>

                                {/* Controls according to mode */}
                                {currentMode === 'browse' ? (
                                  <button
                                    onClick={() => setSelectedItemDetail(item)}
                                    className="text-[10px] text-[#A37E28] font-bold hover:underline"
                                  >
                                    التفاصيل
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    {qty > 0 && (
                                      <>
                                        <button
                                          onClick={() => removeFromCart(item.id)}
                                          className="w-6 h-6 rounded-md bg-[#F8F3E6] text-[#333333] flex items-center justify-center hover:bg-[#e8dec7] text-xs font-bold"
                                        >
                                          <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="text-xs font-bold text-[#333333] tabular-nums px-1">
                                          {qty}
                                        </span>
                                      </>
                                    )}
                                    <button
                                      onClick={() => addToCart(item)}
                                      className="px-2.5 py-1 rounded-md bg-[#C29B38] hover:bg-[#A37E28] text-white text-[11px] font-bold flex items-center gap-1 shadow-xs"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>{qty > 0 ? '' : 'أضف'}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Floating Bottom Bar in Mobile Simulator */}
                {currentMode !== 'browse' && cartItemsCount > 0 && (
                  <div className="absolute bottom-3 left-3 right-3 z-30">
                    <button
                      onClick={() => setIsCartOpen(true)}
                      className="w-full py-2.5 px-4 bg-[#333333] text-white rounded-2xl shadow-xl flex items-center justify-between border border-[#C29B38]/40 hover:bg-[#222222] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#C29B38] text-white text-[10px] font-bold flex items-center justify-center">
                          {cartItemsCount}
                        </span>
                        <span className="text-xs font-bold">عرض السلة وتأكيد الطلب</span>
                      </div>
                      <span className="text-xs font-black text-[#D8B458] tabular-nums">
                        {cartTotal} ر.س
                      </span>
                    </button>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* Cart Drawer Overlay inside Mobile Simulator */}
                {/* ------------------------------------------------------------- */}
                {isCartOpen && (
                  <div className="absolute inset-0 bg-black/60 z-40 flex flex-col justify-end backdrop-blur-xs">
                    <div className="bg-white rounded-t-3xl max-h-[85%] flex flex-col p-4 shadow-2xl border-t-2 border-[#C29B38]">
                      {/* Drawer Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="w-4 h-4 text-[#C29B38]" />
                          <h4 className="text-sm font-bold text-[#333333]">
                            سلة الطلب · طاولة {selectedTable}
                          </h4>
                        </div>
                        <button
                          onClick={() => setIsCartOpen(false)}
                          className="p-1 rounded-full text-stone-400 hover:text-stone-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Items in Cart */}
                      <div className="flex-1 overflow-y-auto py-3 space-y-2.5 max-h-56">
                        {cart.length === 0 ? (
                          <div className="text-center py-6 text-xs text-stone-400">
                            السلة فارغة حالياً
                          </div>
                        ) : (
                          cart.map((c) => (
                            <div
                              key={c.item.id}
                              className="flex items-center justify-between text-xs py-1.5 border-b border-stone-100"
                            >
                              <div className="flex-1 pr-1">
                                <div className="font-bold text-[#333333]">
                                  {c.item.name}
                                </div>
                                <div className="text-[10px] text-stone-500">
                                  {c.item.price} ر.س للواحد
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 bg-[#F8F3E6] rounded-md p-0.5">
                                  <button
                                    onClick={() => removeFromCart(c.item.id)}
                                    className="w-5 h-5 flex items-center justify-center text-xs font-bold text-[#333333] hover:text-[#C29B38]"
                                  >
                                    -
                                  </button>
                                  <span className="text-xs font-bold tabular-nums px-1">
                                    {c.quantity}
                                  </span>
                                  <button
                                    onClick={() => addToCart(c.item)}
                                    className="w-5 h-5 flex items-center justify-center text-xs font-bold text-[#333333] hover:text-[#C29B38]"
                                  >
                                    +
                                  </button>
                                </div>

                                <div className="font-black text-[#C29B38] tabular-nums text-xs min-w-[50px] text-left">
                                  {c.item.price * c.quantity} ر.س
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Cart Total & Checkout Options */}
                      <div className="pt-3 border-t border-stone-200 space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-[#333333]">
                          <span>المجموع الكلي:</span>
                          <span className="text-sm font-black text-[#C29B38] tabular-nums">
                            {cartTotal} ر.س
                          </span>
                        </div>

                        {/* WhatsApp API Checkout Button */}
                        <button
                          onClick={handleSendWhatsAppOrder}
                          className="w-full py-2.5 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>إرسال الطلب عبر WhatsApp فوراً</span>
                        </button>

                        {/* Server C++ Crow API Order */}
                        <button
                          onClick={handleSendApiOrder}
                          className="w-full py-2 px-3 bg-[#333333] hover:bg-[#222222] text-[#F8F3E6] text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                        >
                          <span>إرسال للمطبخ مباشرة (C++ API)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* Reservation Modal inside Mobile Simulator */}
                {/* ------------------------------------------------------------- */}
                {isReservationOpen && (
                  <div className="absolute inset-0 bg-black/60 z-40 flex flex-col justify-end backdrop-blur-xs">
                    <div className="bg-white rounded-t-3xl max-h-[90%] flex flex-col p-4 shadow-2xl border-t-2 border-[#C29B38] overflow-y-auto">
                      <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#C29B38]" />
                          <h4 className="text-sm font-bold text-[#333333]">
                            حجز طاولة أو مناسبة خاصة
                          </h4>
                        </div>
                        <button
                          onClick={() => setIsReservationOpen(false)}
                          className="p-1 rounded-full text-stone-400 hover:text-stone-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form onSubmit={handleConfirmReservation} className="py-3 space-y-2.5 text-xs">
                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">
                            اسم الضيف الكريم:
                          </label>
                          <input
                            type="text"
                            required
                            value={reservationForm.guestName}
                            onChange={(e) =>
                              setReservationForm({ ...reservationForm, guestName: e.target.value })
                            }
                            className="w-full p-2 bg-[#F9F8F6] border border-stone-300 rounded-lg text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-bold text-stone-700 mb-1">
                              التاريخ:
                            </label>
                            <input
                              type="date"
                              required
                              value={reservationForm.date}
                              onChange={(e) =>
                                setReservationForm({ ...reservationForm, date: e.target.value })
                              }
                              className="w-full p-2 bg-[#F9F8F6] border border-stone-300 rounded-lg text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-stone-700 mb-1">
                              الوقت:
                            </label>
                            <select
                              value={reservationForm.time}
                              onChange={(e) =>
                                setReservationForm({ ...reservationForm, time: e.target.value })
                              }
                              className="w-full p-2 bg-[#F9F8F6] border border-stone-300 rounded-lg text-xs"
                            >
                              <option value="18:30">6:30 م (غروب)</option>
                              <option value="20:30">8:30 م (عشاء أول)</option>
                              <option value="22:00">10:00 م (سهرة)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-bold text-stone-700 mb-1">
                              عدد الأفراد:
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={reservationForm.guestsCount}
                              onChange={(e) =>
                                setReservationForm({
                                  ...reservationForm,
                                  guestsCount: parseInt(e.target.value) || 2,
                                })
                              }
                              className="w-full p-2 bg-[#F9F8F6] border border-stone-300 rounded-lg text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-stone-700 mb-1">
                              منطقة الجلوس:
                            </label>
                            <select
                              value={reservationForm.seatingArea}
                              onChange={(e) =>
                                setReservationForm({
                                  ...reservationForm,
                                  seatingArea: e.target.value as any,
                                })
                              }
                              className="w-full p-2 bg-[#F9F8F6] border border-stone-300 rounded-lg text-xs"
                            >
                              <option value="indoor">الصالة الداخلية</option>
                              <option value="terrace">الشرفة الخارجية</option>
                              <option value="vip">جناح VIP خاص</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">
                            المناسبة:
                          </label>
                          <input
                            type="text"
                            value={reservationForm.occasion}
                            onChange={(e) =>
                              setReservationForm({ ...reservationForm, occasion: e.target.value })
                            }
                            placeholder="ذكرى سنوية، حفل ترقية، عشاء عمل..."
                            className="w-full p-2 bg-[#F9F8F6] border border-stone-300 rounded-lg text-xs"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 mt-2 bg-[#C29B38] hover:bg-[#A37E28] text-white font-bold rounded-xl text-xs transition-colors"
                        >
                          تأكيد الحجز الفوري وإصدار التذكرة
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* Item Details Modal inside Mobile Simulator */}
                {/* ------------------------------------------------------------- */}
                {selectedItemDetail && (
                  <div className="absolute inset-0 bg-black/60 z-40 flex flex-col justify-end backdrop-blur-xs">
                    <div className="bg-white rounded-t-3xl max-h-[85%] flex flex-col p-4 shadow-2xl border-t-2 border-[#C29B38]">
                      <div className="relative h-44 rounded-xl overflow-hidden mb-3">
                        <img
                          src={selectedItemDetail.image}
                          alt={selectedItemDetail.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => setSelectedItemDetail(null)}
                          className="absolute top-2 left-2 w-7 h-7 bg-black/60 rounded-full text-white flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <h4 className="text-sm font-bold text-[#333333]">
                        {selectedItemDetail.name}
                      </h4>
                      <p className="text-[10px] text-[#A37E28] font-semibold mb-2">
                        {selectedItemDetail.nameEn}
                      </p>

                      <p className="text-xs text-stone-600 leading-relaxed mb-3">
                        {selectedItemDetail.description}
                      </p>

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-500 mb-4 pb-2 border-b border-stone-100">
                        {selectedItemDetail.calories && (
                          <span>{selectedItemDetail.calories} سعرة حرارية</span>
                        )}
                        {selectedItemDetail.allergens && selectedItemDetail.allergens.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>الحساسية: {selectedItemDetail.allergens.join('، ')}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="text-sm font-black text-[#C29B38] tabular-nums">
                          {selectedItemDetail.price} ر.س
                        </div>

                        {currentMode !== 'browse' ? (
                          <button
                            onClick={() => {
                              addToCart(selectedItemDetail);
                              setSelectedItemDetail(null);
                            }}
                            className="px-4 py-2 bg-[#C29B38] text-white text-xs font-bold rounded-xl"
                          >
                            إضافة للطلب
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedItemDetail(null)}
                            className="px-4 py-1.5 bg-stone-100 text-stone-700 text-xs font-bold rounded-lg"
                          >
                            إغلاق
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* Order Success Toast/Modal */}
                {/* ------------------------------------------------------------- */}
                {orderSentSuccess && (
                  <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-5 text-center max-w-xs shadow-2xl border-t-4 border-[#C29B38]">
                      <div className="w-12 h-12 rounded-full bg-[#F8F3E6] text-[#C29B38] flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-7 h-7" />
                      </div>
                      <h4 className="text-sm font-bold text-[#333333] mb-1">
                        تم تأكيد الطلب بنجاح!
                      </h4>
                      <p className="text-[11px] text-stone-600 mb-3">
                        {orderSentSuccess.via === 'whatsapp'
                          ? 'تم تجهيز مسودة واتساب بالكامل وربطها برقم كاشير المطعم.'
                          : 'تم إرسال الطلب مباشرة إلى خادم C++ Crow واستلامه في المطبخ.'}
                      </p>
                      <div className="p-2.5 bg-[#F8F3E6] rounded-xl text-xs font-bold text-[#333333] mb-3">
                        رقم الطلب: <span className="text-[#C29B38]">{orderSentSuccess.id}</span>
                        <br />
                        الإجمالي: <span className="text-[#C29B38]">{orderSentSuccess.total} ر.س</span>
                      </div>
                      <button
                        onClick={() => setOrderSentSuccess(null)}
                        className="w-full py-2 bg-[#C29B38] text-white text-xs font-bold rounded-xl"
                      >
                        العودة للمنيو
                      </button>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* Reservation Success Modal */}
                {/* ------------------------------------------------------------- */}
                {reservationSuccess && (
                  <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-5 text-center max-w-xs shadow-2xl border-t-4 border-[#C29B38]">
                      <div className="w-12 h-12 rounded-full bg-[#F8F3E6] text-[#C29B38] flex items-center justify-center mx-auto mb-3">
                        <Sparkles className="w-7 h-7" />
                      </div>
                      <h4 className="text-sm font-bold text-[#333333] mb-1">
                        تم تأكيد حجز الطاولة!
                      </h4>
                      <p className="text-[11px] text-stone-600 mb-3">
                        نتطلع لاستقبالكم في مطعم نجد الفاخر. تم إرسال رسالة تأكيد لرقم جوالك.
                      </p>
                      <div className="p-2.5 bg-[#F8F3E6] rounded-xl text-[11px] font-semibold text-[#333333] space-y-1 mb-3 text-right">
                        <div>رقم الحجز: <span className="font-bold text-[#C29B38]">{reservationSuccess.id}</span></div>
                        <div>التاريخ والوقت: {reservationSuccess.date} م · {reservationSuccess.time}</div>
                        <div>الضيوف: {reservationSuccess.guests} أفراد</div>
                      </div>
                      <button
                        onClick={() => setReservationSuccess(null)}
                        className="w-full py-2 bg-[#C29B38] text-white text-xs font-bold rounded-xl"
                      >
                        تم
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick interactive hints under phone */}
            <div className="mt-4 flex items-center gap-4 text-xs text-[#333333]/70 font-medium">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#C29B38]"></span>
                واجهة متجاوبة بالكامل لجميع شاشات الهواتف
              </span>
              <span>·</span>
              <span>دعم لغة عربية أصيلة RTL</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
