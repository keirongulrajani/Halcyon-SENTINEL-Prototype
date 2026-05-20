import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn, TAP_TARGET_MIN_HEIGHT, TAP_TARGET_MIN_WIDTH } from '@/ui/components/utils';

const Switch = forwardRef<
  ElementRef<typeof SwitchPrimitive.Root>,
  ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'group relative inline-flex shrink-0 items-center justify-center',
      TAP_TARGET_MIN_HEIGHT,
      TAP_TARGET_MIN_WIDTH,
      'bg-transparent cursor-pointer',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      className,
    )}
    {...props}
  >
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none inline-flex h-6 w-11 items-center rounded-full transition-colors',
        'bg-neutral/40',
        'group-data-[state=checked]:bg-primary',
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-card',
          'translate-x-0.5 transition-transform',
          'data-[state=checked]:translate-x-[22px]',
        )}
      />
    </span>
  </SwitchPrimitive.Root>
));
Switch.displayName = 'Switch';

export { Switch };
