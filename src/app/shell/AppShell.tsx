import {ReadinessSection} from '../../readiness/ReadinessPage';
import {useEffect, useRef, useState} from 'react';
import {useLocation} from '@tanstack/react-router';
import {StatusPanel} from '../../business-status/StatusPanel';
import {FailureLine} from '../FailureLine';
import {WorkspaceNotFound} from '../NotFound';
import {request} from '../../useWorkspace';
import {Mark} from '../../landing/Mark';
import {NavIcon} from '../NavIcon';
import {dailyNavigation, settingsNavigation, settingsItem, type NavItem} from './nav';
import {OwnerMenu} from './OwnerMenu';
import {useWorkspaceValue, WorkspaceContext} from './WorkspaceContext';
import {StatusSection} from '../../sections/status';
import {MoveInSection} from '../../sections/move-in';
import {OnCallSection} from '../../routes/on-call.index';
import {IncidentsSection} from '../../sections/incidents';
import {ServicesSection} from '../../sections/services';
import {RoutingSection} from '../../sections/routing';
import {AlertsSection} from '../../sections/alerts';
import {IntegrationsSection} from '../../sections/integrations';
import {ReviewsSection} from '../../sections/reviews';
import {TeamSection} from '../../sections/team';
import {ArchiveSection} from '../../sections/archive';
import './frame.css';

export function AppShell() {
  const workspace = useWorkspaceValue();
  const {w, page, signingOut, setSigningOut, s, actor} = workspace;
  const {pathname} = useLocation();
  const settings = pathname.startsWith('/settings');
  const [sheetOpen, setSheetOpen] = useState(false), [sheetSettings, setSheetSettings] = useState(false);
  const sheet = useRef<HTMLDialogElement>(null), menuButton = useRef<HTMLButtonElement>(null);
  const closeSheet = () => {sheet.current?.close(); setSheetOpen(false);};
  useEffect(() => {
    if (sheetOpen) sheet.current?.showModal();
    else sheet.current?.close();
  }, [sheetOpen]);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 901px)');
    const resize = () => {if (query.matches) closeSheet();};
    query.addEventListener('change', resize);
    return () => query.removeEventListener('change', resize);
  }, []);
  if (!w.ready) return <main className="access"><h1>Oncall</h1><p role="status">Opening your response workspace…</p>{w.error && <p role="alert">{w.error}</p>}</main>;
  if (!actor) return <main className="access"><h1>Oncall</h1><p role="status">Opening sign-in…</p></main>;
  const stakeholder = actor.role === 'stakeholder';
  if (!s && !stakeholder) return <main className="access"><h1>Oncall</h1><p role="alert">{w.error || 'Workspace could not be loaded'}</p><button onClick={() => w.refresh().catch(error => w.setError(error.message))}>Retry</button></main>;
  const daily = dailyNavigation(s, stakeholder);
  const signOut = async () => {
    setSigningOut(true); w.setError('');
    try {
      await request('/api/logout', {});
      const response = await fetch('/auth/signout', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}'});
      if (!response.ok) throw Error('Sign out could not finish. Try again.');
      location.replace('/signin');
    } catch (error) {setSigningOut(false); w.setError((error as Error).message);}
  };
  const owner = () => <OwnerMenu actor={actor} busy={w.busy} signingOut={signingOut} onSignOut={signOut} />;
  const links = (items: NavItem[], mobile = false) => items.map(item => <a key={item.id} className={`nav ${page === item.id ? 'active' : ''}`} href={item.path} aria-current={page === item.id ? 'page' : undefined} onClick={mobile ? closeSheet : undefined}>
    {item.icon && <NavIcon name={item.icon} />}<span className="nav-label">{item.label}</span>
    {item.count !== undefined && <span className="nav-count" aria-label={`${item.count} ${item.id === 'incidents' ? 'open' : 'active'}`}>{item.count}</span>}
  </a>);
  const title = [...daily, ...settingsNavigation].find(item => item.id === page)?.label ?? 'Oncall';
  return <WorkspaceContext.Provider value={workspace}><div className="app oncall-frame">
    <a className="skip" href="#main">Skip to content</a>
    <aside className="sidebar shell-rail">
      {settings && !stakeholder ? <a className="nav settings-back" href="/on-call">‹ Oncall</a> : <a href={stakeholder ? '/status' : '/on-call'} className="brand"><Mark size={30} /><span data-rer-name>Oncall</span></a>}
      <nav className="navigation" aria-label={settings && !stakeholder ? 'Settings' : 'Workspace'}>{links(settings && !stakeholder ? settingsNavigation : daily)}</nav>
      <div className="rail-foot">{!settings && !stakeholder && links([settingsItem])}{owner()}</div>
    </aside>
    <div className="mobile-bar">
      <a href={stakeholder ? '/status' : '/on-call'} className="brand"><Mark size={30} /><span data-rer-name>Oncall</span></a>
      <button ref={menuButton} aria-haspopup="dialog" aria-expanded={sheetOpen} onClick={() => {setSheetSettings(settings && !stakeholder); setSheetOpen(true);}}>Menu</button>
    </div>
    <dialog className="shell-sheet" ref={sheet} aria-label="Menu" onClose={() => {setSheetOpen(false); menuButton.current?.focus({preventScroll: true});}} onClick={event => {if (event.target === sheet.current) {const rect=sheet.current.getBoundingClientRect(); if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeSheet();}}}>
      <div className="sheet-heading"><span>{sheetSettings ? 'Settings' : 'Menu'}</span><button onClick={closeSheet}>Close menu</button></div>
      {sheetSettings ? <>
        <button className="nav settings-back" onClick={() => setSheetSettings(false)}>‹ Oncall</button>
        <nav className="navigation" aria-label="Settings">{links(settingsNavigation, true)}</nav>
      </> : <>
        {owner()}
        <nav className="navigation" aria-label="Workspace">{links(daily, true)}</nav>
        {!stakeholder && <button className="nav sheet-settings" onClick={() => setSheetSettings(true)}><NavIcon name="settings" />Settings</button>}
      </>}
    </dialog>
    <main className="workspace" id="main" tabIndex={-1}>
      <header className="header"><h1>{title}</h1></header>
      {!w.demo && <div className="authority">Existing pager authoritative · paging OFF · schedules and coordination</div>}
      <div role="status" className="notice" aria-live="polite">{w.busy ? 'Saving…' : w.notice}</div>
      <FailureLine failure={w.failure} />
      {stakeholder ? <StatusPanel actor={actor} /> : <>
        {page === 'not-found' && <WorkspaceNotFound />}
        <StatusSection /><MoveInSection /><OnCallSection /><IncidentsSection /><ServicesSection /><RoutingSection /><AlertsSection /><IntegrationsSection /><ReviewsSection /><TeamSection /><ArchiveSection /><ReadinessSection />
      </>}
    </main>
  </div></WorkspaceContext.Provider>;
}
