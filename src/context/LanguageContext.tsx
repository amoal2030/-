import React, { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';

export interface Translations {
  [key: string]: {
    ar: string;
    en: string;
  };
}

export const translations = {
  // Brand & Header
  brand_name: {
    ar: 'بروستد مشوار الفرسان',
    en: 'Meshwar Al Forsan Broasted',
  },
  brand_name_en: {
    ar: 'Meshwar Al Forsan Broasted',
    en: 'بروستد مشوار الفرسان',
  },
  tagline: {
    ar: 'اتصل قبل أن تصل',
    en: 'Call Before You Arrive',
  },
  subtagline: {
    ar: 'أشهى بروستد مقرمش، مشويات طازجة على الفحم، وشاورما وفطائر وعصائر طبيعية على أصولها في حي الفرسان بالدمام',
    en: 'Delicious crispy broasted, charcoal-grilled skewers, shawarma, pies, and 100% natural fresh juices in Al Forsan, Dammam',
  },
  station_location_tag: {
    ar: 'محطة بترو هلا - حي الفرسان',
    en: 'Petro Hala Station - Al Forsan',
  },

  // Navbar
  nav_menu: {
    ar: 'المنيو الإلكتروني',
    en: 'Digital Menu',
  },
  nav_broasted: {
    ar: 'البروستد',
    en: 'Broasted',
  },
  nav_grilled: {
    ar: 'المشويات',
    en: 'Grills',
  },
  nav_skewers: {
    ar: 'مشويات بالكيلو',
    en: 'Skewers by KG',
  },
  nav_location: {
    ar: 'موقعنا ومواعيدنا',
    en: 'Location & Hours',
  },
  nav_search_placeholder: {
    ar: 'ابحث بالمنيو...',
    en: 'Search menu...',
  },
  nav_call_prompt: {
    ar: 'اتصل قبل أن تصل:',
    en: 'Call before arriving:',
  },
  theme_light: {
    ar: 'فاتح',
    en: 'Light',
  },
  theme_dark: {
    ar: 'داكن',
    en: 'Dark',
  },
  switch_to_light: {
    ar: 'التبديل إلى الوضع الفاتح',
    en: 'Switch to Light Mode',
  },
  switch_to_dark: {
    ar: 'التبديل إلى الوضع الداكن',
    en: 'Switch to Dark Mode',
  },
  language_toggle_label: {
    ar: 'English',
    en: 'العربية',
  },
  language_name: {
    ar: 'عربي',
    en: 'EN',
  },
  site_appearance: {
    ar: 'مظهر الموقع:',
    en: 'Appearance:',
  },
  site_language: {
    ar: 'لغة الموقع:',
    en: 'Language:',
  },
  instant_menu_search: {
    ar: 'البحث الفوري في المنيو',
    en: 'Instant Menu Search',
  },
  full_menu_count: {
    ar: 'المنيو الإلكتروني الكامل (204 أصناف)',
    en: 'Full Digital Menu (204 items)',
  },

  // Hero
  hero_h1_lead: {
    ar: 'أشهى',
    en: 'The Tastiest',
  },
  hero_h1_highlight: {
    ar: 'بروستد مقرمش',
    en: 'Crispy Broasted',
  },
  hero_h1_trail: {
    ar: 'ومشويات على الفحم في الدمام',
    en: '& Charcoal Grills in Dammam',
  },
  hero_description: {
    ar: 'نقدم لكم قائمة متكاملة من البروستد الذهبي الحراق والعادي، مشويات طازجة بالكيلو ونصف الكيلو، شاورما صاج، وجبات سريعة، باستا وفطائر، وعصائر طبيعية منعشة 100%.',
    en: 'Serving an all-inclusive menu of regular and spicy golden broasted chicken, fresh charcoal skewers by KG, Saj shawarma, quick meals, Italian pasta, pies, and 100% fresh juices.',
  },
  explore_menu_btn: {
    ar: 'استكشف قائمة الطعام (204 أصناف)',
    en: 'Explore Menu (204 Items)',
  },
  quick_order_whatsapp: {
    ar: 'طلب سريع عبر واتساب',
    en: 'Quick WhatsApp Order',
  },
  view_original_pdf: {
    ar: '📄 عرض المنيو الأصلي (PDF)',
    en: '📄 Original Menu (PDF)',
  },
  view_on_map: {
    ar: 'موقعنا على الخريطة',
    en: 'Location on Map',
  },
  call_or_whatsapp: {
    ar: 'اتصال سريع / واتساب:',
    en: 'Quick Call / WhatsApp:',
  },

  // Menu Top & Tabs
  menu_official_badge: {
    ar: 'قائمة طعام إلكترونية معتمدة 100% من ملف المنيو الأصلي',
    en: 'Official 100% Verified Menu from Original Restaurant Card',
  },
  menu_main_heading: {
    ar: 'المنيو الإلكتروني التفاعلي',
    en: 'Interactive Digital Menu',
  },
  view_single_section: {
    ar: 'عرض قسم محدد فقط',
    en: 'Filter Single Section',
  },
  view_all_sections: {
    ar: 'عرض جميع الأقسام بالتسلسل',
    en: 'View All Sections Sequentially',
  },
  items_sections_summary: {
    ar: '204 أصناف في 11 قسماً',
    en: '204 Items across 11 Sections',
  },
  tab_all: {
    ar: 'الكل',
    en: 'All',
  },

  // Search & Filter
  search_placeholder: {
    ar: 'ابحث بالاسم أو المكونات (مثال: بروستد، كباب، عورقلب، جمبري، شاورما...)',
    en: 'Search by item name or ingredients (e.g. Broasted, Kebab, Burger, Pizza, Shawarma...)',
  },
  search_shortcut_hint: {
    ar: 'بحث سريع',
    en: 'Quick Search',
  },
  filter_all: {
    ar: 'الكل',
    en: 'All',
  },
  filter_popular: {
    ar: 'الأكثر طلباً ⭐',
    en: 'Popular ⭐',
  },
  filter_under20: {
    ar: 'أقل من 20 ر.س 💰',
    en: 'Under 20 SAR 💰',
  },
  filter_calories: {
    ar: 'مع السعرات 🔥',
    en: 'With Calories 🔥',
  },
  search_results_title: {
    ar: 'نتائج البحث والتصفية',
    en: 'Search & Filter Results',
  },
  searching_for_query: {
    ar: 'البحث عن:',
    en: 'Searching for:',
  },
  filtered_by_chips: {
    ar: 'تصفية حسب الخيارات المحددة',
    en: 'Filtered by chosen options',
  },
  clear_search_btn: {
    ar: 'إلغاء البحث والعودة للمنيو',
    en: 'Clear Search & Show Menu',
  },
  no_matching_items: {
    ar: 'لم نعثر على أي أصناف مطابقة للبحث',
    en: 'No matching items found',
  },
  no_matching_hint: {
    ar: 'تأكد من كتابة اسم الصنف أو جرب البحث بكلمة عامة مثل: بروستد، كباب، عورقلب، بيتزا.',
    en: 'Check the spelling or try searching generic words like: Broasted, Kebab, Chicken, Pizza.',
  },
  reset_search_btn: {
    ar: 'إعادة ضبط البحث',
    en: 'Reset Search',
  },
  filter_this_section_only: {
    ar: 'تصفية هذا القسم فقط',
    en: 'Filter this section only',
  },
  show_all_sections_btn: {
    ar: 'عرض كل الأقسام بالتسلسل',
    en: 'Show all sections',
  },
  approved_items_count: {
    ar: 'صنف معتمد',
    en: 'items',
  },
  items_unit: {
    ar: 'صنف',
    en: 'items',
  },

  // Item Card & Modal
  currency: {
    ar: 'ر.س',
    en: 'SAR',
  },
  starts_from: {
    ar: 'يبدأ من',
    en: 'From',
  },
  calories_unit: {
    ar: 'سعرة حرارية',
    en: 'calories',
  },
  add_to_order: {
    ar: 'إضافة للطلب',
    en: 'Add to Order',
  },
  selected_badge: {
    ar: 'تم الاختيار',
    en: 'Selected',
  },
  choose_size_type: {
    ar: 'اختر الحجم أو النوع:',
    en: 'Select size or type:',
  },
  spice_level: {
    ar: 'درجة النكهة:',
    en: 'Flavor / Spice:',
  },
  spice_regular: {
    ar: 'عادي 🍗',
    en: 'Regular 🍗',
  },
  spice_spicy: {
    ar: 'حراق 🌶️',
    en: 'Spicy 🌶️',
  },
  custom_notes_label: {
    ar: 'ملاحظات وتفضيلات خاصة (اختياري):',
    en: 'Special instructions / Notes (Optional):',
  },
  custom_notes_placeholder: {
    ar: 'مثال: زيادة ثوم، بدون مايونيز، خبز إضافي، درجة الشواء...',
    en: 'e.g. Extra garlic, no mayo, extra bread, well-done...',
  },
  quantity_label: {
    ar: 'الكمية:',
    en: 'Quantity:',
  },
  total_label: {
    ar: 'المجموع:',
    en: 'Total:',
  },
  update_in_order: {
    ar: 'تحديث الصنف في الطلب',
    en: 'Update in Order',
  },
  add_to_order_modal: {
    ar: 'إضافة إلى الطلب',
    en: 'Add to Order',
  },
  close_modal: {
    ar: 'إغلاق',
    en: 'Close',
  },
  best_seller_badge: {
    ar: 'الأكثر طلباً',
    en: 'Best Seller',
  },
  special_spicy_badge: {
    ar: 'حراق مميز',
    en: 'Spicy Special',
  },
  skewers_free_gift: {
    ar: '🎁 عرض مجاني مع كل كيلو أو نصف كيلو: سيخ فلفل مشوي + سيخ طماطم مشوي + سيخ بصل مشوي + صحن ثومية كريمي',
    en: '🎁 Complimentary with every 1 KG or 1/2 KG: Grilled pepper + grilled tomato + grilled onion skewers + creamy garlic dip',
  },

  // Bottom Floating Bar
  bottom_bar_send_order: {
    ar: 'إرسال الطلب',
    en: 'Send Order',
  },
  bottom_bar_selected_prefix: {
    ar: 'تم اختيار',
    en: 'Selected',
  },
  bottom_bar_ready_text: {
    ar: 'جاهز للإرسال إلى واتساب المطعم',
    en: 'Ready to send to restaurant WhatsApp',
  },

  // Cart Drawer
  cart_header_title: {
    ar: 'طلبك الحالي',
    en: 'Your Order',
  },
  cart_empty_title: {
    ar: 'سلة الطلبات فارغة حالياً',
    en: 'Your cart is currently empty',
  },
  cart_empty_desc: {
    ar: 'تصفح المنيو واختر وجباتك المفضلة لإرسالها مباشرة لواتساب المطعم',
    en: 'Browse the menu and pick your favorite meals to send directly to WhatsApp',
  },
  cart_explore_btn: {
    ar: 'تصفح المنيو وإضافة أصناف',
    en: 'Browse Menu & Add Items',
  },
  cart_pickup_method: {
    ar: 'طريقة الاستلام والطلب:',
    en: 'Pickup & Order Method:',
  },
  cart_type_car_pickup: {
    ar: '🚗 اتصل قبل أن تصل (استلام من السيارة / المحطة)',
    en: '🚗 Call Before Arriving (Car Pickup at Station)',
  },
  cart_type_dine_in: {
    ar: '🍽️ استلام وسفري من الفرع (محطة بترو هلا)',
    en: '🍽️ Takeaway from Branch (Petro Hala)',
  },
  cart_type_delivery: {
    ar: '🛵 توصيل إلى موقعي',
    en: '🛵 Delivery to my location',
  },
  cart_customer_name: {
    ar: 'اسم العميل (اختياري):',
    en: 'Customer Name (Optional):',
  },
  cart_name_placeholder: {
    ar: 'اسمك لتجهيز الفاتورة والنداء...',
    en: 'Your name for the order receipt...',
  },
  cart_customer_phone: {
    ar: 'رقم الجوال للتأكيد:',
    en: 'Mobile Number for confirmation:',
  },
  cart_phone_placeholder: {
    ar: '05xxxxxxxx',
    en: '05xxxxxxxx',
  },
  cart_general_notes: {
    ar: 'ملاحظات عامة على الطلب:',
    en: 'General Order Notes:',
  },
  cart_notes_placeholder: {
    ar: 'أي تعليمات خاصة للتجهيز أو وقت الوصول المفضل...',
    en: 'Any special prep notes or preferred arrival time...',
  },
  cart_summary_title: {
    ar: 'ملخص الطلب والحساب:',
    en: 'Order Summary:',
  },
  cart_total_count_label: {
    ar: 'عدد الأصناف:',
    en: 'Total Items:',
  },
  cart_final_total: {
    ar: 'الإجمالي النهائي:',
    en: 'Grand Total:',
  },
  cart_send_whatsapp_btn: {
    ar: 'إرسال الطلب عبر واتساب',
    en: 'Send Order via WhatsApp',
  },
  cart_clear_btn: {
    ar: 'إفراغ السلة',
    en: 'Clear Cart',
  },

  // About & Location
  about_tag: {
    ar: 'عن مشوار الفرسان',
    en: 'About Meshwar Al Forsan',
  },
  about_title: {
    ar: 'طعم أصيل، جودة مضمونة، وخدمة سريعة',
    en: 'Authentic Taste, Guaranteed Quality & Swift Service',
  },
  about_description: {
    ar: 'في مطعم بروستد مشوار الفرسان، نحرص على تقديم أشهى وجبات البروستد المقرمش المصنوعة من الدجاج الطازج اليومي، إضافة إلى المشويات المتبلة على الفحم بالأسياخ، والشاورما والفطائر والعصائر الطبيعية 100%. شعارنا الدائم «اتصل قبل أن تصل» لضمان استلام وجبتك ساخنة وطازجة بدون أي انتظار.',
    en: 'At Meshwar Al Forsan Broasted, we are committed to delivering the crispest golden broasted chicken prepared from daily fresh poultry, charcoal-grilled skewers, savory shawarma, pies, and 100% fresh natural juices. Our motto is "Call Before You Arrive" to ensure your meal is served hot and ready without delay.',
  },
  about_pillar_1: {
    ar: 'دجاج ولحوم طازجة يومياً بتتبيلات سرية حصرية',
    en: 'Daily fresh poultry & meats with exclusive secret seasonings',
  },
  about_pillar_2: {
    ar: 'خدمة استلام سريعة بالسيارة: اتصل قبل وصولك لتجد طلبك جاهزاً',
    en: 'Fast car pickup service: Call ahead to find your meal ready on arrival',
  },
  about_pillar_3: {
    ar: 'عروض خاصة على أسياخ المشويات بالكيلو مع مقبلات مجانية',
    en: 'Special deals on grilled skewers by the KG with complimentary appetizers',
  },
  working_hours_title: {
    ar: 'أوقات العمل:',
    en: 'Working Hours:',
  },
  working_hours_val: {
    ar: 'يومياً من الساعة 12:00 ظهراً حتى 02:00 بعد منتصف الليل',
    en: 'Daily: 12:00 PM to 02:00 AM',
  },
  location_title: {
    ar: 'موقعنا الجغرافي',
    en: 'Our Geographic Location',
  },
  location_highway_desc: {
    ar: 'موقع متميز يسهل الوصول إليه على طريق الدمام - الرياض السريع داخل محطة بترو هلا بحي الفرسان.',
    en: 'Convenient prime location on the Dammam - Riyadh Highway, inside Petro Hala Station in Al Forsan district.',
  },
  open_google_maps: {
    ar: 'فتح الموقع مباشرة على خرائط Google',
    en: 'Open Location in Google Maps',
  },
  whatsapp_contact_btn: {
    ar: 'واتساب:',
    en: 'WhatsApp:',
  },
  call_direct_btn: {
    ar: 'اتصال هاتفي:',
    en: 'Phone Call:',
  },

  // Quick Search Modal
  quick_search_title: {
    ar: 'بحث سريع في المنيو',
    en: 'Quick Menu Search',
  },
  quick_search_input_placeholder: {
    ar: 'ابحث في 204 أصناف (بروستد، كباب، عورقلب، بيتزا...)',
    en: 'Search 204 items (Broasted, Kebab, Burger, Pizza...)',
  },
  quick_search_esc_hint: {
    ar: 'اضغط ESC للإغلاق',
    en: 'Press ESC to close',
  },
  popular_searches_label: {
    ar: 'عمليات بحث شائعة:',
    en: 'Popular searches:',
  },

  // Footer
  footer_quick_links: {
    ar: 'روابط سريعة',
    en: 'Quick Links',
  },
  footer_contact_info: {
    ar: 'معلومات التواصل',
    en: 'Contact Information',
  },
  footer_rights: {
    ar: 'جميع الحقوق محفوظة لمطعم بروستد مشوار الفرسان',
    en: 'All rights reserved - Meshwar Al Forsan Broasted',
  },
  footer_address_short: {
    ar: 'الدمام - حي الفرسان - محطة بترو هلا',
    en: 'Dammam - Al Forsan - Petro Hala Station',
  },
  back_to_top_aria: {
    ar: 'العودة لأعلى الصفحة',
    en: 'Back to Top',
  },
} as const;

export type TranslationKey = keyof typeof translations;

interface LanguageContextType {
  language: Language;
  direction: Direction;
  isAr: boolean;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  formatPrice: (price: number) => string;
  currency: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('app_language') as Language | null;
      if (saved === 'ar' || saved === 'en') return saved;
    } catch {
      // fallback
    }
    return 'ar'; // default to Arabic
  });

  const direction: Direction = language === 'ar' ? 'rtl' : 'ltr';
  const isAr = language === 'ar';

  useEffect(() => {
    try {
      localStorage.setItem('app_language', language);
    } catch {
      // ignore
    }

    const root = document.documentElement;
    root.setAttribute('lang', language);
    root.setAttribute('dir', direction);

    // Toggle document class for language-specific styling if needed
    if (language === 'ar') {
      root.classList.add('lang-ar');
      root.classList.remove('lang-en');
    } else {
      root.classList.add('lang-en');
      root.classList.remove('lang-ar');
    }
  }, [language, direction]);

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
  };

  const t = (key: TranslationKey): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[language] || entry.ar || key;
  };

  const currency = language === 'ar' ? 'ر.س' : 'SAR';

  const formatPrice = (price: number): string => {
    return `${price} ${currency}`;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        direction,
        isAr,
        toggleLanguage,
        setLanguage,
        t,
        formatPrice,
        currency,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
