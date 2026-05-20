import type { RulesSource } from '@/domain/ports';
import type { RuleSet } from '@/domain/rules';
import { DEFAULT_RULES } from '@/domain/rules';

export class StaticRulesSource implements RulesSource {
  private readonly rules: RuleSet;

  constructor(rules: RuleSet = DEFAULT_RULES) {
    this.rules = rules;
  }

  load(): Promise<RuleSet> {
    return Promise.resolve(this.rules);
  }
}

export const defaultRulesSource: RulesSource = new StaticRulesSource();
