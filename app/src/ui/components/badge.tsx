import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/ui/components/utils';

const badgeVariants = cva(
  'inline-flex items-center h-6 px-2 rounded-full text-label font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        low: 'bg-success-tint text-success',
        medium: 'bg-warning-tint text-warning',
        high: 'bg-error-tint text-error',
        neutral: 'bg-primary-tint text-primary',
        outline: 'border border-neutral/40 text-neutral',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  ),
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
