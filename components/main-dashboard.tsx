'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarDays, Activity } from "lucide-react";
import { EnergyPriceChart } from "../app/energy-price-chart";
import { PriceStatsCard } from "../app/price-stats-card";
import { PriceList } from "../app/price-list";
import { AutoRefresh } from "../app/auto-refresh";

import { 
  calculateStats, 
  filterPricesByDateRange, 
  groupPricesByDay, 
  getCurrentAndNextPrices,
  getCheapestPrice24h,
  getPriceColor,
  formatDateForDisplay,
  getDateKey,
  isToday
} from "@/lib/price-utils";
import { EnergyRate } from "@/lib/types";
import { APP_CONFIG } from "@/lib/config";

interface MainDashboardProps {
  allPrices: EnergyRate[];
  selectedDays: number;
}

// Price category options for the selector
const priceOptions = [
  { value: 1, label: "1 Day" },
  { value: 3, label: "3 Days" },
  { value: 7, label: "7 Days" },
  { value: 14, label: "14 Days" },
  { value: 30, label: "30 Days" },
];

export function MainDashboard({ allPrices, selectedDays }: MainDashboardProps) {
  // Memoize expensive calculations
  const filteredPrices = useMemo(() => filterPricesByDateRange(allPrices), [allPrices]);
  
  const { currentPrice, nextPrice } = useMemo(() => 
    getCurrentAndNextPrices(filteredPrices), 
    [filteredPrices]
  );
  
  const cheapest24h = useMemo(() => 
    getCheapestPrice24h(filteredPrices), 
    [filteredPrices]
  );
  
  const overallStats = useMemo(() => 
    calculateStats(filteredPrices.filter((p) => new Date(p.valid_from) <= new Date())), 
    [filteredPrices]
  );
  
  const groupedPrices = useMemo(() => 
    groupPricesByDay(filteredPrices), 
    [filteredPrices]
  );

  // Calculate additional metrics using consistent date keys
  const todayDateKey = useMemo(() => getDateKey(new Date()), []);
  const tomorrowDateKey = useMemo(() => getDateKey(new Date(Date.now() + 24 * 60 * 60 * 1000)), []);

  const hasAnyTomorrowPrices = (groupedPrices[tomorrowDateKey] || []).length > 0;
  
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <AutoRefresh />
      
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Octopus Agile Tracker
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Real-time electricity pricing for Octopus Energy Agile tariff customers. Track current rates, analyse trends, and plan your energy usage.
        </p>
      </div>

      {/* Live Price Section */}
      <LivePriceSection 
        currentPrice={currentPrice} 
        nextPrice={nextPrice} 
        cheapest24h={cheapest24h}
      />

      {/* Time Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Time Range
          </CardTitle>
          <CardDescription>Select the number of days to display</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {priceOptions.map((option) => (
              <Button
                key={option.value}
                variant={selectedDays === option.value ? "default" : "outline"}
                size="sm"
                asChild
              >
                <Link href={`/?days=${option.value}`}>
                  {option.label}
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PriceStatsCard
          title="Overall Average"
          value={`${overallStats.avg.toFixed(2)}p`}
          description={`Per kWh inc. VAT (Last ${Object.keys(groupedPrices).filter((key) => key !== tomorrowDateKey || hasAnyTomorrowPrices).length} days)`}
          icon={<Activity className="h-4 w-4" />}
        />
        <PriceStatsCard
          title="Minimum Price"
          value={`${overallStats.min.toFixed(2)}p`}
          description="Lowest price in period"
          icon={<span className="h-4 w-4">📉</span>}
        />
        <PriceStatsCard
          title="Maximum Price"
          value={`${overallStats.max.toFixed(2)}p`}
          description="Highest price in period"
          icon={<span className="h-4 w-4">📈</span>}
        />
      </div>

      {/* Price Chart */}
      <EnergyPriceChart prices={filteredPrices} />

      {/* Daily Breakdown */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Daily Breakdown</h2>
        
        {[
          { dateKey: tomorrowDateKey, label: "Tomorrow", isFuture: true },
          { dateKey: todayDateKey, label: "Today" },
          // Add previous days as needed
        ]
          .filter((dayInfo) => {
            const dayPrices = groupedPrices[dayInfo.dateKey];
            return dayPrices && dayPrices.length > 0;
          })
          .map((dayInfo) => {
            const dayPrices = groupedPrices[dayInfo.dateKey];
            const dayStats = calculateStats(dayPrices);
            const displayDate = formatDateForDisplay(dayInfo.dateKey);
            
            return (
              <Card key={dayInfo.dateKey}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-lg">{displayDate}</span>
                        {isToday(dayInfo.dateKey) && (
                          <Badge variant="outline">Today</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{dayInfo.label}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Min</div>
                      <div className={`font-semibold ${getPriceColor(dayStats.min)}`}>
                        {dayStats.min.toFixed(2)}p
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Max</div>
                      <div className={`font-semibold ${getPriceColor(dayStats.max)}`}>
                        {dayStats.max.toFixed(2)}p
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Average</div>
                      <div className={`font-semibold ${getPriceColor(dayStats.avg)}`}>
                        {dayStats.avg.toFixed(2)}p
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Periods</div>
                      <div className="font-semibold">{dayStats.count}</div>
                    </div>
                  </div>
                  
                  <EnergyPriceChart 
                    prices={dayPrices} 
                    compact
                  />
                  
                  <PriceList 
                    prices={dayPrices}
                    title={isToday(dayInfo.dateKey) ? "Today" : dayInfo.label}
                    isToday={isToday(dayInfo.dateKey)}
                  />
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
}

interface LivePriceSectionProps {
  currentPrice: EnergyRate | null;
  nextPrice: EnergyRate | null;
  cheapest24h: EnergyRate | null;
}

function LivePriceSection({ currentPrice, nextPrice, cheapest24h }: LivePriceSectionProps) {
  const { londonTimeOptions, londonDateShortMonthOptions } = APP_CONFIG.formatting;
  
  if (!currentPrice) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="w-8 h-8 text-amber-500 mx-auto mb-2">⚠️</div>
            <p className="text-muted-foreground">No current price data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="text-center pb-4">
        <CardTitle className="flex items-center justify-center gap-2 text-lg">
          <span className="text-blue-600">⚡</span>
          Live Electricity Price
        </CardTitle>
        <CardDescription>Current Octopus Agile rate</CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-6">
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Right now</div>
          <div className={`text-4xl md:text-5xl font-bold ${getPriceColor(currentPrice.value_inc_vat)}`}>
            {currentPrice.value_inc_vat.toFixed(2)}
            <span className="text-lg ml-1">p</span>
          </div>
          <div className="text-sm text-muted-foreground">per kWh (inc. VAT)</div>
          <Badge variant="outline" className="mt-2">
            {new Date(currentPrice.valid_from).toLocaleTimeString("en-GB", londonTimeOptions)} - {new Date(currentPrice.valid_to).toLocaleTimeString("en-GB", londonTimeOptions)}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          {nextPrice && (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Next Period</div>
              <div className={`text-xl font-semibold ${getPriceColor(nextPrice.value_inc_vat)}`}>
                {nextPrice.value_inc_vat.toFixed(2)}p
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(nextPrice.valid_from).toLocaleTimeString("en-GB", londonTimeOptions)}
              </div>
            </div>
          )}

          {cheapest24h && (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Cheapest (24h)</div>
              <div className={`text-xl font-semibold ${getPriceColor(cheapest24h.value_inc_vat)}`}>
                {cheapest24h.value_inc_vat.toFixed(2)}p
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(cheapest24h.valid_from).toLocaleDateString("en-GB", londonDateShortMonthOptions)}{" "}
                {new Date(cheapest24h.valid_from).toLocaleTimeString("en-GB", londonTimeOptions)}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}