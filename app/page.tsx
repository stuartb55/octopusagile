import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import Link from "next/link"
import {Button} from "@/components/ui/button"
import {CalendarDays, TrendingUp, TrendingDown, Zap, Clock, Activity, AlertCircle} from "lucide-react"
import {EnergyPriceChart} from "./energy-price-chart"
import {PriceStatsCard} from "./price-stats-card"
import {PriceList} from "./price-list"

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
    timeZone: "Europe/London",
}

const londonDateShortMonthOptions: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
}

const londonFullDateDisplayOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
}

async function getEnergyPrices(days = 1): Promise<EnergyRate[]> {
    try {
        const now = new Date()

        // Fixed 30-minute revalidation (1800 seconds)
        const revalidateSeconds = 1800

        const daysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
        daysAgo.setHours(0, 0, 0, 0)

        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        tomorrow.setHours(23, 59, 59, 999)

        const periodFrom = daysAgo.toISOString()
        const periodTo = tomorrow.toISOString()

        let allResults: EnergyRate[] = []
        let nextUrl: string | null =
            `https://api.octopus.energy/v1/products/AGILE-24-10-01/electricity-tariffs/E-1R-AGILE-24-10-01-G/standard-unit-rates/?period_from=${periodFrom}&period_to=${periodTo}`

        while (nextUrl) {
            const response = await fetch(nextUrl, {
                next: {revalidate: revalidateSeconds},
            })

            if (!response.ok) {
                console.error(`Failed to fetch energy prices: ${response.status} ${response.statusText} from ${nextUrl}`)
                return []
            }

            const data: ApiResponse = await response.json()
            allResults = [...allResults, ...data.results]
            nextUrl = data.next

            if (allResults.length > 1500) {
                console.warn("Too many results, stopping pagination")
                break
            }
        }
        return allResults
    } catch (error) {
        console.error("Error fetching energy prices (general catch):", error)
        return []
    }
}

function filterPricesByDateRange(prices: EnergyRate[]) {
    return prices.sort((a, b) => new Date(a.valid_from).getTime() - new Date(b.valid_from).getTime())
}

