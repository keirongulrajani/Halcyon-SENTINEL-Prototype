import type { ReactNode } from 'react';
import { MissingFieldIndicator } from './missing-field-indicator';

interface ValueOrMissingProps {
  readonly value: string | number | null | undefined;
  readonly fieldLabel: string;
  readonly required: boolean;
  readonly render?: (value: string | number) => ReactNode;
}

function isAbsent(value: string | number | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return false;
}

export function ValueOrMissing({ value, fieldLabel, required, render }: ValueOrMissingProps) {
  if (isAbsent(value)) {
    if (required) {
      return <MissingFieldIndicator fieldLabel={fieldLabel} />;
    }
    return <span className="text-neutral">—</span>;
  }
  const concrete = value as string | number;
  return <span>{render ? render(concrete) : concrete}</span>;
}
