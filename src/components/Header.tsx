interface Props {
  variant: 'advertiser' | 'admin' | 'login';
  accountName?: string;
  onLogout?: () => void;
}

export function Header({ variant, accountName, onLogout }: Props) {
  return (
    <header className="header">
      <div className="header__brand">
        <a className="header__logo" href="#/" aria-label="Creator Match 홈">
          <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
            <rect width="36" height="36" rx="11" fill="var(--primary)" />
            <path d="M11 22.5c3.2 0 4.6-3.1 5.7-6.1 1.1-3 2.2-5.9 5.3-5.9 2.5 0 4 1.9 4 4.4" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            <circle cx="24.5" cy="23.5" r="2.3" fill="#fff" />
          </svg>
        </a>
        <div>
          <div className="header__title">Creator Match</div>
          {variant === 'login' && <div className="header__subtitle">광고주를 위한 크리에이터 추천</div>}
        </div>
      </div>
      {variant === 'advertiser' && <a className="btn btn--ghost header__link" href="#/login">운영자 로그인</a>}
      {variant === 'admin' && (
        <div className="header__account">
          <span className="header__account-name">{accountName}</span>
          <button type="button" className="btn btn--ghost" onClick={onLogout}>로그아웃</button>
        </div>
      )}
    </header>
  );
}
