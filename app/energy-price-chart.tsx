"use client"

import {XAxis, YAxis, Area, AreaChart, Cell, Bar, BarChart} from "recharts"
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

export function EnergyPriceChart({prices, compact = false}: EnergyPriceChartProps) {
    const chartData = prices.map((price) => {
        let color = "#ef4444" // red default
        if (price.value_inc_vat < 0) {
            color = "#3b82f6" // blue for negative
        } else if (price.value_inc_vat <= 15) {
            color = "#22c55e" // green for 0-15
        } else if (price.value_inc_vat <= 30) {
            color = "#eab308" // yellow for 15-30
        }
        // over 30 stays red

        return {
            time: new Date(price.valid_from).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                day: compact ? undefined : "2-digit",
                month: compact ? undefined : "short",
            }),
            price: price.value_inc_vat,
            timestamp: new Date(price.valid_from).getTime(),
            date: new Date(price.valid_from).toDateString(),
            color: color,
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
            color: "#22c55e",
        },
        medium: {
            label: "Medium (15-30p)",
            color: "#eab308",
        },
        high: {
            label: "High (> 30p)",
            color: "#ef4444",
        },
    }

    const CustomTooltip = ({active, payload, label}: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload
            return (
                <div className="bg-background border rounded-lg p-3 shadow-lg">
                    <p className="font-medium">{new Date(data.timestamp).toLocaleString("en-GB")}</p>
                    <p className="text-sm text-muted-foreground">
                        Price: <span className="font-semibold text-foreground">{data.price.toFixed(2)}p/kWh</span>
                    </p>
                </div>
            )
        }
        return null
    }

    if (compact) {
        return (
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <AreaChart data={chartData}>
                    <XAxis dataKey="time" tick={{fontSize: 10}} interval="preserveStartEnd"/>
                    <YAxis tick={{fontSize: 10}} domain={["dataMin - 1", "dataMax + 1"]}/>
                    <ChartTooltip content={<CustomTooltip/>}/>
                    <Area type="monotone" dataKey="price" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2}
                          strokeWidth={2}/>
                </AreaChart>
            </ChartContainer>
        )
    }

    return (
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <BarChart data={chartData}>
                <XAxis dataKey="time" tick={{fontSize: 12}} interval="preserveStartEnd"/>
                <YAxis
                    tick={{fontSize: 12}}
                    label={{value: "Price (p/kWh)", angle: -90, position: "insideLeft"}}
                    domain={["dataMin - 2", "dataMax + 2"]}
                />
                <ChartTooltip content={<CustomTooltip/>}/>
                <Bar dataKey="price" radius={[1, 1, 0, 0]}>
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color}/>
                    ))}
                </Bar>
            </BarChart>
        </ChartContainer>
    )
}
