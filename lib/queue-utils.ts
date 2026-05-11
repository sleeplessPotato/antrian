import { format } from "date-fns";

export function getTodayDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function formatQueueNumber(prefix: string, number: number): string {
  return `${prefix}${String(number).padStart(3, "0")}`;
}

export function estimateWaitTime(position: number, avgServeMinutes = 5): number {
  return position * avgServeMinutes;
}
