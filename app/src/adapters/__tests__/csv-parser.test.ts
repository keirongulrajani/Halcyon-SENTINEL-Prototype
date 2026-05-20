import { describe, it, expect } from 'vitest';
import { parseCsv } from '@/adapters/csv-parser';

describe('parseCsv', () => {
  it('R1.1: parses an empty string into zero rows', () => {
    expect(parseCsv('')).toEqual([]);
  });

  it('R1.1: parses a header-only CSV into zero rows', () => {
    expect(parseCsv('a,b,c')).toEqual([]);
  });

  it('R1.1: parses a 2-row CSV with two headers correctly', () => {
    const csv = 'a,b\n1,2\n3,4';
    expect(parseCsv(csv)).toEqual([
      { a: '1', b: '2' },
      { a: '3', b: '4' },
    ]);
  });

  it('R1.1: handles trailing newline gracefully', () => {
    const csv = 'a,b\n1,2\n';
    expect(parseCsv(csv)).toEqual([{ a: '1', b: '2' }]);
  });

  it('R1.1: handles a comma inside a quoted field', () => {
    const csv = 'name,country\n"Smith, John",UK';
    expect(parseCsv(csv)).toEqual([{ name: 'Smith, John', country: 'UK' }]);
  });

  it('R1.1: handles an escaped double-quote inside a quoted field', () => {
    const csv = 'name,note\n"O""Brien","ok"';
    expect(parseCsv(csv)).toEqual([{ name: 'O"Brien', note: 'ok' }]);
  });

  it('R1.1: handles a BOM at the start of the file', () => {
    const csv = '﻿a,b\n1,2';
    expect(parseCsv(csv)).toEqual([{ a: '1', b: '2' }]);
  });

  it('R1.1: trims whitespace from header and value', () => {
    const csv = '  a , b \n  1 , 2 ';
    expect(parseCsv(csv)).toEqual([{ a: '1', b: '2' }]);
  });
});
