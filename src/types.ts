export type ServiceMode = 'browse' | 'order' | 'full';

export type BillingCycle = 'weekly' | 'monthly' | 'yearly' | 'buyout';

export interface MenuItem {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  price: number;
  category: string;
  image: string;
  calories?: number;
  allergens?: string[];
  isPopular?: boolean;
  isChefSpecial?: boolean;
}

export interface Category {
  id: string;
  name: string;
  iconName: string;
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
  specialInstructions?: string;
}

export interface ReservationData {
  guestName: string;
  phone: string;
  date: string;
  time: string;
  guestsCount: number;
  occasion: string;
  seatingArea: 'indoor' | 'terrace' | 'vip';
  notes?: string;
}

export interface PricingPlan {
  id: string;
  title: string;
  subtitle: string;
  mode: ServiceMode;
  tag?: string;
  isPopular?: boolean;
  prices: {
    weekly: number;
    monthly: number;
    yearly: number;
    buyout: number;
  };
  features: string[];
  highlight: string;
}
