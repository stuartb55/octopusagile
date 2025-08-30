import { Suspense } from 'react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { EnergyErrorBoundary } from "@/components/error-boundary";
import { DashboardSkeleton } from "@/components/skeleton-loading";
import { MainDashboard } from "@/components/main-dashboard";

// Import our new utilities
import { EnergyService } from "@/lib/energy-service";
import { EnergyRate, PageProps } from "@/lib/types";
import { sanitizeSearchParams, ValidationError } from "@/lib/validation";

async function getPricesData(days: number): Promise<EnergyRate[]> {
  const result = await EnergyService.getEnergyPrices(days);
  
  if (result.error) {
    throw new Error(result.error);
  }
  
  return result.data || [];
}

export default async function Home({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  
  let days: number;
  let validationError: string | null = null;
  
  try {
    const sanitized = sanitizeSearchParams(resolvedSearchParams);
    days = sanitized.days;
  } catch (error) {
    if (error instanceof ValidationError) {
      validationError = error.message;
      days = 3; // fallback to default
    } else {
      throw error;
    }
  }
  
  try {
    const allPrices = await getPricesData(days);
    
    if (allPrices.length === 0) {
      return (
        <EnergyErrorBoundary>
          <div className="container mx-auto px-4 py-8">
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
              <h1 className="text-2xl font-bold">No Data Available</h1>
              <p className="text-muted-foreground">
                We couldn&apos;t fetch the latest energy pricing data. Please try again later.
              </p>
              <Button asChild>
                <Link href="/">Refresh</Link>
              </Button>
            </div>
          </div>
        </EnergyErrorBoundary>
      );
    }

    return (
      <EnergyErrorBoundary>
        {validationError && (
          <div className="container mx-auto px-4 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-amber-600 mr-2" />
                <p className="text-amber-800 text-sm">
                  Parameter validation warning: {validationError}. Using default value.
                </p>
              </div>
            </div>
          </div>
        )}
        <Suspense fallback={<DashboardSkeleton />}>
          <MainDashboard allPrices={allPrices} selectedDays={days} />
        </Suspense>
      </EnergyErrorBoundary>
    );
  } catch (error) {
    return (
      <EnergyErrorBoundary>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h1 className="text-2xl font-bold">Error Loading Data</h1>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
            <Button asChild>
              <Link href="/">Try Again</Link>
            </Button>
          </div>
        </div>
      </EnergyErrorBoundary>
    );
  }
}