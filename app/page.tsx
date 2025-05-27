import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import Link from 'next/link';
import {Button} from "@/components/ui/button";
import {CalendarDays, TrendingUp, TrendingDown, Zap, Clock} from "lucide-react"
import {EnergyPriceChart} from "./energy-price-chart"
import {PriceStatsCard} from "./price-stats-card"

interface EnergyRate {
    value_exc_vat: number
    value_inc_vat: number
    valid_from: string
    valid_to: string
}

interface ApiResponse {
    count: number
    next: string | null
    previous: string | null
    results: EnergyRate[]
}

interface PageProps {
    searchParams: Promise<{ days?: string }>
}

async function getEnergyPrices(days = 1): Promise<EnergyRate[]> {
    try {
        const now = new Date();
        const currentHour = now.getHours();

        let revalidateSeconds;
        if (currentHour >= 15 && currentHour < 17) {
            revalidateSeconds = 30; // 30 seconds
        } else {
            revalidateSeconds = 3000; // 50 minutes
        }

        // Fetch data from specified days ago up to the end of tomorrow
        const daysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        daysAgo.setHours(0, 0, 0, 0); // Start of specified days ago

        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        tomorrow.setHours(23, 59, 59, 999); // End of tomorrow

        const periodFrom = daysAgo.toISOString();
        const periodTo = tomorrow.toISOString();

        let allResults: EnergyRate[] = [];
        let nextUrl: string | null =
            `https://api.octopus.energy/v1/products/AGILE-24-10-01/electricity-tariffs/E-1R-AGILE-24-10-01-G/standard-unit-rates/?period_from=${periodFrom}&period_to=${periodTo}`;

        while (nextUrl) {
            const response = await fetch(nextUrl, {
                next: {revalidate: revalidateSeconds},
            });

            if (!response.ok) {
                console.error(`Failed to fetch energy prices: ${response.status} ${response.statusText} from ${nextUrl}`);
                return [];
            }

            const data: ApiResponse = await response.json();
            allResults = [...allResults, ...data.results];
            nextUrl = data.next;

            if (allResults.length > 1500) {
                console.warn("Too many results, stopping pagination");
                break;
            }
        }
        return allResults;
    } catch (error) {
        console.error("Error fetching energy prices (general catch):", error);
        return [];
    }
}

function filterPricesByDateRange(prices: EnergyRate[]): EnergyRate[] {
    return prices.sort((a, b) => new Date(a.valid_from).getTime() - new Date(b.valid_from).getTime())
}

function groupPricesByDay(prices: EnergyRate[]): Record<string, EnergyRate[]> {
    const grouped = prices.reduce(
        (acc, price) => {
            const date = new Date(price.valid_from).toDateString()
            if (!acc[date]) {
                acc[date] = []
            }
            acc[date].push(price)
            return acc
        },
        {} as Record<string, EnergyRate[]>,
    )

    const filteredGrouped: Record<string, EnergyRate[]> = {}
    const tomorrowDateString = new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString()

    Object.entries(grouped).forEach(([date, dayPrices]) => {
        const sortedPrices = dayPrices.sort((a, b) => new Date(a.valid_from).getTime() - new Date(b.valid_from).getTime())

        // For tomorrow, show if any data exists (API might release it gradually)
        // For other days, require a more complete set of data (near 48 slots)
        if (date === tomorrowDateString) {
            if (sortedPrices.length > 0) {
                // Show if any data for tomorrow
                filteredGrouped[date] = sortedPrices
            }
        } else if (sortedPrices.length >= 46) {
            // For past/today, require near full day (48 half-hour slots)
            filteredGrouped[date] = sortedPrices
        }
    })

    return filteredGrouped
}

