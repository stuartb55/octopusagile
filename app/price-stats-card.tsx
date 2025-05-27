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
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-sm text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    )
}
