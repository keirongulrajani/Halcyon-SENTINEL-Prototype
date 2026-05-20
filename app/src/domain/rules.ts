import type { RiskTier } from './types';

export type PredicateValue = string | number | boolean;

export type Predicate =
  | { readonly field: string; readonly eq: PredicateValue }
  | { readonly field: string; readonly in: readonly PredicateValue[] }
  | { readonly field: string; readonly gt: number }
  | { readonly all: readonly Predicate[] };

export interface RulePredicate {
  readonly id: string;
  readonly tier: RiskTier;
  readonly label: string;
  readonly when: Predicate;
}

export interface RuleSet {
  readonly version: string;
  readonly effectiveFrom: string;
  readonly predicates: readonly RulePredicate[];
  readonly requiredActionsByTier: Readonly<Record<RiskTier, readonly string[]>>;
}

export const HIGH_RISK_COUNTRIES = ['Russia', 'Belarus', 'Venezuela'] as const;

export const MEDIUM_RISK_COUNTRIES = [
  'Brazil',
  'Turkey',
  'South Africa',
  'Mexico',
  'UAE',
  'China',
] as const;

export const MEDIUM_RISK_INCOME_SOURCES = ['Inheritance', 'Gift', 'Other'] as const;

export const MEDIUM_RISK_INCOME_THRESHOLD = 500_000;

export const DEFAULT_RULES: RuleSet = {
  version: '2026-05-20.v1',
  effectiveFrom: '2026-01-01',
  predicates: [
    {
      id: 'high.pep',
      tier: 'HIGH',
      label: 'Client is a Politically Exposed Person',
      when: { field: 'pepStatus', eq: true },
    },
    {
      id: 'high.sanctions',
      tier: 'HIGH',
      label: 'Sanctions screening match (HMT / OFSI)',
      when: { field: 'sanctionsScreeningMatch', eq: true },
    },
    {
      id: 'high.adverse-media',
      tier: 'HIGH',
      label: 'Flagged by adverse media screening',
      when: { field: 'adverseMediaFlag', eq: true },
    },
    {
      id: 'high.country',
      tier: 'HIGH',
      label: 'Country of tax residence is on the sanctioned list',
      when: { field: 'countryOfTaxResidence', in: [...HIGH_RISK_COUNTRIES] },
    },
    {
      id: 'medium.entity',
      tier: 'MEDIUM',
      label: 'Client is an entity',
      when: { field: 'clientType', eq: 'ENTITY' },
    },
    {
      id: 'medium.country',
      tier: 'MEDIUM',
      label: 'Country of tax residence is on the elevated-risk list',
      when: { field: 'countryOfTaxResidence', in: [...MEDIUM_RISK_COUNTRIES] },
    },
    {
      id: 'medium.income-source',
      tier: 'MEDIUM',
      label: 'High annual income from inheritance, gift, or other source',
      when: {
        all: [
          { field: 'annualIncome', gt: MEDIUM_RISK_INCOME_THRESHOLD },
          { field: 'sourceOfFunds', in: [...MEDIUM_RISK_INCOME_SOURCES] },
        ],
      },
    },
  ],
  requiredActionsByTier: {
    HIGH: ['Enhanced Due Diligence', 'Senior compliance sign-off'],
    MEDIUM: ['Additional documentation'],
    LOW: [],
  },
};
