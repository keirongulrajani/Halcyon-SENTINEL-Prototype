import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn, TAP_TARGET_MIN_HEIGHT, TAP_TARGET_MIN_WIDTH } from '@/ui/components/utils';

const buttonVariants = cva(
  cn(
    'inline-flex items-center justify-center gap-2 rounded-md font-medium text-body',
    'transition-colors select-none',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ),
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary-light',
        secondary: 'bg-card text-text border border-neutral/30 hover:bg-primary-tint',
        ghost: 'bg-transparent text-text hover:bg-primary-tint',
        destructive: 'bg-error text-white hover:opacity-90',
      },
      size: {
        default: `${TAP_TARGET_MIN_HEIGHT} px-4`,
        sm: 'min-h-[36px] px-3 text-label',
        icon: `${TAP_TARGET_MIN_HEIGHT} ${TAP_TARGET_MIN_WIDTH}`,
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Component = asChild ? Slot : 'button';
    return (
      <Component
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
