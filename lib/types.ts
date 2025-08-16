export interface EnergyRate {
  value_exc_vat: number;
  value_inc_vat: number;
  valid_from: string;
  valid_to: string;
}

export interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: EnergyRate[];
}

export interface PriceStats {
  min: number;
  max: number;
  avg: number;
  trend: number;
  count: number;
}

export interface FetchResult<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

export type PriceCategory = 'negative' | 'low' | 'medium' | 'high';

export interface PageProps {
  searchParams: Promise<{ days?: string }>;
}