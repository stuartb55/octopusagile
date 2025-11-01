import { EnergyRate, ApiResponse } from './types';

export class ValidationError extends Error {
  public field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export const ValidationRules = {
  days: {
    min: 1,
    max: 30,
    default: 3,
  },
  api: {
    maxRetries: 3,
    timeoutMs: 10000,
    maxResults: 1500,
  }
} as const;

export function validateDaysParameter(value: string | undefined): number {
  const { min, max, default: defaultValue } = ValidationRules.days;
  
  if (!value || value.trim() === '') {
    return defaultValue;
  }
  
  const parsed = parseInt(value, 10);
  
  if (isNaN(parsed)) {
    throw new ValidationError(
      `Invalid days parameter: "${value}". Must be a number between ${min} and ${max}.`,
      'days'
    );
  }
  
  if (parsed < min || parsed > max) {
    throw new ValidationError(
      `Days parameter out of range: ${parsed}. Must be between ${min} and ${max}.`,
      'days'
    );
  }
  
  return parsed;
}

export function validateEnergyRate(data: unknown): data is EnergyRate {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  
  const rate = data as Record<string, unknown>;
  
  return (
    typeof rate.value_exc_vat === 'number' &&
    typeof rate.value_inc_vat === 'number' &&
    typeof rate.valid_from === 'string' &&
    typeof rate.valid_to === 'string' &&
    !isNaN(Date.parse(rate.valid_from)) &&
    !isNaN(Date.parse(rate.valid_to)) &&
    rate.value_inc_vat >= -100 && // Reasonable bounds
    rate.value_inc_vat <= 1000
  );
}

export function validateApiResponse(data: unknown): data is ApiResponse {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  
  const response = data as Record<string, unknown>;
  
  return (
    typeof response.count === 'number' &&
    (response.next === null || typeof response.next === 'string') &&
    (response.previous === null || typeof response.previous === 'string') &&
    Array.isArray(response.results) &&
    response.results.every(validateEnergyRate)
  );
}

export function sanitizeSearchParams(params: Record<string, string | string[] | undefined>): {
  days: number;
} {
  const daysParam = Array.isArray(params.days) ? params.days[0] : params.days;
  
  try {
    const days = validateDaysParameter(daysParam);
    return { days };
  } catch (error) {
    if (error instanceof ValidationError) {
      console.warn(`Search parameter validation failed: ${error.message}`);
      return { days: ValidationRules.days.default };
    }
    throw error;
  }
}

export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === 'api.octopus.energy';
  } catch {
    return false;
  }
}