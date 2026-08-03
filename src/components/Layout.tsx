import { useState, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Bot, Menu, Search, UserRound, X, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useData } from '../lib/data-context';
import { navItems, settingsNav } from '../lib/ui';

export function Layout({ children, navigateToView }: { children: ReactNode; navigateToView: (v: string) => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, profile, signOut } = useAuth();
  const { isGuest, guestMode, exitGuestMode } = useData();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const greeting = isGuest
    ? 'Guest'
    : profile?.display_name || 'there';

  const handleNav = (id: string) => {
    navigateToView(id);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExitGuest = () => {
    exitGuestMode();
    navigate('/');
  };

  return (
    <div className="app-shell">
      <aside className={mobileOpen ? 'open' : ''}>
        <div className="brand">
          <div className="logo-orb" />
          <div>
            <strong>CAPITAL OS</strong>
            <span>AI CFO COMMAND CENTER</span>
          </div>
          <button className="close-mobile" onClick={() => setMobileOpen(false)}>
            <X />
          </button>
        </div>
        <nav>
          {navItems.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={location.pathname.includes(`/${id}`) ? 'active' : ''}
              onClick={() => handleNav(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
          <button
            className={location.pathname.includes('/settings') ? 'active' : ''}
            onClick={() => handleNav('settings')}
          >
            <settingsNav.Icon size={19} />
            <span>Settings</span>
          </button>
        </nav>
        <div className="copilot-card">
          <div>
            <strong>AI Copilot</strong>
          </div>
          <p>Ask any financial question or run a scenario.</p>
          <button onClick={() => handleNav('copilot')}>
            <Bot size={17} /> Ask Copilot
          </button>
        </div>
        {isGuest ? (
          <div className="guest-card">
            <strong>Guest Mode</strong>
            <p>{guestMode === 'sample' ? 'Viewing sample data' : 'Empty dashboard'}</p>
            <button className="ghost-btn sm" onClick={() => navigate('/login')}>
              <LogIn size={15} /> Sign in
            </button>
            <button className="ghost-btn sm" onClick={() => navigate('/signup')}>
              <UserPlus size={15} /> Create account
            </button>
            <button className="text-link" onClick={handleExitGuest}>Exit to home</button>
          </div>
        ) : (
          <div className="premium-card">
            <div>
              <span>👤</span>
              <div>
                <small>{profile?.plan ?? 'Free'} Plan</small>
              </div>
            </div>
            <button className="ghost-btn sm" onClick={signOut}>Sign out</button>
          </div>
        )}
      </aside>
      <main>
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileOpen(true)}>
            <Menu />
          </button>
          <div>
            <h1>Good morning, {greeting} 👋</h1>
            <p>
              {isGuest
                ? guestMode === 'sample'
                  ? 'You are viewing clearly labeled sample data — nothing is saved to an account.'
                  : 'Your dashboard is empty — add data to get started.'
                : `Here's your financial overview for ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
            </p>
          </div>
          <div className="top-actions">
            {isGuest && (
              <div className="guest-badge">
                <span>Guest Mode</span>
              </div>
            )}
            <button onClick={() => setSearchOpen(!searchOpen)}>
              <Search />
            </button>
            <button className="notify" onClick={() => setNotificationsOpen(!notificationsOpen)}>
              <Bell />
              <span>0</span>
            </button>
            {!isGuest && (
              <div className="profile">
                <div className="avatar">
                  <UserRound />
                </div>
                <div>
                  <strong>{profile?.display_name || 'User'}</strong>
                  <small>{profile?.plan ?? 'Free'}</small>
                </div>
              </div>
            )}
          </div>
          {searchOpen && (
            <div className="floating-menu search-menu">
              <input
                autoFocus
                placeholder="Search modules…"
                onChange={(e) => {
                  const q = e.target.value.toLowerCase();
                  const hit = navItems.find((n) => n.label.toLowerCase().includes(q));
                  if (q && hit) handleNav(hit.id);
                }}
              />
              <small>Type Budget, Goals, Reports…</small>
            </div>
          )}
          {notificationsOpen && (
            <div className="floating-menu notification-menu">
              <strong>0 financial alerts</strong>
              <small>No alerts right now.</small>
            </div>
          )}
        </header>
        {isGuest && (
          <div className="guest-banner">
            <strong>You're in guest mode.</strong>
            <span>{guestMode === 'sample' ? 'Sample data is for exploration only and is not saved to an account.' : 'Your changes are stored locally in your browser only.'}</span>
            <button onClick={() => navigate('/login')}>Sign in to save</button>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