function groupPricesByDay(prices: EnergyRate[]): Record<string, EnergyRate[]> {
    const grouped = prices.reduce(
        (acc, price) => {
            const dateKey = new Date(price.valid_from).toLocaleDateString("en-GB", londonFullDateDisplayOptions)
            if (!acc[dateKey]) {
                acc[dateKey] = []
            }
            acc[dateKey].push(price)
            return acc
        },
        {} as Record<string, EnergyRate[]>,
    )

    const filteredGrouped: Record<string, EnergyRate[]> = {}
    const tomorrowDateStringKey = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString(
        "en-GB",
        londonFullDateDisplayOptions,
    )

    Object.entries(grouped).forEach(([dateKey, dayPrices]) => {
        const sortedPrices = dayPrices.sort((a, b) => new Date(a.valid_from).getTime() - new Date(b.valid_from).getTime())

        if (dateKey === tomorrowDateStringKey) {
            if (sortedPrices.length > 0) {
                filteredGrouped[dateKey] = sortedPrices
            }
        } else if (sortedPrices.length >= 46) {
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
    const now = new Date()
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
    if (price < 0) return "text-blue-700"
    if (price <= 15) return "text-emerald-700"
    if (price <= 30) return "text-amber-700"
    return "text-red-700"
}

function getPriceBadgeVariant(price: number): "default" | "secondary" | "destructive" | "outline" {
    if (price < 0) return "default"
    if (price <= 15) return "secondary"
    if (price <= 30) return "outline"
    return "destructive"
}

function getPriceGradient(price: number) {
    if (price < 0) return "from-blue-600/30 to-blue-700/30"
    if (price <= 15) return "from-emerald-600/30 to-emerald-700/30"
    if (price <= 30) return "from-amber-600/30 to-amber-700/30"
    return "from-red-600/30 to-red-700/30"
}

export default async function EnergyPricesPage({searchParams}: PageProps) {
    const resolvedSearchParams = await searchParams
    const selectedDays = Number.parseInt(resolvedSearchParams.days || "3")
    const validDays = [1, 3, 7, 14, 30].includes(selectedDays) ? selectedDays : 3

    const allPrices = await getEnergyPrices(validDays)
    const filteredPrices = filterPricesByDateRange(allPrices)
    const groupedPrices = groupPricesByDay(allPrices)
    const overallStats = calculateStats(filteredPrices.filter((p) => new Date(p.valid_from) <= new Date()))

    const now = new Date()
    const todayDateStringKey = now.toLocaleDateString("en-GB", londonFullDateDisplayOptions)
    const tomorrowDateStringKey = new Date(now.getTime() + 24 * 60 * 60 * 1000).toLocaleDateString(
        "en-GB",
        londonFullDateDisplayOptions,
    )

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
        <div
            className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"
            role="main"
            aria-label="Energy pricing dashboard"
        >
            <div className="container mx-auto p-4 md:p-6 space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="relative">
                            <Zap className="h-10 w-10 text-yellow-500 animate-pulse"/>
                            <div className="absolute inset-0 h-10 w-10 text-yellow-500 animate-ping opacity-20">
                                <Zap className="h-10 w-10"/>
                            </div>
                        </div>
                        <div className="text-left">
                            <h1 className="text-4xl md:text-5xl font-bold text-slate-900">Agile Energy Dashboard</h1>
                            <p className="text-lg text-slate-600 font-medium">Real-time electricity pricing insights</p>
                        </div>
                    </div>
                </div>

                {/* Live Price Information */}
                <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-3 text-xl text-slate-900">
                            <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                                <Activity className="h-5 w-5 text-white"/>
                            </div>
                            Live Price Information
                            <Badge variant="secondary" className="ml-auto animate-pulse">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                                Live
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Current Price */}
                            <div
                                className={`relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${currentPrice ? getPriceGradient(currentPrice.value_inc_vat) : "from-slate-100 to-slate-200"} border border-slate-200/50`}
                            >
                                <div className="text-center space-y-3">
                                    <div role="region" aria-labelledby="current-price-heading">
                                        <p
                                            id="current-price-heading"
                                            className="text-sm font-medium text-slate-700 uppercase tracking-wide"
                                        >
                                            Current Price
                                        </p>
                                        {currentPrice ? (
                                            <>
                                                <div className="space-y-2">
                                                    <p className={`text-4xl md:text-5xl font-bold ${getPriceColor(currentPrice.value_inc_vat)}`}>
                                                        {currentPrice.value_inc_vat.toFixed(2)}
                                                        <span className="text-lg ml-1">p</span>
                                                    </p>
                                                    <p className="text-xs text-slate-700 font-medium">
                                                        {new Date(currentPrice.valid_from).toLocaleTimeString("en-GB", londonTimeOptions)} -{" "}
                                                        {new Date(currentPrice.valid_to).toLocaleTimeString("en-GB", londonTimeOptions)}
                                                    </p>
                                                </div>
                                                <Badge variant={getPriceBadgeVariant(currentPrice.value_inc_vat)}
                                                       className="font-medium">
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
                                            <div className="space-y-3">
                                                <AlertCircle className="h-8 w-8 text-slate-400 mx-auto"/>
                                                <p className="text-slate-700">No current price data</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Next Price */}
                            <div
                                className={`relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${nextPrice ? getPriceGradient(nextPrice.value_inc_vat) : "from-slate-100 to-slate-200"} border border-slate-200/50`}
                            >
                                <div className="text-center space-y-3">
                                    <div role="region" aria-labelledby="next-price-heading">
                                        <p id="next-price-heading"
                                           className="text-sm font-medium text-slate-700 uppercase tracking-wide">
                                            Next Price
                                        </p>
                                        {nextPrice ? (
                                            <>
                                                <div className="space-y-2">
                                                    <p className={`text-4xl md:text-5xl font-bold ${getPriceColor(nextPrice.value_inc_vat)}`}>
                                                        {nextPrice.value_inc_vat.toFixed(2)}
                                                        <span className="text-lg ml-1">p</span>
                                                    </p>
                                                    <p className="text-xs text-slate-700 font-medium">
                                                        {new Date(nextPrice.valid_from).toLocaleTimeString("en-GB", londonTimeOptions)} -{" "}
                                                        {new Date(nextPrice.valid_to).toLocaleTimeString("en-GB", londonTimeOptions)}
                                                    </p>
                                                </div>
                                                <Badge variant={getPriceBadgeVariant(nextPrice.value_inc_vat)}
                                                       className="font-medium">
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
                                            <div className="space-y-3">
                                                <Clock className="h-8 w-8 text-slate-400 mx-auto"/>
                                                <p className="text-slate-700">No next price data</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Cheapest Next 24h */}
                            <div
                                className={`relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${cheapestPrice ? getPriceGradient(cheapestPrice.value_inc_vat) : "from-slate-100 to-slate-200"} border border-slate-200/50`}
                            >
                                <div className="text-center space-y-3">
                                    <div role="region" aria-labelledby="cheapest-price-heading">
                                        <p
                                            id="cheapest-price-heading"
                                            className="text-sm font-medium text-slate-700 uppercase tracking-wide"
                                        >
                                            Cheapest Next 24h
                                        </p>
                                        {cheapestPrice ? (
                                            <>
                                                <div className="space-y-2">
                                                    <p className={`text-4xl md:text-5xl font-bold ${getPriceColor(cheapestPrice.value_inc_vat)}`}>
                                                        {cheapestPrice.value_inc_vat.toFixed(2)}
                                                        <span className="text-lg ml-1">p</span>
                                                    </p>
                                                    <div className="text-xs text-slate-700 font-medium space-y-1">
                                                        <p>
                                                            {new Date(cheapestPrice.valid_from).toLocaleDateString(
                                                                "en-GB",
                                                                londonDateShortMonthOptions,
                                                            )}{" "}
                                                            {new Date(cheapestPrice.valid_from).toLocaleTimeString("en-GB", londonTimeOptions)}
                                                        </p>
                                                        <p>- {new Date(cheapestPrice.valid_to).toLocaleTimeString("en-GB", londonTimeOptions)}</p>
                                                    </div>
                                                </div>
                                                <Badge variant="secondary"
                                                       className="bg-green-200 text-green-900 font-medium">
                                                    Best Time
                                                </Badge>
                                            </>
                                        ) : (
                                            <div className="space-y-3">
                                                <AlertCircle className="h-8 w-8 text-slate-400 mx-auto"/>
                                                <p className="text-slate-700">No price data available</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Today's Prices Stats */}
                {(() => {
                    const todayPrices = groupedPrices[todayDateStringKey] || []
                    const todayStats = calculateStats(todayPrices)

                    if (todayPrices.length === 0) return null

                    return (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500">
                                    <CalendarDays className="h-5 w-5 text-white"/>
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900">Today&apos;s Overview</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                                    icon={<TrendingDown className="h-4 w-4 text-emerald-500"/>}
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
                                    icon={<Activity className="h-4 w-4"/>}
                                />
                            </div>
                        </div>
                    )
                })()}

                {/* Time Range Selection */}
                <div
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                            <Activity className="h-5 w-5 text-white"/>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Historical Analysis</h2>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:ml-auto">
                        {timeRangeOptions.map((option) => (
                            <Button
                                key={option.value}
                                asChild
                                variant={validDays === option.value ? "default" : "outline"}
                                size="sm"
                                className={
                                    validDays === option.value
                                        ? "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                                        : ""
                                }
                            >
                                <Link href={`?days=${option.value}`}>{option.label}</Link>
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Historical Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                        icon={<TrendingDown className="h-4 w-4 text-emerald-500"/>}
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
                                <TrendingDown className="h-4 w-4 text-emerald-500"/>
                            )
                        }
                    />
                </div>

                {/* Status Badges */}
                <div className="flex gap-3 flex-wrap items-center justify-center">
                    <Badge
                        variant="outline"
                        className="flex items-center gap-2 px-4 py-2 text-slate-800 bg-white/95 backdrop-blur-sm border-slate-400"
                    >
                        <CalendarDays className="h-4 w-4"/>
                        {Object.keys(groupedPrices).filter((key) => key !== tomorrowDateStringKey || hasAnyTomorrowPrices).length}{" "}
                        days of data displayed
                    </Badge>
                    {hasAnyTomorrowPrices && (
                        <Badge variant="secondary"
                               className="flex items-center gap-2 px-4 py-2 bg-blue-200 text-blue-900">
                            <Zap className="h-4 w-4"/>
                            Tomorrow&apos;s prices available
                            {hasPartialTomorrowPrices && " (may be partial)"}
                        </Badge>
                    )}
                    {!hasAnyTomorrowPrices && (
                        <Badge
                            variant="outline"
                            className="flex items-center gap-2 px-4 py-2 text-slate-800 bg-white/95 backdrop-blur-sm border-slate-400"
                        >
                            <Clock className="h-4 w-4"/>
                            Tomorrow&apos;s prices usually after 4 PM
                        </Badge>
                    )}
                </div>

                {/* Main Chart */}
                <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-slate-900">
                            <div className="p-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500">
                                <Activity className="h-5 w-5 text-white"/>
                            </div>
                            Energy Price Trends
                        </CardTitle>
                        <CardDescription className="text-base text-slate-700">
                            Half-hourly electricity prices for the past {validDays} {validDays === 1 ? "day" : "days"}
                            {hasAnyTomorrowPrices
                                ? " and available prices for tomorrow."
                                : ". Check after 4 PM for tomorrow's prices."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <EnergyPriceChart
                            prices={filteredPrices.filter((p) => {
                                const priceDate = new Date(p.valid_from)
                                return priceDate < new Date(Date.now() + 48 * 60 * 60 * 1000)
                            })}
                        />
                    </CardContent>
                </Card>

                {/* Daily Breakdown Cards */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500">
                            <CalendarDays className="h-5 w-5 text-white"/>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">Daily Breakdown</h2>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {(() => {
                            const dayCards = []
                            const nowForSequence = new Date()

                            const daySequence = [
                                {dateStringKey: tomorrowDateStringKey, label: "Tomorrow", isFuture: true},
                                {dateStringKey: todayDateStringKey, label: "Today"},
                                {
                                    dateStringKey: new Date(nowForSequence.getTime() - 24 * 60 * 60 * 1000).toLocaleDateString(
                                        "en-GB",
                                        londonFullDateDisplayOptions,
                                    ),
                                    label: "Yesterday",
                                },
                                {
                                    dateStringKey: new Date(nowForSequence.getTime() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString(
                                        "en-GB",
                                        londonFullDateDisplayOptions,
                                    ),
                                    label: "2 Days Ago",
                                },
                            ]

                            let cardsAdded = 0

                            for (const dayInfo of daySequence) {
                                if (cardsAdded >= 4) break

                                const dayPrices = groupedPrices[dayInfo.dateStringKey]

                                if (dayInfo.isFuture) {
                                    if (hasAnyTomorrowPrices) {
                                        const dayStats = calculateStats(tomorrowPrices)
                                        dayCards.push(
                                            <Card
                                                key={dayInfo.dateStringKey}
                                                className="border-0 shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden"
                                            >
                                                <CardHeader
                                                    className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-b border-blue-200/50">
                                                    <CardTitle
                                                        className="flex items-center justify-between text-slate-900">
                                                        <span className="text-lg">{dayInfo.dateStringKey}</span>
                                                        <Badge variant="secondary"
                                                               className="bg-blue-100 text-blue-800">
                                                            {dayInfo.label}
                                                            {hasPartialTomorrowPrices && " (Partial)"}
                                                        </Badge>
                                                    </CardTitle>
                                                    <CardDescription className="text-base text-slate-700">
                                                        {dayStats.count} price periods • Avg: {dayStats.avg.toFixed(2)}p/kWh
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="p-6">
                                                    <EnergyPriceChart prices={tomorrowPrices} compact/>
                                                    <div className="grid grid-cols-3 gap-4 mt-6">
                                                        <div className="text-center p-3 rounded-lg bg-emerald-50">
                                                            <p className="text-sm text-emerald-700 font-medium">Min</p>
                                                            <p className="text-xl font-bold text-emerald-800">{dayStats.min.toFixed(2)}p</p>
                                                        </div>
                                                        <div className="text-center p-3 rounded-lg bg-red-50">
                                                            <p className="text-sm text-red-700 font-medium">Max</p>
                                                            <p className="text-xl font-bold text-red-800">{dayStats.max.toFixed(2)}p</p>
                                                        </div>
                                                        <div className="text-center p-3 rounded-lg bg-slate-50">
                                                            <p className="text-sm text-slate-700 font-medium">Avg</p>
                                                            <p className="text-xl font-bold text-slate-800">{dayStats.avg.toFixed(2)}p</p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-6">
                                                        <PriceList prices={tomorrowPrices} title="Tomorrow"
                                                                   isToday={false}/>
                                                    </div>
                                                </CardContent>
                                            </Card>,
                                        )
                                        cardsAdded++
                                    } else {
                                        dayCards.push(
                                            <Card
                                                key={dayInfo.dateStringKey}
                                                className="border-2 border-dashed border-slate-300 bg-white/50 backdrop-blur-sm"
                                            >
                                                <CardHeader className="text-center">
                                                    <CardTitle
                                                        className="flex items-center justify-between text-slate-900">
                                                        <span className="text-lg">{dayInfo.dateStringKey}</span>
                                                        <Badge variant="outline">{dayInfo.label}</Badge>
                                                    </CardTitle>
                                                    <CardDescription className="text-slate-700">
                                                        Tomorrow&apos;s prices are not yet available.
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent
                                                    className="flex flex-col items-center justify-center py-12">
                                                    <div className="p-4 rounded-full bg-slate-100 mb-4">
                                                        <Clock className="h-8 w-8 text-slate-400"/>
                                                    </div>
                                                    <p className="text-slate-700 text-center max-w-sm">
                                                        Typically published after 4 PM. <br/> Please check back later.
                                                    </p>
                                                </CardContent>
                                            </Card>,
                                        )
                                        cardsAdded++
                                    }
                                } else if (dayPrices && dayPrices.length > 0) {
                                    const dayStats = calculateStats(dayPrices)
                                    dayCards.push(
                                        <Card
                                            key={dayInfo.dateStringKey}
                                            className="border-0 shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden"
                                        >
                                            <CardHeader
                                                className="bg-gradient-to-r from-slate-500/10 to-slate-600/10 border-b border-slate-200/50">
                                                <CardTitle className="flex items-center justify-between text-slate-900">
                                                    <span className="text-lg">{dayInfo.dateStringKey}</span>
                                                    {dayInfo.dateStringKey === todayDateStringKey && (
                                                        <Badge className="bg-green-100 text-green-800">Today</Badge>
                                                    )}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-6">
                                                <EnergyPriceChart prices={dayPrices} compact/>
                                                <div className="grid grid-cols-3 gap-4 mt-6">
                                                    <div className="text-center p-3 rounded-lg bg-emerald-50">
                                                        <p className="text-sm text-emerald-700 font-medium">Min</p>
                                                        <p className="text-xl font-bold text-emerald-800">{dayStats.min.toFixed(2)}p</p>
                                                    </div>
                                                    <div className="text-center p-3 rounded-lg bg-red-50">
                                                        <p className="text-sm text-red-700 font-medium">Max</p>
                                                        <p className="text-xl font-bold text-red-800">{dayStats.max.toFixed(2)}p</p>
                                                    </div>
                                                    <div className="text-center p-3 rounded-lg bg-slate-50">
                                                        <p className="text-sm text-slate-700 font-medium">Avg</p>
                                                        <p className="text-xl font-bold text-slate-800">{dayStats.avg.toFixed(2)}p</p>
                                                    </div>
                                                </div>
                                                <div className="mt-6">
                                                    <PriceList
                                                        prices={dayPrices}
                                                        title={dayInfo.dateStringKey === todayDateStringKey ? "Today" : dayInfo.label}
                                                        isToday={dayInfo.dateStringKey === todayDateStringKey}
                                                    />
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
            </div>
        </div>
    )
}
