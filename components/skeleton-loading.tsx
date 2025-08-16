import { Card, CardContent, CardHeader } from './ui/card';

export function PriceCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-3">
        <div className="h-4 bg-muted rounded w-3/4"></div>
        <div className="h-3 bg-muted rounded w-1/2 mt-2"></div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="flex justify-between">
          <div className="h-3 bg-muted rounded w-1/4"></div>
          <div className="h-3 bg-muted rounded w-1/4"></div>
        </div>
        <div className="h-3 bg-muted rounded w-full"></div>
      </CardContent>
    </Card>
  );
}

export function ChartSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-5 bg-muted rounded w-1/3"></div>
        <div className="h-3 bg-muted rounded w-1/2"></div>
      </CardHeader>
      <CardContent>
        <div className="h-64 bg-muted rounded-lg"></div>
      </CardContent>
    </Card>
  );
}

export function PriceListSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-5 bg-muted rounded w-1/4"></div>
        <div className="h-3 bg-muted rounded w-1/3"></div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center py-2">
            <div className="flex items-center space-x-3">
              <div className="h-4 w-16 bg-muted rounded"></div>
              <div className="h-4 w-20 bg-muted rounded"></div>
            </div>
            <div className="h-6 w-16 bg-muted rounded-full"></div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function LivePriceSkeleton() {
  return (
    <div className="text-center space-y-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-32 mx-auto"></div>
        <div className="h-12 bg-muted rounded w-40 mx-auto"></div>
        <div className="h-3 bg-muted rounded w-24 mx-auto"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded w-20 mx-auto"></div>
          <div className="h-8 bg-muted rounded w-32 mx-auto"></div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded w-24 mx-auto"></div>
          <div className="h-8 bg-muted rounded w-32 mx-auto"></div>
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="text-center space-y-4">
        <div className="h-8 bg-muted rounded w-64 mx-auto animate-pulse"></div>
        <div className="h-4 bg-muted rounded w-96 mx-auto animate-pulse"></div>
      </div>

      {/* Live price skeleton */}
      <LivePriceSkeleton />

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PriceCardSkeleton />
        <PriceCardSkeleton />
        <PriceCardSkeleton />
      </div>

      {/* Chart skeleton */}
      <ChartSkeleton />

      {/* Price list skeleton */}
      <PriceListSkeleton />
    </div>
  );
}