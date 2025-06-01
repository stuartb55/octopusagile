"use client"

import React, {useState, useEffect, useRef} from "react"
import {Badge} from "@/components/ui/badge" // Assuming this is from shadcn/ui or similar
import {Clock, Zap} from "lucide-react"

interface EnergyRate {
    value_exc_vat: number
    value_inc_vat: number
    valid_from: string
    valid_to: string
}

interface PriceListProps {
    prices: EnergyRate[]
    title: string
    isToday?: boolean
}

// --- Utility Functions (unchanged, well-defined) ---
function getPriceColor(price: number): string {
    if (price < 0) return "text-blue-700"
    if (price <= 15) return "text-emerald-700"
    if (price <= 30) return "text-amber-700"
    return "text-red-700"
}

function getPriceBadgeVariant(price: number): "default" | "secondary" | "destructive" | "outline" {
    if (price < 0) return "default" // Consider a specific variant for negative if 'default' isn't distinct
    if (price <= 15) return "secondary"
    if (price <= 30) return "outline"
    return "destructive"
}

function getPriceBackground(price: number): string {
    if (price < 0) return "bg-blue-50 border-blue-200"
    if (price <= 15) return "bg-emerald-50 border-emerald-200"
    if (price <= 30) return "bg-amber-50 border-amber-200"
    return "bg-red-50 border-red-200"
}

// --- Date/Time Formatting Options ---
const TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London", // Ensuring British English context
};

const SHORT_DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
};

const LONG_DAY_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/London",
};

// --- Sub-components ---

interface DayHeaderProps {
    date: Date;
    isFirstInList: boolean;
}

function DayHeader({date, isFirstInList}: DayHeaderProps) {
    return (
        <div className={`${isFirstInList ? 'mb-2' : 'mt-4 pt-3 border-t border-slate-200'}`}>
            <div className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md inline-block">
                {date.toLocaleDateString("en-GB", LONG_DAY_FORMAT_OPTIONS)}
            </div>
        </div>
    );
}

interface PriceListItemProps {
    priceData: EnergyRate;
    isCurrent: boolean;
}

function PriceListItem({priceData, isCurrent}: PriceListItemProps) {
    const validFrom = new Date(priceData.valid_from);
    const validTo = new Date(priceData.valid_to);

    return (
        <div
            className={`
        relative p-3 rounded-lg border transition-all duration-200 hover:shadow-md
        ${getPriceBackground(priceData.value_inc_vat)}
        ${isCurrent ? "ring-2 ring-blue-500 ring-offset-2 shadow-lg scale-[1.02]" : "border-slate-200"}
      `}
        >
            {isCurrent && (
                <div className="absolute -top-2 -right-2 z-10">
                    <Badge className="bg-blue-600 text-white animate-pulse shadow-md">
                        <Zap className="h-3 w-3 mr-1"/>
                        LIVE
                    </Badge>
                </div>
            )}
            <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0"> {/* min-w-0 helps flexbox handle potential overflow/truncation */}
                    <div
                        className="flex items-center gap-2 mb-1 flex-wrap"> {/* flex-wrap allows time/badge to wrap if needed */}
                        <span className="text-sm font-medium text-slate-700">
              {validFrom.toLocaleTimeString("en-GB", TIME_FORMAT_OPTIONS)}
                            {" - "}
                            {validTo.toLocaleTimeString("en-GB", TIME_FORMAT_OPTIONS)}
            </span>
                        {isCurrent && (
                            <Badge variant="secondary" className="text-xs whitespace-nowrap">
                                Current
                            </Badge>
                        )}
                    </div>
                    <div className="text-xs text-slate-600">
                        {validFrom.toLocaleDateString("en-GB", SHORT_DATE_FORMAT_OPTIONS)}
                    </div>
                </div>
                <div
                    className="text-right pl-2 flex-shrink-0"> {/* flex-shrink-0 to prevent price from shrinking too much */}
                    <div className={`text-xl font-bold ${getPriceColor(priceData.value_inc_vat)}`}>
                        {priceData.value_inc_vat.toFixed(2)}
                        <span className="text-sm ml-1">p</span>
                    </div>
                    <Badge variant={getPriceBadgeVariant(priceData.value_inc_vat)} className="text-xs mt-1">
                        {priceData.value_inc_vat < 0
                            ? "Negative"
                            : priceData.value_inc_vat <= 15
                                ? "Low"
                                : priceData.value_inc_vat <= 30
                                    ? "Medium"
                                    : "High"}
                    </Badge>
                </div>
            </div>
        </div>
    );
}

// --- Main PriceList Component ---
export function PriceList({prices, title, isToday = false}: PriceListProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const nowRef = useRef(new Date()); // Use ref for 'now' to keep it stable unless specifically updated

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            {threshold: 0.1},
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    if (!isVisible) {
        return (
            <div ref={containerRef} className="h-32 flex items-center justify-center" aria-live="polite">
                <div className="animate-pulse text-slate-500">Loading price list...</div>
            </div>
        );
    }

    const sortedPrices = [...prices].sort((a, b) => new Date(a.valid_from).getTime() - new Date(b.valid_from).getTime());

    const currentPriceIndex = isToday
        ? sortedPrices.findIndex((price) => {
            const validFrom = new Date(price.valid_from);
            const validTo = new Date(price.valid_to);
            return nowRef.current >= validFrom && nowRef.current < validTo;
        })
        : -1;

    const displayPrices = showAll ? sortedPrices : sortedPrices.slice(0, 12);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2"> {/* Changed h4 to h3 for semantic heading */}
                    <Clock className="h-5 w-5 text-slate-700"/> {/* Slightly larger icon */}
                    {title}
                </h3>
                <Badge variant="outline" className="text-xs">
                    {sortedPrices.length} periods
                </Badge>
            </div>

            {displayPrices.length > 0 ? (
                <div
                    className="space-y-2 max-h-[30rem] overflow-y-auto pr-1"> {/* Increased max-h, added pr for scrollbar */}
                    {displayPrices.map((price, loopIndex) => {
                        const validFromDate = new Date(price.valid_from);
                        const isCurrentPrice = isToday && sortedPrices[currentPriceIndex] === price;

                        const showDayHeader = loopIndex === 0 ||
                            (displayPrices[loopIndex - 1] &&
                                new Date(displayPrices[loopIndex - 1].valid_from).toDateString() !== validFromDate.toDateString());

                        // Use a more robust key if valid_from and valid_to might not be unique enough in some edge cases
                        const itemKey = `${price.valid_from}-${price.valid_to}-${loopIndex}`;

                        return (
                            <React.Fragment key={itemKey}>
                                {showDayHeader && (
                                    <DayHeader
                                        date={validFromDate}
                                        isFirstInList={loopIndex === 0}
                                    />
                                )}
                                <div
                                    className={`${showDayHeader && loopIndex > 0 ? 'mt-2' : ''} ${loopIndex === 0 && !showDayHeader ? '' : 'mt-1'}`}>
                                    <PriceListItem
                                        priceData={price}
                                        isCurrent={isCurrentPrice}
                                    />
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>
            ) : (
                <div className="text-sm text-slate-600 py-4 text-center">
                    No price data available.
                </div>
            )}


            {sortedPrices.length > 12 && (
                <div className="text-center pt-3">
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-3 py-1"
                        aria-expanded={showAll}
                    >
                        {showAll ? "Show Less" : `Show All ${sortedPrices.length} Periods`}
                    </button>
                </div>
            )}
        </div>
    );
}