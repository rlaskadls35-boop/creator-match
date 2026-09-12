import { useState } from 'react';

interface Props {
  /** true면 성공 */
  onLogin: (id: string, password: string) => boolean;
}

export function LoginForm({ onLogin }: Props) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="card login"
      onSubmit={(e) => {
        e.preventDefault();
        if (!onLogin(id.trim(), password)) setError('아이디 또는 비밀번호가 맞지 않습니다.');
      }}
    >
      <h1 className="login__title">운영자 로그인</h1>
      <p className="login__notice">프로토타입용 임시 계정입니다. 실제 인증 기능은 아닙니다.</p>
      <label className="field__label" htmlFor="login-id">아이디</label>
      <input id="login-id" className="input" autoComplete="username" value={id} onChange={(e) => setId(e.target.value)} />
      <label className="field__label login__label" htmlFor="login-pw">비밀번호</label>
      <input id="login-pw" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="field__error" role="alert">{error}</p>}
      <button type="submit" className="btn btn--primary login__submit">로그인</button>
      <p className="login__hint">임시 계정: admin / demo1234</p>
      <a className="login__back" href="#/">← 광고주 화면으로</a>
    </form>
  );
}
