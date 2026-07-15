import type { ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface AppLogoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    src?: string;
}

export function AppLogo({
    className,
    src = '/connectai-logo-all-black.png',
    ...props
}: AppLogoProps) {
    return (
        <img
            {...props}
            src={src}
            alt="ConnectAI"
            className={cn('block h-full w-auto object-contain', className)}
        />
    );
}
