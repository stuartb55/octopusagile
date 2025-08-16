import { EnergyRate, ApiResponse, FetchResult } from './types';
import { APP_CONFIG } from './config';

export class EnergyService {
  private static buildApiUrl(periodFrom: string, periodTo: string): string {
    const { baseUrl, productCode, tariffCode } = APP_CONFIG.api;
    return `${baseUrl}/products/${productCode}/electricity-tariffs/${tariffCode}/standard-unit-rates/?period_from=${periodFrom}&period_to=${periodTo}`;
  }

  static async getEnergyPrices(days = 1): Promise<FetchResult<EnergyRate[]>> {
    try {
      const now = new Date();
      const daysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      daysAgo.setHours(0, 0, 0, 0);

      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      tomorrow.setHours(23, 59, 59, 999);

      const periodFrom = daysAgo.toISOString();
      const periodTo = tomorrow.toISOString();

      let allResults: EnergyRate[] = [];
      let nextUrl: string | null = this.buildApiUrl(periodFrom, periodTo);

      while (nextUrl && allResults.length < APP_CONFIG.api.maxResults) {
        const response = await fetch(nextUrl, {
          next: { revalidate: APP_CONFIG.api.revalidateSeconds },
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data: ApiResponse = await response.json();
        allResults = [...allResults, ...data.results];
        nextUrl = data.next;

        if (allResults.length > APP_CONFIG.api.maxResults) {
          console.warn(`Result limit reached (${APP_CONFIG.api.maxResults}), stopping pagination`);
          break;
        }
      }

      return {
        data: allResults,
        error: null,
        isLoading: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred while fetching energy prices';
      
      return {
        data: null,
        error: errorMessage,
        isLoading: false,
      };
    }
  }

  static async getCurrentPrice(): Promise<FetchResult<EnergyRate | null>> {
    const result = await this.getEnergyPrices(1);
    
    if (result.error || !result.data) {
      return {
        data: null,
        error: result.error,
        isLoading: false,
      };
    }

    const now = new Date();
    const currentPrice = result.data.find(price => {
      const validFrom = new Date(price.valid_from);
      const validTo = new Date(price.valid_to);
      return now >= validFrom && now < validTo;
    });

    return {
      data: currentPrice || null,
      error: currentPrice ? null : 'No current price found',
      isLoading: false,
    };
  }
}