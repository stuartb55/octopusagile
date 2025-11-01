import { EnergyRate, FetchResult } from './types';
import { APP_CONFIG } from './config';
import { validateApiResponse, validateUrl, ValidationRules } from './validation';
import { octopusApiRateLimiter, RateLimitError, TimeoutError } from './rate-limiter';
import { cache } from 'react';

export class EnergyService {
  private static buildApiUrl(periodFrom: string, periodTo: string): string {
    const { baseUrl, productCode, tariffCode } = APP_CONFIG.api;
    const url = `${baseUrl}/products/${productCode}/electricity-tariffs/${tariffCode}/standard-unit-rates/?period_from=${periodFrom}&period_to=${periodTo}`;
    
    if (!validateUrl(url)) {
      throw new Error('Invalid API URL detected');
    }
    
    return url;
  }

  private static async fetchWithSecurity(url: string): Promise<Response> {
    if (!validateUrl(url)) {
      throw new Error('Invalid URL for security policy');
    }

    return octopusApiRateLimiter.execute(async () => {
      const response = await fetch(url, {
        next: { revalidate: APP_CONFIG.api.revalidateSeconds },
        headers: {
          'User-Agent': 'Octopus-Agile-Tracker/1.0',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        const status = response.status;
        const statusText = response.statusText;
        
        // Enhanced error handling for different HTTP status codes
        switch (status) {
          case 429:
            throw new RateLimitError(`API rate limit exceeded: ${statusText}`);
          case 401:
            throw new Error(`API authentication failed: ${statusText}`);
          case 403:
            throw new Error(`API access forbidden: ${statusText}`);
          case 404:
            throw new Error(`API endpoint not found: ${statusText}`);
          case 500:
          case 502:
          case 503:
          case 504:
            throw new Error(`API server error (${status}): ${statusText}`);
          default:
            throw new Error(`API request failed (${status}): ${statusText}`);
        }
      }

      return response;
    });
  }

  // Core implementation that performs the actual network calls and validation.
  // Separated so we can expose a cached wrapper while keeping the implementation testable.
  private static async getEnergyPricesImpl(days = 1): Promise<FetchResult<EnergyRate[]>> {
    try {
      // Validate input parameters
      const validatedDays = Math.max(1, Math.min(ValidationRules.days.max, days));
      
      const now = new Date();
      const daysAgo = new Date(now.getTime() - validatedDays * 24 * 60 * 60 * 1000);
      daysAgo.setHours(0, 0, 0, 0);

      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      tomorrow.setHours(23, 59, 59, 999);

      const periodFrom = daysAgo.toISOString();
      const periodTo = tomorrow.toISOString();

      let allResults: EnergyRate[] = [];
      let nextUrl: string | null = this.buildApiUrl(periodFrom, periodTo);
      let requestCount = 0;
      const maxRequests = 10; // Prevent infinite pagination loops

      while (nextUrl && allResults.length < ValidationRules.api.maxResults && requestCount < maxRequests) {
        const response = await this.fetchWithSecurity(nextUrl);
        const data = await response.json();

        // Validate API response structure
        if (!validateApiResponse(data)) {
          throw new Error('Invalid API response format received');
        }

        allResults = [...allResults, ...data.results];
        nextUrl = data.next;
        requestCount++;

        // Validate URL if there's a next page
        if (nextUrl && !validateUrl(nextUrl)) {
          console.warn('Invalid next URL received from API, stopping pagination');
          break;
        }

        if (allResults.length > ValidationRules.api.maxResults) {
          console.warn(`Result limit reached (${ValidationRules.api.maxResults}), stopping pagination`);
          break;
        }
      }

      if (requestCount >= maxRequests) {
        console.warn(`Maximum request limit reached (${maxRequests}), stopping pagination`);
      }

      return {
        data: allResults,
        error: null,
        isLoading: false,
      };
    } catch (error) {
      let errorMessage = 'Unknown error occurred while fetching energy prices';

      if (error instanceof RateLimitError) {
        errorMessage = `Rate limit exceeded: ${error.message}`;
      } else if (error instanceof TimeoutError) {
        errorMessage = `Request timeout: ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      console.error('EnergyService error:', error);

      return {
        data: null,
        error: errorMessage,
        isLoading: false,
      };
    }
  }

  // Export cached function (inferred type) to avoid lint false-positives about unused parameter names
  static getEnergyPrices = cache(async (d = 1) => {
    return await EnergyService.getEnergyPricesImpl(d);
  });

  static async getCurrentPrice(): Promise<FetchResult<EnergyRate | null>> {
    // Use the cached public method so current price benefits from memoization.
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
