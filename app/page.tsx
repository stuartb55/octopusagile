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

// Options for formatting dates and times in London timezone
const londonTimeOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London"
};

const londonDateShortMonthOptions: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    timeZone: "Europe/London"
};

const londonFullDateDisplayOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London"
};


async function getEnergyPrices(days = 1): Promise<EnergyRate[]> {
    try {
        const now = new Date();
        const currentHour = now.getHours(); // Server's local hour

        let revalidateSeconds;
        if (currentHour >= 15 && currentHour < 17) { // This logic is based on server time, usually UTC for Octopus API updates
            revalidateSeconds = 30;
        } else {
            revalidateSeconds = 3000;
        }

        // Fetch data from specified days ago up to the end of tomorrow (UTC based for API query)
        const daysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        daysAgo.setHours(0, 0, 0, 0); // Start of specified days ago (server time)

        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        tomorrow.setHours(23, 59, 59, 999); // End of tomorrow (server time)

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
    // Sorts by absolute time, which is correct.
    return prices.sort((a, b) => new Date(a.valid_from).getTime() - new Date(b.valid_from).getTime())
}

function groupPricesByDay(prices: EnergyRate[]): Record<string, EnergyRate[]> {
    const grouped = prices.reduce(
        (acc, price) => {
            // Use London-specific date string for grouping
            const dateKey = new Date(price.valid_from).toLocaleDateString("en-GB", londonFullDateDisplayOptions);
            if (!acc[dateKey]) {
                acc[dateKey] = []
            }
            acc[dateKey].push(price)
            return acc
        },
        {} as Record<string, EnergyRate[]>,
    )

    const filteredGrouped: Record<string, EnergyRate[]> = {}
    // Get tomorrow's date string as it will be in London, using the same format as keys
    const tomorrowDateStringKey = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", londonFullDateDisplayOptions);

    Object.entries(grouped).forEach(([dateKey, dayPrices]) => {
        const sortedPrices = dayPrices.sort((a, b) => new Date(a.valid_from).getTime() - new Date(b.valid_from).getTime())

        if (dateKey === tomorrowDateStringKey) {
            if (sortedPrices.length > 0) {
                filteredGrouped[dateKey] = sortedPrices
            }
        } else if (sortedPrices.length >= 46) { // For past/today London days
            filteredGrouped[dateKey] = sortedPrices
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
                trend = ((secondAvg - firstAvg) / firstAvg) * 100
            }
        }
    }
    return {min, max, avg, trend, count: prices.length}
}

function getCurrentAndNextPrices(prices: EnergyRate[]) {
    const now = new Date() // Current absolute time
    const sortedPrices = prices.sort((a, b) => new Date(a.valid_from).getTime() - new Date(b.valid_from).getTime())

    const currentPrice = sortedPrices.find((price) => {
        const validFrom = new Date(price.valid_from)
        const validTo = new Date(price.valid_to)
        return now >= validFrom && now < validTo
    })

    const nextPrice = sortedPrices.find((price) => {
        const validFrom = new Date(price.valid_from)
        return validFrom > now
    })

    return {currentPrice, nextPrice}
}

function getCheapestPriceNext24Hours(prices: EnergyRate[]) {
    const now = new Date()
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const next24HourPrices = prices.filter((price) => {
        const validFrom = new Date(price.valid_from)
        return validFrom >= now && validFrom <= next24Hours
    })

    if (next24HourPrices.length === 0) return null

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
    const filteredPrices = filterPricesByDateRange(allPrices) // Sorted by absolute time
    const groupedPrices = groupPricesByDay(allPrices) // Keys are London date strings
    // overallStats are calculated on prices up to the current absolute moment, which is correct
    const overallStats = calculateStats(filteredPrices.filter((p) => new Date(p.valid_from) <= new Date()))

    const now = new Date();
    // Generate date strings for today and tomorrow in London timezone, matching groupPrice keys
    const todayDateStringKey = now.toLocaleDateString("en-GB", londonFullDateDisplayOptions);
    const tomorrowDateStringKey = new Date(now.getTime() + 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", londonFullDateDisplayOptions);

    const tomorrowPrices = groupedPrices[tomorrowDateStringKey] || []
    const hasAnyTomorrowPrices = tomorrowPrices.length > 0
    const hasPartialTomorrowPrices = hasAnyTomorrowPrices && tomorrowPrices.length < 46

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

            <Card className="border-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5"/>
                        Live Price Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-2">Current Price</p>
                            {currentPrice ? (
                                <>
                                    <p className={`text-3xl font-bold ${getPriceColor(currentPrice.value_inc_vat)}`}>
                                        {currentPrice.value_inc_vat.toFixed(2)}p
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(currentPrice.valid_from).toLocaleTimeString("en-GB", londonTimeOptions)}{" "}
                                        -{" "}
                                        {new Date(currentPrice.valid_to).toLocaleTimeString("en-GB", londonTimeOptions)}
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

                        <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-2">Next Price</p>
                            {nextPrice ? (
                                <>
                                    <p className={`text-3xl font-bold ${getPriceColor(nextPrice.value_inc_vat)}`}>
                                        {nextPrice.value_inc_vat.toFixed(2)}p
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(nextPrice.valid_from).toLocaleTimeString("en-GB", londonTimeOptions)}{" "}
                                        -{" "}
                                        {new Date(nextPrice.valid_to).toLocaleTimeString("en-GB", londonTimeOptions)}
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

                        <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-2">Cheapest Next 24h</p>
                            {cheapestPrice ? (
                                <>
                                    <p className={`text-3xl font-bold ${getPriceColor(cheapestPrice.value_inc_vat)}`}>
                                        {cheapestPrice.value_inc_vat.toFixed(2)}p
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(cheapestPrice.valid_from).toLocaleDateString("en-GB", londonDateShortMonthOptions)}{" "}
                                        {new Date(cheapestPrice.valid_from).toLocaleTimeString("en-GB", londonTimeOptions)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        -{" "}
                                        {new Date(cheapestPrice.valid_to).toLocaleTimeString("en-GB", londonTimeOptions)}
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

            {(() => {
                const todayPrices = groupedPrices[todayDateStringKey] || [] // Use London-specific key
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

            <div className="flex gap-2 flex-wrap items-center">
                <Badge variant="outline" className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3"/>
                    {/* Filter out tomorrow's key if no prices for it, to count displayed days correctly */}
                    {Object.keys(groupedPrices).filter(key => key !== tomorrowDateStringKey || hasAnyTomorrowPrices).length} days
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

            <Card>
                <CardHeader>
                    <CardTitle>Energy Price Trends</CardTitle>
                    <CardDescription>
                        Half-hourly electricity prices for the past {validDays} {validDays === 1 ? "day" : "days"}
                        {hasAnyTomorrowPrices ? " and available prices for tomorrow." : ". Check after 4 PM for tomorrow's prices."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <EnergyPriceChart
                        prices={filteredPrices.filter((p) => {
                            const priceDate = new Date(p.valid_from)
                            return priceDate < new Date(Date.now() + 48 * 60 * 60 * 1000) // Show up to end of tomorrow (absolute time)
                        })}
                    />
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(() => {
                    const dayCards = []
                    const nowForSequence = new Date(); // Current absolute time

                    // Define the sequence of London day keys we want to try and display
                    const daySequence = [
                        {dateStringKey: tomorrowDateStringKey, label: "Tomorrow", isFuture: true},
                        {dateStringKey: todayDateStringKey, label: "Today"},
                        {
                            dateStringKey: new Date(nowForSequence.getTime() - 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", londonFullDateDisplayOptions),
                            label: "Yesterday"
                        },
                        {
                            dateStringKey: new Date(nowForSequence.getTime() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", londonFullDateDisplayOptions),
                            label: "2 Days Ago"
                        },
                        {
                            dateStringKey: new Date(nowForSequence.getTime() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", londonFullDateDisplayOptions),
                            label: "3 Days Ago"
                        },
                    ]

                    let cardsAdded = 0

                    for (const dayInfo of daySequence) {
                        if (cardsAdded >= 4) break

                        // Use the London-specific dateStringKey to look up prices
                        const dayPrices = groupedPrices[dayInfo.dateStringKey]

                        if (dayInfo.isFuture) {
                            if (hasAnyTomorrowPrices) { // tomorrowPrices are already fetched using tomorrowDateStringKey
                                const dayStats = calculateStats(tomorrowPrices) // Use tomorrowPrices directly
                                dayCards.push(
                                    <Card key={dayInfo.dateStringKey}>
                                        <CardHeader>
                                            <CardTitle className="flex items-center justify-between">
                                                {/* Display the pre-formatted London date string key */}
                                                <span>{dayInfo.dateStringKey}</span>
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
                                            <EnergyPriceChart prices={tomorrowPrices} compact/>
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
                                dayCards.push(
                                    <Card key={dayInfo.dateStringKey} className="border-dashed">
                                        <CardHeader>
                                            <CardTitle className="flex items-center justify-between">
                                                {/* Display the pre-formatted London date string key */}
                                                <span>{dayInfo.dateStringKey}</span>
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
                        } else if (dayPrices && dayPrices.length > 0) { // For today and past London days
                            const dayStats = calculateStats(dayPrices)
                            dayCards.push(
                                <Card key={dayInfo.dateStringKey}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            {/* Display the pre-formatted London date string key */}
                                            <span>{dayInfo.dateStringKey}</span>
                                            {dayInfo.dateStringKey === todayDateStringKey && <Badge>Today</Badge>}
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