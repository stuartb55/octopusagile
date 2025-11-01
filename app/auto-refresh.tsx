"use client"

import {useEffect, useRef} from "react";
import {useRouter} from "next/navigation";

const THIRTY_MINUTES_IN_MS = 30 * 60 * 1000;

export function AutoRefresh() {
    const router = useRouter();
    const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const scheduleNextRefresh = () => {
            const now = new Date();
            const currentMinutes = now.getMinutes();
            const currentSeconds = now.getSeconds();
            const currentMilliseconds = now.getMilliseconds();

            let delayMs: number;

            if (currentMinutes < 30) {
                // Target next 30-minute mark
                const minutesToNextTarget = 29 - currentMinutes;
                const secondsToNextTarget = 59 - currentSeconds;
                const msToNextTarget = 999 - currentMilliseconds;
                delayMs = (minutesToNextTarget * 60 + secondsToNextTarget) * 1000 + msToNextTarget + 1; // +1 to ensure it's just after
            } else {
                // Target next 00-minute mark (top of the hour)
                const minutesToNextTarget = 59 - currentMinutes;
                const secondsToNextTarget = 59 - currentSeconds;
                const msToNextTarget = 999 - currentMilliseconds;
                delayMs = (minutesToNextTarget * 60 + secondsToNextTarget) * 1000 + msToNextTarget + 1; // +1 to ensure it's just after
            }

            // Ensure delay is not negative or excessively long if calculations are somehow off near boundaries
            if (delayMs <= 0) {
                delayMs = THIRTY_MINUTES_IN_MS; // Default to 30 mins if calculation is off
            }


            timeoutIdRef.current = setTimeout(() => {
                router.refresh();
                // After the first aligned refresh, set up a regular 30-minute interval
                intervalIdRef.current = setInterval(() => {
                    router.refresh();
                }, THIRTY_MINUTES_IN_MS);
            }, delayMs);
        };

        scheduleNextRefresh();

        return () => {
            // Clear timeout and interval on component unmount
            if (timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current);
            }
            if (intervalIdRef.current) {
                clearInterval(intervalIdRef.current);
            }
        };
    }, [router]);

    return null; // This component doesn't render anything visible
}