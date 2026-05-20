import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn, TAP_TARGET_MIN_HEIGHT } from '@/ui/components/utils';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

const NUMERIC_INPUT_TYPES = new Set(['number']);

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    const isNumeric = NUMERIC_INPUT_TYPES.has(type);
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          TAP_TARGET_MIN_HEIGHT,
          'w-full px-3 py-2 rounded-md text-body bg-card text-text',
          'border border-neutral/30',
          'placeholder:text-neutral',
          'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isNumeric && 'tabular',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
