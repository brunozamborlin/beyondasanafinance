import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(cents: number | undefined | null) {
  if (cents == null) return "€ 0,00";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function toCents(euros: number) {
  return Math.round(euros * 100);
}

export function formatMonth(monthStr: string) {
  if (!monthStr) return "";
  try {
    const date = parseISO(`${monthStr}-01`);
    return format(date, "MMMM yyyy", { locale: it });
  } catch {
    return monthStr;
  }
}

export function getCurrentMonthStr() {
  return format(new Date(), "yyyy-MM");
}
