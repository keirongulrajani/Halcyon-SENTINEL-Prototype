import type { Predicate, RulePredicate, RuleSet } from './rules';
import { DEFAULT_RULES } from './rules';
import { highestTierOf } from './risk-tier';
import type { ClientRecord, FiredRule, Verdict } from './types';

type Subject = Pick<
  ClientRecord,
  | 'branch'
  | 'clientName'
  | 'clientType'
  | 'countryOfTaxResidence'
  | 'annualIncome'
  | 'sourceOfFunds'
  | 'pepStatus'
  | 'sanctionsScreeningMatch'
  | 'adverseMediaFlag'
>;

function readField(subject: Subject, field: string): unknown {
  return (subject as unknown as Record<string, unknown>)[field];
}

function evaluate(predicate: Predicate, subject: Subject): boolean {
  if ('all' in predicate) {
    return predicate.all.every((child) => evaluate(child, subject));
  }

  const actual = readField(subject, predicate.field);

  if ('eq' in predicate) {
    return actual === predicate.eq;
  }

  if ('in' in predicate) {
    return predicate.in.some((option) => option === actual);
  }

  if ('gt' in predicate) {
    return typeof actual === 'number' && actual > predicate.gt;
  }

  return false;
}

function firedRulesFor(subject: Subject, rules: RuleSet): readonly FiredRule[] {
  return rules.predicates
    .filter((predicate: RulePredicate) => evaluate(predicate.when, subject))
    .map((predicate) => ({
      ruleId: predicate.id,
      predicateLabel: predicate.label,
      tier: predicate.tier,
    }));
}

export function classify(subject: Subject, rules: RuleSet = DEFAULT_RULES): Verdict {
  const firedRules = firedRulesFor(subject, rules);
  const tier = firedRules.length === 0 ? 'LOW' : highestTierOf(firedRules.map((rule) => rule.tier));

  return {
    tier,
    firedRules,
    requiredActions: rules.requiredActionsByTier[tier],
    rulesVersion: rules.version,
  };
}
