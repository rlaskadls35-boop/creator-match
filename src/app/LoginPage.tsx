import { useEffect } from 'react';
import { Header } from '../components/Header';
import { LoginForm } from '../components/LoginForm';
import { isAdminLoggedIn, login } from './session';
import { navigate } from './router';

export function LoginPage() {
  useEffect(() => {
    if (isAdminLoggedIn()) navigate('/admin');
  }, []);
  return (
    <div className="page">
      <Header variant="login" />
      <main className="main main--narrow">
        <LoginForm
          onLogin={(id, pw) => {
            const ok = login(id, pw);
            if (ok) navigate('/admin');
            return ok;
          }}
        />
      </main>
    </div>
  );
}
