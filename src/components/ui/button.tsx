import type { ButtonHTMLAttributes } from 'react'

import { Slot } from '@radix-ui/react-slot'
import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@/lib/utils/cn'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md text-sm font-medium leading-none transition-[background-color,border-color,color,opacity] duration-150 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'border border-foreground bg-background-deep text-foreground hover:border-border-strong',
        outline:
          'border border-border bg-background-deep text-foreground/90 hover:border-border-strong hover:text-foreground',
        ghost:
          'rounded-md border border-transparent bg-transparent px-2 text-foreground hover:border-border',
        danger:
          'border border-danger/45 bg-danger-muted text-danger hover:border-danger hover:bg-danger/20',
      },
      size: {
        default: 'h-9 px-8 py-2',
        sm: 'h-8 px-6 py-2 text-xs',
        lg: 'h-10 px-10 py-2 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

export function Button({ asChild = false, className, size, variant, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'

  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { buttonVariants }