function calculateStats(prices: EnergyRate[]) {
    if (!prices || prices.length === 0) return {min: 0, max: 0, avg: 0, trend: 0, count: 0}

    const values = prices.map((p) => p.value_inc_vat)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length

    let trend = 0
    if (values.length > 1) {
        const midPoint = Math.floor(values.length / 2)
        if (midPoint > 0 && values.length - midPoint > 0) {
            const firstHalf = values.slice(0, midPoint)
            const secondHalf = values.slice(midPoint)
            const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
            const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length
            if (firstAvg !== 0) {
                // Avoid division by zero
                trend = ((secondAvg - firstAvg) / firstAvg) * 100
            }
        }
    }
    return {min, max, avg, trend, count: prices.length}
}

function getCurrentAndNextPrices(prices: EnergyRate[]) {
    const now = new Date()
    const sortedPrices = prices.sort((a, b) => new Date(a.valid_from).getTime() - new Date(b.valid_from).getTime())

    // Find current price (price period that contains current time)
    const currentPrice = sortedPrices.find((price) => {
        const validFrom = new Date(price.valid_from)
        const validTo = new Date(price.valid_to)
        return now >= validFrom && now < validTo
    })

    // Find next price (first price period after current time)
    const nextPrice = sortedPrices.find((price) => {
        const validFrom = new Date(price.valid_from)
        return validFrom > now
    })

    return {currentPrice, nextPrice}
}

function getCheapestPriceNext24Hours(prices: EnergyRate[]) {
    const now = new Date()
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // Filter prices for next 24 hours
    const next24HourPrices = prices.filter((price) => {
        const validFrom = new Date(price.valid_from)
        return validFrom >= now && validFrom <= next24Hours
    })

    if (next24HourPrices.length === 0) return null

    // Find the cheapest price
    return next24HourPrices.reduce((cheapest, current) => {
        return current.value_inc_vat < cheapest.value_inc_vat ? current : cheapest
    })
}

function getPriceColor(price: number) {
    if (price < 0) return "text-blue-600"
    if (price <= 15) return "text-green-600"
    if (price <= 30) return "text-yellow-600"
    return "text-red-600"
}

function getPriceBadgeVariant(price: number): "default" | "secondary" | "destructive" | "outline" {
    if (price < 0) return "default"
    if (price <= 15) return "secondary"
    if (price <= 30) return "outline"
    return "destructive"
}

