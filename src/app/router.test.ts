import { describe, it, expect } from 'vitest';
import { parseHash } from './router';

describe('parseHash', () => {
  it('빈 해시와 #/ 는 home', () => {
    expect(parseHash('')).toBe('home');
    expect(parseHash('#')).toBe('home');
    expect(parseHash('#/')).toBe('home');
  });
  it('#/login → login, #/admin → admin', () => {
    expect(parseHash('#/login')).toBe('login');
    expect(parseHash('#/admin')).toBe('admin');
  });
  it('모르는 경로는 home', () => {
    expect(parseHash('#/foo')).toBe('home');
  });
});
