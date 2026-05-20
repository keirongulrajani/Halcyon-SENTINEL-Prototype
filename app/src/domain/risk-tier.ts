import type { RiskTier } from './types';

const TIER_ORDER: Record<RiskTier, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
};

export function isHigherTier(candidate: RiskTier, baseline: RiskTier): boolean {
  return TIER_ORDER[candidate] > TIER_ORDER[baseline];
}

export function highestTierOf(tiers: readonly RiskTier[]): RiskTier {
  return tiers.reduce<RiskTier>(
    (winner, candidate) => (isHigherTier(candidate, winner) ? candidate : winner),
    'LOW',
  );
}

export function isHighRisk(tier: RiskTier): boolean {
  return tier === 'HIGH';
}
