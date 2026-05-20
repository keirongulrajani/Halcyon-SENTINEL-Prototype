import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type HTMLAttributes,
} from 'react';
import { Label } from '@/ui/components/label';
import { cn } from '@/ui/components/utils';

const Field = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-2', className)} {...props} />
  ),
);
Field.displayName = 'Field';

const FieldLabel = forwardRef<
  ElementRef<typeof Label>,
  ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => (
  <Label ref={ref} className={cn('text-text', className)} {...props} />
));
FieldLabel.displayName = 'FieldLabel';

const FieldError = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      role="alert"
      className={cn('text-label text-error', className)}
      {...props}
    />
  ),
);
FieldError.displayName = 'FieldError';

const FieldHint = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-label text-neutral', className)} {...props} />
  ),
);
FieldHint.displayName = 'FieldHint';

export { Field, FieldLabel, FieldError, FieldHint };
