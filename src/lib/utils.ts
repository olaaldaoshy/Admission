import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseLocalDate(dateStr: string | Date | undefined): Date | undefined {
  if (!dateStr) return undefined;
  if (dateStr instanceof Date) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
}

export function isTimeSlotPast(slotName: string, selectedDate: Date | undefined): boolean {
  if (!selectedDate) return false;

  const now = new Date();
  const selected = new Date(selectedDate);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const chosenDay = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());

  if (chosenDay < today) {
    return true;
  }
  if (chosenDay > today) {
    return false;
  }

  if (!slotName) return false;
  const cleaned = slotName.trim().toUpperCase();
  const isPM = cleaned.includes("PM");
  const isAM = cleaned.includes("AM");
  const timeOnly = cleaned.replace(/[AP]M/, "").trim();
  const [hStr, mStr] = timeOnly.split(":");
  let hours = parseInt(hStr, 10);
  const minutes = parseInt(mStr || "0", 10);

  if (isNaN(hours)) return false;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  const slotDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
  return slotDateTime < now;
}
