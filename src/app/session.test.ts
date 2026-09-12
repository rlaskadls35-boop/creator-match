import { describe, it, expect, beforeEach } from 'vitest';
import { isAdminLoggedIn, login, logout, SESSION_KEY } from './session';

describe('목업 세션 (설계 §6.3)', () => {
  beforeEach(() => localStorage.clear());
  it('admin / demo1234 로 로그인되고 플래그가 저장된다', () => {
    expect(isAdminLoggedIn()).toBe(false);
    expect(login('admin', 'demo1234')).toBe(true);
    expect(isAdminLoggedIn()).toBe(true);
    expect(localStorage.getItem(SESSION_KEY)).toBe('1');
  });
  it('틀린 계정은 실패', () => {
    expect(login('admin', 'wrong')).toBe(false);
    expect(login('root', 'demo1234')).toBe(false);
    expect(isAdminLoggedIn()).toBe(false);
  });
  it('로그아웃하면 플래그가 지워진다', () => {
    login('admin', 'demo1234');
    logout();
    expect(isAdminLoggedIn()).toBe(false);
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });
});
