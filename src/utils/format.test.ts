import { describe, it, expect } from 'vitest';
import { formatBRL } from './format';

describe('formatBRL', () => {
  it('formats a typical GPU price', () => {
    const result = formatBRL(4590);
    // Should contain "R$" and "4.590" (pt-BR thousand separator)
    expect(result).toContain('R$');
    expect(result).toContain('4.590');
  });

  it('formats zero', () => {
    const result = formatBRL(0);
    expect(result).toContain('R$');
    expect(result).toContain('0');
  });

  it('formats large values (RTX 5090 price range)', () => {
    const result = formatBRL(19990);
    expect(result).toContain('R$');
    expect(result).toContain('19.990');
  });

  it('formats small values', () => {
    const result = formatBRL(99);
    expect(result).toContain('R$');
    expect(result).toContain('99');
  });

  it('does not include decimal places', () => {
    // The format function uses minimumFractionDigits: 0
    const result = formatBRL(1000);
    expect(result).not.toContain(',00');
  });
});
