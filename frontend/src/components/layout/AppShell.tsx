import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Clock, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatTime, roleLabel } from '@/lib/format';
import { useAuth, useSession } from '@/features/auth/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { IconButton } from '@/components/ui/Button';
import { BrandMark } from './Brand';
import { navigationFor, profilePathFor, ProfileIcon, type NavSection } from './navigation';

function SidebarNav({ sections, onNavigate }: { sections: NavSection[]; onNavigate?: () => void }) {
  return (
    <nav aria-label="Primary" className="flex flex-col gap-5">
      {sections.map((section, index) => (
        <div key={section.label ?? index}>
          {section.label ? <p className="mb-1.5 px-3 text-[12px] text-navy-300/80">{section.label}</p> : null}
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'relative flex items-center gap-2.5 rounded-md px-3 py-[7px] text-[13.5px] transition-colors',
                      isActive ? 'bg-navy-800 font-medium text-white' : 'text-navy-200/85 hover:bg-navy-800/60 hover:text-white',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive ? <span className="absolute inset-y-1.5 -left-3 w-[3px] rounded-r bg-[#5b92f5]" aria-hidden /> : null}
                      <item.icon className={cn('size-4 shrink-0', isActive ? 'text-[#8fb3f8]' : 'text-navy-300')} aria-hidden />
                      {item.label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({ onNavigate }: { onNavigate?: () => void }) {
  const session = useSession();
  const { signOut } = useAuth();
  return (
    <div className="border-t border-navy-800 px-3 pt-3">
      <NavLink
        to={profilePathFor(session.role)}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn('flex items-center gap-2.5 rounded-md px-2 py-2 transition-colors', isActive ? 'bg-navy-800' : 'hover:bg-navy-800/60')
        }
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-navy-700 text-navy-200">
          <ProfileIcon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium text-white">{session.username}</span>
          <span className="block text-[12px] text-navy-300">{roleLabel(session.role)}</span>
        </span>
      </NavLink>
      <button
        type="button"
        onClick={signOut}
        className="mt-1 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] text-navy-200/85 transition-colors hover:bg-navy-800/60 hover:text-white"
      >
        <LogOut className="size-4 text-navy-300" aria-hidden />
        Sign out
      </button>
    </div>
  );
}

function ExpiryBanner() {
  const { expiringSoon, session } = useAuth();
  if (!expiringSoon || !session) return null;
  return (
    <div role="status" className="flex items-center gap-2 border-b border-warning/30 bg-warning-soft px-4 py-2 text-[13px] text-fg sm:px-6">
      <Clock className="size-4 shrink-0 text-warning-fg" aria-hidden />
      <span>
        Your session ends at {formatTime(session.expiresAt)}. The backend can’t extend sessions, so save your work and sign in again
        afterwards.
      </span>
    </div>
  );
}

export function AppShell() {
  const session = useSession();
  const { resolved, setPreference } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const sections = navigationFor(session.role);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setMobileOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const themeToggle = (
    <IconButton
      label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setPreference(resolved === 'dark' ? 'light' : 'dark')}
    >
      {resolved === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </IconButton>
  );

  return (
    <div className="flex min-h-full">
      {/* Desktop sidebar */}
      <div className="hidden w-[248px] shrink-0 bg-navy-900 lg:block dark:border-r dark:border-navy-800">
        <aside className="sticky top-0 flex h-screen flex-col py-4" aria-label="Sidebar">
          <div className="px-5 pb-5">
            <BrandMark tone="onNavy" />
          </div>
          <div className="flex-1 overflow-y-auto px-3">
            <SidebarNav sections={sections} />
          </div>
          <SidebarFooter />
        </aside>
      </div>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-[272px] max-w-[85vw] flex-col bg-navy-900 py-4" aria-label="Sidebar">
            <div className="flex items-center justify-between px-5 pb-5">
              <BrandMark tone="onNavy" />
              <IconButton label="Close navigation" tone="onNavy" onClick={() => setMobileOpen(false)}>
                <X className="size-4" />
              </IconButton>
            </div>
            <div className="flex-1 overflow-y-auto px-3">
              <SidebarNav sections={sections} onNavigate={() => setMobileOpen(false)} />
            </div>
            <SidebarFooter onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6">
          <IconButton label="Open navigation" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="size-5" />
          </IconButton>
          <span className="lg:hidden">
            <BrandMark compact />
          </span>
          <div className="min-w-0 flex-1">
            {session.role === 'TENANT_ADMIN' ? (
              <p className="truncate text-[13px] text-fg-muted">
                Organization <span className="font-mono text-fg">#{session.organizationId}</span>
              </p>
            ) : (
              <p className="truncate text-[13px] text-fg-muted">Platform-wide scope</p>
            )}
          </div>
          {themeToggle}
        </header>
        <ExpiryBanner />
        <main id="main" className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
