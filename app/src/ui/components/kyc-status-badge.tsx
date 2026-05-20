import { forwardRef, type HTMLAttributes } from 'react';
import { Badge, type BadgeProps } from '@/ui/components/badge';
import type { KycStatus } from '@/domain/types';

type KycVariant = NonNullable<BadgeProps['variant']>;

const KYC_STATUS_TO_VARIANT: Record<KycStatus, KycVariant> = {
  APPROVED: 'low',
  PENDING: 'neutral',
  REJECTED: 'high',
  ENHANCED_DUE_DILIGENCE: 'medium',
};

const KYC_STATUS_TO_LABEL: Record<KycStatus, string> = {
  APPROVED: 'Approved',
  PENDING: 'Pending',
  REJECTED: 'Rejected',
  ENHANCED_DUE_DILIGENCE: 'Enhanced due diligence',
};

export interface KycStatusBadgeProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  status: KycStatus;
}

const KycStatusBadge = forwardRef<HTMLSpanElement, KycStatusBadgeProps>(
  ({ status, ...props }, ref) => (
    <Badge ref={ref} variant={KYC_STATUS_TO_VARIANT[status]} {...props}>
      {KYC_STATUS_TO_LABEL[status]}
    </Badge>
  ),
);
KycStatusBadge.displayName = 'KycStatusBadge';

export { KycStatusBadge };
