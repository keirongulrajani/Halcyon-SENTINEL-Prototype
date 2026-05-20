import { forwardRef, type HTMLAttributes } from 'react';
import { Badge, type BadgeProps } from '@/ui/components/badge';
import type { RiskTier } from '@/domain/types';

type RiskBadgeVariant = NonNullable<BadgeProps['variant']>;

const RISK_TIER_TO_VARIANT: Record<RiskTier, RiskBadgeVariant> = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

export interface RiskBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  tier: RiskTier;
}

const RiskBadge = forwardRef<HTMLSpanElement, RiskBadgeProps>(
  ({ tier, ...props }, ref) => (
    <Badge ref={ref} variant={RISK_TIER_TO_VARIANT[tier]} {...props}>
      {tier}
    </Badge>
  ),
);
RiskBadge.displayName = 'RiskBadge';

export { RiskBadge };
