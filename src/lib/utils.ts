import { clsx, type ClassValue } from 'clsx';
import { format } from 'date-fns';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

/** Matches the portal's formatDate helper (resources/js/lib/utils.ts). */
export function formatDate(value: string | null | undefined): string {
    if (!value) {
        return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '-';
    }
    return format(date, 'MMM d, yyyy h:mm a');
}
