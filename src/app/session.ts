export const SESSION_KEY = 'creator-match.admin-session';
/** 프로토타입용 임시 계정. 실제 인증이 아니다 (설계 D24) */
export const ADMIN_ACCOUNT = { id: 'admin', password: 'demo1234' } as const;

export function isAdminLoggedIn(): boolean {
  try {
    return localStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function login(id: string, password: string): boolean {
  if (id !== ADMIN_ACCOUNT.id || password !== ADMIN_ACCOUNT.password) return false;
  try {
    localStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* 저장소 불가 시에도 이 화면 안에서는 로그인으로 취급 */
  }
  return true;
}

export function logout(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* 무시 */
  }
}
