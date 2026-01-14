import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format price to avoid floating-point precision issues
 * For INR, rounds to whole numbers. For other currencies, rounds to 2 decimal places.
 */
export function formatPrice(price: number, currency: string = 'INR'): string {
  if (price === 0) return '0';
  
  // For INR, round to whole number
  if (currency === 'INR') {
    return Math.round(price).toString();
  }
  
  // For other currencies, round to 2 decimal places
  return price.toFixed(2);
}

/**
 * Calculate subscription prices with discounts matching backend logic
 */
export function calculateSubscriptionPrices(basePrice: number): {
  monthly: number;
  quarterly: number;
  annual: number;
} {
  if (basePrice === 0) {
    return { monthly: 0, quarterly: 0, annual: 0 };
  }

  return {
    monthly: basePrice,
    quarterly: Math.round(basePrice * 3 * 0.9), // 10% discount
    annual: Math.round(basePrice * 12 * 0.8), // 20% discount
  };
}
