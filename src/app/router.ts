import { useEffect, useState } from 'react';

export type Route = 'home' | 'login' | 'admin';
export type RoutePath = '/' | '/login' | '/admin';

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '');
  if (path.startsWith('/admin')) return 'admin';
  if (path.startsWith('/login')) return 'login';
  return 'home';
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(path: RoutePath): void {
  window.location.hash = path;
}
