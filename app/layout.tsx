import type React from "react"
import type {Metadata} from "next"
import {Geist, Geist_Mono} from "next/font/google"
import "./globals.css"
import { ErrorBoundary } from "@/components/error-boundary"

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
})

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
})

export const metadata: Metadata = {
    title: "Octopus Agile Electricity Prices",
    description: "Octopus Agile electricity prices",
    metadataBase: new URL("https://octopusagile.co.uk"),
    openGraph: {
        title: "Octopus Agile Electricity Prices",
        description: "Octopus Agile electricity prices",
        siteName: "Octopus Agile Electricity Prices",
        locale: "en_GB",
        type: "website",
    },
}

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
            <ErrorBoundary>
                {children}
            </ErrorBoundary>
        </body>
        </html>
    )
}
