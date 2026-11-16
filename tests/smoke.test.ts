import { describe, expect, it } from 'vitest';
import { getWelcomeMessage } from '../lib/welcome';

describe('getWelcomeMessage', () => {
  it('returns the StockFlow welcome message', () => {
    expect(getWelcomeMessage()).toBe('Welcome to StockFlow');
  });
});
