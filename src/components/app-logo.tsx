import type { ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface AppLogoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    srcBlack?: string;
    srcWhite?: string;
}

export function AppLogo({
    className,
    srcBlack = '/connectai-logo-all-black.png',
    srcWhite = '/connectai-logo-all-white.png',
    ...props
}: AppLogoProps) {
    return (
        <>
            <img
                {...props}
                src={srcBlack}
                alt="ConnectAI"
                className={cn(
                    'block h-full w-auto object-contain dark:hidden',
                    className,
                )}
            />
            <img
                {...props}
                src={srcWhite}
                alt="ConnectAI"
                className={cn(
                    'hidden h-full w-auto object-contain dark:block',
                    className,
                )}
            />
        </>
    );
}
