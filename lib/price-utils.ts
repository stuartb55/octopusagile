import { EnergyRate, PriceStats, PriceCategory } from './types';
import { APP_CONFIG } from './config';

// Utility function to format dates consistently between server and client
export function formatDateForDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Use consistent formatting that works the same on server and client
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric", 
    month: "long",
    year: "numeric",
    timeZone: "Europe/London"
  };
  
  // Force consistent locale and remove any potential variations
  return d.toLocaleDateString("en-GB", options).replace(/,/g, '');
}

export function getDateKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0]; // YYYY-MM-DD format
}

export function isToday(dateKey: string): boolean {
  const today = new Date();
  return getDateKey(today) === dateKey;
}

export function isTomorrow(dateKey: string): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getDateKey(tomorrow) === dateKey;
}

export function calculateStats(prices: EnergyRate[]): PriceStats {
  if (prices.length === 0) {
    return { min: 0, max: 0, avg: 0, trend: 0, count: 0 };
  }

  const values = prices.map(p => p.value_inc_vat);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  
  // Calculate trend (simple linear regression slope)
  let trend = 0;
  if (prices.length >= 2) {
    const n = prices.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (val * index), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    trend = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  return { min, max, avg, trend, count: prices.length };
}

export function getPriceCategory(price: number): PriceCategory {
  const { negative, low, medium } = APP_CONFIG.ui.priceThresholds;
  
  if (price < negative) return 'negative';
  if (price <= low) return 'low';
  if (price <= medium) return 'medium';
  return 'high';
}

export function getPriceColor(price: number): string {
  const category = getPriceCategory(price);
  
  switch (category) {
    case 'negative': return 'text-blue-700';
    case 'low': return 'text-emerald-700';
    case 'medium': return 'text-amber-700';
    case 'high': return 'text-red-700';
    default: return 'text-gray-700';
  }
}

export function getPriceBadgeVariant(price: number): "default" | "secondary" | "destructive" | "outline" {
  const category = getPriceCategory(price);
  
  switch (category) {
    case 'negative': return 'default';
    case 'low': return 'secondary';
    case 'medium': return 'outline';
    case 'high': return 'destructive';
    default: return 'outline';
  }
}

export function getPriceGradient(price: number): string {
  const category = getPriceCategory(price);
  
  switch (category) {
    case 'negative': return 'from-blue-500 to-blue-700';
    case 'low': return 'from-emerald-500 to-emerald-700';
    case 'medium': return 'from-amber-500 to-amber-700';
    case 'high': return 'from-red-500 to-red-700';
    default: return 'from-gray-500 to-gray-700';
  }
}

export function filterPricesByDateRange(prices: EnergyRate[]): EnergyRate[] {
  return prices.sort((a, b) => new Date(a.valid_from).getTime() - new Date(b.valid_from).getTime());
}

export function groupPricesByDay(prices: EnergyRate[]): Record<string, EnergyRate[]> {
  return prices.reduce((acc, price) => {
    // Use a consistent date format that's the same on server and client
    const date = new Date(price.valid_from);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(price);
    return acc;
  }, {} as Record<string, EnergyRate[]>);
}

export function getCurrentAndNextPrices(prices: EnergyRate[]): {
  currentPrice: EnergyRate | null;
  nextPrice: EnergyRate | null;
} {
  const now = new Date();
  const sortedPrices = prices.sort((a, b) => new Date(a.valid_from).getTime() - new Date(b.valid_from).getTime());

  let currentPrice: EnergyRate | null = null;
  let nextPrice: EnergyRate | null = null;

  for (let i = 0; i < sortedPrices.length; i++) {
    const price = sortedPrices[i];
    const validFrom = new Date(price.valid_from);
    const validTo = new Date(price.valid_to);

    if (now >= validFrom && now < validTo) {
      currentPrice = price;
      nextPrice = sortedPrices[i + 1] || null;
      break;
    }
  }

  return { currentPrice, nextPrice };
}

export function getCheapestPrice24h(prices: EnergyRate[]): EnergyRate | null {
  const now = new Date();
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const upcomingPrices = prices.filter(price => {
    const validFrom = new Date(price.valid_from);
    return validFrom >= now && validFrom <= next24h;
  });

  if (upcomingPrices.length === 0) return null;

  return upcomingPrices.reduce((cheapest, current) => 
    current.value_inc_vat < cheapest.value_inc_vat ? current : cheapest
  );
}