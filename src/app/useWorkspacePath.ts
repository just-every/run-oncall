import {useEffect} from 'react';
import {useLocation, useNavigate} from '@tanstack/react-router';
import {incidentPath, isWorkspacePath, legacyWorkspacePath, workspaceAddress} from './paths';

export function useWorkspacePath() {
  const location = useLocation(), navigate = useNavigate();
  const go = (to: string, replace = false) => navigate({to, replace, resetScroll: false} as any);
  useEffect(() => {
    const canonical = legacyWorkspacePath(new URL(window.location.href));
    if (canonical) {
      if (workspaceAddress(new URL(canonical, window.location.origin).pathname).page === "not-found") window.location.replace(canonical);
      else void go(canonical, true);
    }
  }, [location.pathname, location.searchStr, location.hash]);
  useEffect(() => {
    const follow = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
      if (!link || link.target || link.hasAttribute('download') || link.getAttribute('href')?.startsWith('#')) return;
      const url = new URL(link.href);
      if (url.origin !== window.location.origin || !isWorkspacePath(url.pathname)) return;
      event.preventDefault();
      go(url.pathname + url.search + url.hash);
    };
    document.addEventListener('click', follow);
    return () => document.removeEventListener('click', follow);
  }, []);
  const legacyIncident = location.pathname === '/' ? new URLSearchParams(location.searchStr).get('incident') : null;
  const address = location.pathname === '/' ? legacyIncident ? {page:'incidents', incident:legacyIncident} : workspaceAddress(location.hash ? '/' + location.hash : '/incidents') : workspaceAddress(location.pathname);
  return {...address, selectIncident: (id: string, replace = false) => go((id ? incidentPath(id) : '/incidents') + location.searchStr, replace), go};
}
