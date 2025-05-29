import type React from "react"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"

interface PriceStatsCardProps {
    title: string
    value: string
    description: string
    icon: React.ReactNode
}

export function PriceStatsCard({title, value, description, icon}: PriceStatsCardProps) {
    return (
        <Card
            className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:scale-105 group focus-within:ring-4 focus-within:ring-blue-300 focus-within:outline-none"
            role="region"
            aria-labelledby={`stats-${title.replace(/\s+/g, "-").toLowerCase()}`}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle
                    id={`stats-${title.replace(/\s+/g, "-").toLowerCase()}`}
                    className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 transition-colors"
                >
                    {title}
                </CardTitle>
                <div
                    className="p-2 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 group-hover:from-blue-100 group-hover:to-indigo-100 transition-all duration-200">
                    {icon}
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-slate-900 mb-1 transition-colors">
                    {value}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{description}</p>
            </CardContent>
        </Card>
    )
}
