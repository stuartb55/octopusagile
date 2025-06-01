"use client"

import {XAxis, YAxis, Area, AreaChart, Cell, Bar, BarChart, ResponsiveContainer} from "recharts"
import {ChartContainer, ChartTooltip} from "@/components/ui/chart"

interface EnergyRate {
    value_exc_vat: number
    value_inc_vat: number
    valid_from: string
    valid_to: string
}

interface EnergyPriceChartProps {
    prices: EnergyRate[]
    compact?: boolean
}

interface ChartDatapoint {
    time: string
    price: number
    timestamp: number
    date: string
    color: string
    category: string
}

interface TooltipPayloadItem {
    payload: ChartDatapoint
    name?: string
    value?: number | string
    color?: string
    dataKey?: string
}

interface CustomTooltipProps {
    active?: boolean
    payload?: TooltipPayloadItem[]
    label?: string | number
}

export function EnergyPriceChart({prices, compact = false}: EnergyPriceChartProps) {
    const chartData: ChartDatapoint[] = prices.map((price) => {
        let color = "#ef4444" // red default
        let category = "High"

        if (price.value_inc_vat < 0) {
            color = "#3b82f6" // blue for negative
            category = "Negative"
        } else if (price.value_inc_vat <= 15) {
            color = "#10b981" // emerald for 0-15
            category = "Low"
        } else if (price.value_inc_vat <= 30) {
            color = "#f59e0b" // amber for 15-30
            category = "Medium"
        }

        return {
            time: new Date(price.valid_from).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                day: compact ? undefined : "2-digit",
                month: compact ? undefined : "short",
            }),
            price: Math.round(price.value_inc_vat * 100) / 100,
            timestamp: new Date(price.valid_from).getTime(),
            date: new Date(price.valid_from).toDateString(),
            color: color,
            category: category,
        }
    })

    const chartConfig = {
        price: {
            label: "Price (p/kWh)",
            color: "hsl(var(--chart-1))",
        },
        negative: {
            label: "Negative (< 0p)",
            color: "#3b82f6",
        },
        low: {
            label: "Low (0-15p)",
            color: "#10b981",
        },
        medium: {
            label: "Medium (15-30p)",
            color: "#f59e0b",
        },
        high: {
            label: "High (> 30p)",
            color: "#ef4444",
        },
    }

    const CustomTooltip = ({active, payload}: CustomTooltipProps) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload
            return (
                <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl p-4 shadow-xl">
                    <div className="space-y-2">
                        <p className="font-semibold text-slate-900">
                            {new Date(data.timestamp).toLocaleString("en-GB", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </p>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{backgroundColor: data.color}}/>
                            <span className="text-sm text-slate-600">Price:</span>
                            <span className="font-bold text-lg" style={{color: data.color}}>
                {data.price.toFixed(2)}p/kWh
              </span>
                        </div>
                        <div className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-md">{data.category} Price
                            Range
                        </div>
                    </div>
                </div>
            )
        }
        return null
    }

    const CustomLegend = () => (
        <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"/>
                <span className="text-slate-700">Negative (&lt; 0p)</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"/>
                <span className="text-slate-700">Low (0-15p)</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"/>
                <span className="text-slate-700">Medium (15-30p)</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"/>
                <span className="text-slate-700">High (&gt; 30p)</span>
            </div>
        </div>
    )

    if (compact) {
        return (
            <div className="w-full">
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{top: 10, right: 10, left: 10, bottom: 10}}>
                            <defs>
                                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="time"
                                tick={{fontSize: 10, fill: "#475569"}}
                                interval="preserveStartEnd"
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{fontSize: 10, fill: "#475569"}}
                                domain={[(dataMin: number) => Math.floor(dataMin - 1), (dataMax: number) => Math.ceil(dataMax + 1)]}
                                axisLine={false}
                                tickLine={false}
                            />
                            <ChartTooltip content={<CustomTooltip/>}/>
                            <Area
                                type="monotone"
                                dataKey="price"
                                stroke="#10b981"
                                fill="url(#priceGradient)"
                                strokeWidth={2}
                                dot={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </div>
        )
    }

    return (
        <div className="w-full space-y-4">
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{top: 20, right: 20, left: 20, bottom: 20}}>
                        <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopOpacity={0.9}/>
                                <stop offset="100%" stopOpacity={0.6}/>
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="time"
                            tick={{fontSize: 9, fill: "#475569"}}
                            interval="preserveStartEnd"
                            axisLine={false}
                            tickLine={false}
                            angle={-45}
                            textAnchor="end"
                        />
                        <YAxis
                            tick={{fontSize: 11, fill: "#475569"}}
                            label={{
                                value: "Price (p/kWh)",
                                angle: -90,
                                position: "insideLeft",
                                style: {textAnchor: "middle", fill: "#475569"},
                            }}
                            domain={[(dataMin: number) => Math.floor(dataMin - 2), (dataMax: number) => Math.ceil(dataMax + 2)]}
                            axisLine={false}
                            tickLine={false}
                        />
                        <ChartTooltip content={<CustomTooltip/>}/>
                        <Bar dataKey="price" radius={[2, 2, 0, 0]} fill="url(#barGradient)">
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color}/>
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
            {!compact && <CustomLegend/>}
        </div>
    )
}
