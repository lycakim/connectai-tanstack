import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({
    className,
    children,
    ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
    return (
        <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content
                className={cn(
                    'fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col gap-4 overflow-y-auto border-l bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right data-[state=closed]:duration-200 data-[state=open]:duration-300 sm:max-w-lg',
                    className,
                )}
                {...props}
            >
                {children}
                <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none">
                    <X className="size-4" />
                    <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
            </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
    );
}

export function SheetHeader({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div className={cn('flex flex-col gap-1.5', className)} {...props} />
    );
}

export function SheetTitle({
    className,
    ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
    return (
        <DialogPrimitive.Title
            className={cn('text-lg font-semibold text-foreground', className)}
            {...props}
        />
    );
}

export function SheetDescription({
    className,
    ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
    return (
        <DialogPrimitive.Description
            className={cn('text-sm text-muted-foreground', className)}
            {...props}
        />
    );
}

export function SheetFooter({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            className={cn(
                'mt-auto flex items-center justify-end gap-2 pt-4',
                className,
            )}
            {...props}
        />
    );
}