export default async function EnergyPricesPage({searchParams}: PageProps) {
    const resolvedSearchParams = await searchParams
    const selectedDays = Number.parseInt(resolvedSearchParams.days || "3")
    const validDays = [1, 3, 7, 14, 30].includes(selectedDays) ? selectedDays : 3

    const allPrices = await getEnergyPrices(validDays)
    const filteredPrices = filterPricesByDateRange(allPrices)
    const groupedPrices = groupPricesByDay(allPrices)
    const overallStats = calculateStats(filteredPrices.filter((p) => new Date(p.valid_from) <= new Date())) // Calculate overall stats only on past/present data

    const todayDateString = new Date().toDateString()
    const tomorrowDateString = new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString()

    const tomorrowPrices = groupedPrices[tomorrowDateString] || []
    const hasAnyTomorrowPrices = tomorrowPrices.length > 0
    const hasPartialTomorrowPrices = hasAnyTomorrowPrices && tomorrowPrices.length < 46 // Assuming 48 is full, 46 is near full

    // Get current, next, and cheapest prices
    const {currentPrice, nextPrice} = getCurrentAndNextPrices(filteredPrices)
    const cheapestPrice = getCheapestPriceNext24Hours(filteredPrices)

    const timeRangeOptions = [
        {value: 1, label: "1 Day"},
        {value: 3, label: "3 Days"},
        {value: 7, label: "1 Week"},
        {value: 14, label: "2 Weeks"},
        {value: 30, label: "1 Month"},
    ]

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center gap-2 mb-6">
                <Zap className="h-8 w-8 text-yellow-500"/>
                <div>
                    <h1 className="text-3xl font-bold">Agile Price Dashboard</h1>
                    <p className="text-muted-foreground">Unofficial Agile Price Dashboard</p>
                </div>
            </div>

            {/* Current Price Information */}
            <Card className="border-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5"/>
                        Live Price Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Current Price */}
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-2">Current Price</p>
                            {currentPrice ? (
                                <>
                                    <p className={`text-3xl font-bold ${getPriceColor(currentPrice.value_inc_vat)}`}>
                                        {currentPrice.value_inc_vat.toFixed(2)}p
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(currentPrice.valid_from).toLocaleTimeString("en-GB", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}{" "}
                                        -{" "}
                                        {new Date(currentPrice.valid_to).toLocaleTimeString("en-GB", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                    <Badge variant={getPriceBadgeVariant(currentPrice.value_inc_vat)} className="mt-2">
                                        {currentPrice.value_inc_vat < 0
                                            ? "Negative"
                                            : currentPrice.value_inc_vat <= 15
                                                ? "Low"
                                                : currentPrice.value_inc_vat <= 30
                                                    ? "Medium"
                                                    : "High"}
                                    </Badge>
                                </>
                            ) : (
                                <p className="text-muted-foreground">No current price data</p>
                            )}
                        </div>

                        {/* Next Price */}
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-2">Next Price</p>
                            {nextPrice ? (
                                <>
                                    <p className={`text-3xl font-bold ${getPriceColor(nextPrice.value_inc_vat)}`}>
                                        {nextPrice.value_inc_vat.toFixed(2)}p
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(nextPrice.valid_from).toLocaleTimeString("en-GB", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}{" "}
                                        -{" "}
                                        {new Date(nextPrice.valid_to).toLocaleTimeString("en-GB", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                    <Badge variant={getPriceBadgeVariant(nextPrice.value_inc_vat)} className="mt-2">
                                        {nextPrice.value_inc_vat < 0
                                            ? "Negative"
                                            : nextPrice.value_inc_vat <= 15
                                                ? "Low"
                                                : nextPrice.value_inc_vat <= 30
                                                    ? "Medium"
                                                    : "High"}
                                    </Badge>
                                </>
                            ) : (
                                <p className="text-muted-foreground">No next price data</p>
                            )}
                        </div>

                        {/* Cheapest in Next 24 Hours */}
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-2">Cheapest Next 24h</p>
                            {cheapestPrice ? (
                                <>
                                    <p className={`text-3xl font-bold ${getPriceColor(cheapestPrice.value_inc_vat)}`}>
                                        {cheapestPrice.value_inc_vat.toFixed(2)}p
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(cheapestPrice.valid_from).toLocaleDateString("en-GB", {
                                            day: "numeric",
                                            month: "short",
                                        })}{" "}
                                        {new Date(cheapestPrice.valid_from).toLocaleTimeString("en-GB", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        -{" "}
                                        {new Date(cheapestPrice.valid_to).toLocaleTimeString("en-GB", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                    <Badge variant={getPriceBadgeVariant(cheapestPrice.value_inc_vat)} className="mt-2">
                                        Best Time
                                    </Badge>
                                </>
                            ) : (
                                <p className="text-muted-foreground">No price data available</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Today's Stats Cards */}
            {(() => {
                const todayPrices = groupedPrices[todayDateString] || []
                const todayStats = calculateStats(todayPrices)

                if (todayPrices.length === 0) return null

                return (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Today&apos;s Prices</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <PriceStatsCard
                                title="Today's Average"
                                value={`${todayStats.avg.toFixed(2)}p`}
                                description="Per kWh inc. VAT (Today)"
                                icon={<Zap className="h-4 w-4"/>}
                            />
                            <PriceStatsCard
                                title="Today's Minimum"
                                value={`${todayStats.min.toFixed(2)}p`}
                                description="Lowest price today"
                                icon={<TrendingDown className="h-4 w-4 text-green-500"/>}
                            />
                            <PriceStatsCard
                                title="Today's Maximum"
                                value={`${todayStats.max.toFixed(2)}p`}
                                description="Highest price today"
                                icon={<TrendingUp className="h-4 w-4 text-red-500"/>}
                            />
                            <PriceStatsCard
                                title="Today's Range"
                                value={`${(todayStats.max - todayStats.min).toFixed(2)}p`}
                                description="Price spread today"
                                icon={<CalendarDays className="h-4 w-4"/>}
                            />
                        </div>
                    </div>
                )
            })()}

            {/* Time Range Selector */}
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold">Historical Overview</h2>
                <div className="flex flex-wrap gap-2">
                    {timeRangeOptions.map((option) => (
                        <Button
                            key={option.value}
                            asChild
                            variant={validDays === option.value ? "default" : "outline"}
                            size="sm"
                        >
                            <Link href={`?days=${option.value}`}>
                                {option.label}
                            </Link>
                        </Button>
                    ))}
                </div>
            </div>

            {/* Period Stats Cards */}
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <PriceStatsCard
                        title="Period Average"
                        value={`${overallStats.avg.toFixed(2)}p`}
                        description={`Per kWh inc. VAT (Past ${validDays} ${validDays === 1 ? "Day" : "Days"})`}
                        icon={<Zap className="h-4 w-4"/>}
                    />
                    <PriceStatsCard
                        title="Period Minimum"
                        value={`${overallStats.min.toFixed(2)}p`}
                        description={`Lowest in ${validDays}-${validDays === 1 ? "day" : "day"} period`}
                        icon={<TrendingDown className="h-4 w-4 text-green-500"/>}
                    />
                    <PriceStatsCard
                        title="Period Maximum"
                        value={`${overallStats.max.toFixed(2)}p`}
                        description={`Highest in ${validDays}-${validDays === 1 ? "day" : "day"} period`}
                        icon={<TrendingUp className="h-4 w-4 text-red-500"/>}
                    />
                    <PriceStatsCard
                        title="Period Trend"
                        value={`${overallStats.trend > 0 ? "+" : ""}${overallStats.trend.toFixed(1)}%`}
                        description="Recent direction"
                        icon={
                            overallStats.trend > 0 ? (
                                <TrendingUp className="h-4 w-4 text-red-500"/>
                            ) : (
                                <TrendingDown className="h-4 w-4 text-green-500"/>
                            )
                        }
                    />
                </div>
            </div>

            {/* Status Badges */}
            <div className="flex gap-2 flex-wrap items-center">
                <Badge variant="outline" className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3"/>
                    {Object.keys(groupedPrices).filter((date) => date !== tomorrowDateString || hasAnyTomorrowPrices).length} days
                    of data displayed
                </Badge>
                {hasAnyTomorrowPrices && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-blue-500"/>
                        Tomorrow&apos;s prices available
                        {hasPartialTomorrowPrices && " (may be partial)"}
                    </Badge>
                )}
                {!hasAnyTomorrowPrices && (
                    <Badge variant="outline" className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3"/>
                        Tomorrow&apos;s prices usually after 4 PM
                    </Badge>
                )}
            </div>

            {/* Main Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Energy Price Trends</CardTitle>
                    <CardDescription>
                        Half-hourly electricity prices for the past {validDays} {validDays === 1 ? "day" : "days"}
                        {hasAnyTomorrowPrices ? " and available prices for tomorrow." : ". Check after 4 PM for tomorrow's prices."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Chart shows all fetched prices including potentially partial tomorrow */}
                    <EnergyPriceChart
                        prices={filteredPrices.filter((p) => {
                            const priceDate = new Date(p.valid_from)
                            // Include past days and tomorrow if it has any prices
                            return priceDate < new Date(Date.now() + 48 * 60 * 60 * 1000) // Show up to end of tomorrow
                        })}
                    />
                </CardContent>
            </Card>

            {/* Daily Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(() => {
                    const dayCards = []
                    const now = Date.now()
                    // Define the sequence of days we want to try and display
                    const daySequence = [
                        {dateString: tomorrowDateString, label: "Tomorrow", isFuture: true},
                        {dateString: todayDateString, label: "Today"},
                        {dateString: new Date(now - 24 * 60 * 60 * 1000).toDateString(), label: "Yesterday"},
                        {dateString: new Date(now - 2 * 24 * 60 * 60 * 1000).toDateString(), label: "2 Days Ago"},
                        {dateString: new Date(now - 3 * 24 * 60 * 60 * 1000).toDateString(), label: "3 Days Ago"},
                    ]

                    let cardsAdded = 0

                    for (const dayInfo of daySequence) {
                        if (cardsAdded >= 4) break

                        const dayPrices = groupedPrices[dayInfo.dateString]

                        if (dayInfo.isFuture) {
                            // Handle tomorrow specifically
                            if (hasAnyTomorrowPrices) {
                                const dayStats = calculateStats(dayPrices)
                                dayCards.push(
                                    <Card key={dayInfo.dateString}>
                                        <CardHeader>
                                            <CardTitle className="flex items-center justify-between">
                        <span>
                          {new Date(dayInfo.dateString).toLocaleDateString("en-GB", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                          })}
                        </span>
                                                <Badge variant="secondary">
                                                    {dayInfo.label}
                                                    {hasPartialTomorrowPrices && " (Partial)"}
                                                </Badge>
                                            </CardTitle>
                                            <CardDescription>
                                                {dayStats.count} price periods • Avg: {dayStats.avg.toFixed(2)}p/kWh
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <EnergyPriceChart prices={dayPrices} compact/>
                                            <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">Min</p>
                                                    <p className="font-semibold text-green-600">{dayStats.min.toFixed(2)}p</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Max</p>
                                                    <p className="font-semibold text-red-600">{dayStats.max.toFixed(2)}p</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Avg</p>
                                                    <p className="font-semibold">{dayStats.avg.toFixed(2)}p</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>,
                                )
                                cardsAdded++
                            } else {
                                // Tomorrow, but no prices yet
                                dayCards.push(
                                    <Card key={dayInfo.dateString} className="border-dashed">
                                        <CardHeader>
                                            <CardTitle className="flex items-center justify-between">
                        <span>
                          {new Date(dayInfo.dateString).toLocaleDateString("en-GB", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                          })}
                        </span>
                                                <Badge variant="outline">{dayInfo.label}</Badge>
                                            </CardTitle>
                                            <CardDescription>Tomorrow&apos;s prices are not yet
                                                available.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex flex-col items-center justify-center h-32">
                                            <Clock className="h-8 w-8 text-muted-foreground mb-2"/>
                                            <p className="text-muted-foreground text-center">
                                                Typically published after 4 PM. <br/> Please check back later.
                                            </p>
                                        </CardContent>
                                    </Card>,
                                )
                                cardsAdded++
                            }
                        } else if (dayPrices && dayPrices.length > 0) {
                            // For today and past days
                            const dayStats = calculateStats(dayPrices)
                            dayCards.push(
                                <Card key={dayInfo.dateString}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                      <span>
                        {new Date(dayInfo.dateString).toLocaleDateString("en-GB", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                        })}
                      </span>
                                            {dayInfo.dateString === todayDateString && <Badge>Today</Badge>}
                                        </CardTitle>
                                        <CardDescription>
                                            {dayStats.count} price periods • Avg: {dayStats.avg.toFixed(2)}p/kWh
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <EnergyPriceChart prices={dayPrices} compact/>
                                        <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                                            <div>
                                                <p className="text-muted-foreground">Min</p>
                                                <p className="font-semibold text-green-600">{dayStats.min.toFixed(2)}p</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Max</p>
                                                <p className="font-semibold text-red-600">{dayStats.max.toFixed(2)}p</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Avg</p>
                                                <p className="font-semibold">{dayStats.avg.toFixed(2)}p</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>,
                            )
                            cardsAdded++
                        }
                    }
                    return dayCards
                })()}
            </div>
        </div>
    )
}
