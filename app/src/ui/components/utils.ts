import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const TAP_TARGET_MIN_HEIGHT = 'min-h-[44px]';
export const TAP_TARGET_MIN_WIDTH = 'min-w-[44px]';
