export const APP_CONFIG = {
  api: {
    baseUrl: 'https://api.octopus.energy/v1',
    productCode: 'AGILE-24-10-01',
    tariffCode: 'E-1R-AGILE-24-10-01-G',
    revalidateSeconds: 1800, // 30 minutes
    maxResults: 1500,
  },
  ui: {
    priceThresholds: {
      negative: 0,
      low: 15,
      medium: 30,
    },
    refreshInterval: 30 * 60 * 1000, // 30 minutes in milliseconds
    defaultDays: 3,
  },
  formatting: {
    londonTimeOptions: {
      hour: "2-digit" as const,
      minute: "2-digit" as const,
      timeZone: "Europe/London",
    },
    londonDateShortMonthOptions: {
      day: "numeric" as const,
      month: "short" as const,
      timeZone: "Europe/London",
    },
    londonFullDateDisplayOptions: {
      weekday: "long" as const,
      day: "numeric" as const,
      month: "long" as const,
      year: "numeric" as const,
      timeZone: "Europe/London",
    },
  },
} as const;