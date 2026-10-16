import Image from 'next/image'
import { cn } from '@/lib/utils'

// Decorative portrait of Pepper; pair it with visible text that names the action.
// Sits on the text baseline like the emoji it replaces when used inline.
export function PepperFace({ size, className }: { size: number; className?: string }) {
    return (
        <Image
            src="/pepper-face.svg"
            alt=""
            aria-hidden="true"
            width={size}
            height={size}
            unoptimized
            className={cn('inline-block shrink-0 align-[-0.2em]', className)}
        />
    )
}
