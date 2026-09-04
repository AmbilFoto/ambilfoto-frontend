import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useBayanOpenAuth } from '@/contexts/BayanOpenAuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LayoutDashboard, BarChart3, Images, LogOut, Menu, X } from 'lucide-react';

const BAYAN_OPEN_LOGO =
  'https://res.cloudinary.com/viecqvpk/image/upload/q_auto/f_auto/v1786581021/bayanopen-logo_mfcb55_rk41oh.webp';
const AMBILFOTO_LOGO =
  'https://res.cloudinary.com/dwyi4d3rq/image/upload/v1765171746/ambilfoto-logo_hvn8s2.png';

const NAV_ITEMS = [
  { label: 'Statistik', href: '/clientarea/bayan-open', icon: LayoutDashboard, end: true },
  //{ label: 'Grafik', href: '/clientarea/bayan-open/statistics', icon: BarChart3, end: false },
  { label: 'Galeri', href: '/clientarea/bayan-open/gallery', icon: Images, end: false },
];

export function BayanOpenLayout() {
  const navigate = useNavigate();
  const { logout } = useBayanOpenAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/clientarea/bayan-open/login', { replace: true });
  };

  const closeSidebar = () => setSidebarOpen(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-smooth',
      isActive
        ? 'bg-primary text-primary-foreground shadow-soft'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    );

  // ── Shared nav content (desktop sidebar + mobile drawer) ────────────────
  const NavContent = ({ onNav }: { onNav?: () => void }) => (
    <>
      {/* Brand */}
      <div className="p-6 border-b border-border">
        <Link to="/clientarea/bayan-open" className="flex items-center gap-2.5" onClick={onNav}>
          <img src={BAYAN_OPEN_LOGO} alt="Bayan Open" className="h-10 w-auto" />
          <div>
            <p className="font-bold text-sm leading-tight">Bayan Open</p>
            <p className="text-xs text-muted-foreground">Client Area</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} to={item.href} end={item.end} onClick={onNav} className={navLinkClass}>
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Powered by + Logout */}
      <div className="p-4 border-t border-border space-y-4">
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground tracking-wide">Powered by</span>
          <img src={AMBILFOTO_LOGO} alt="AmbilFoto" className="h-14 w-auto" />
        </div>
        <Button
        variant="ghost"
        className="w-full justify-start gap-3 text-muted-foreground hover:bg-primary hover:text-primary-foreground"
        onClick={() => { onNav?.(); handleLogout(); }}
        >
        <LogOut className="h-4 w-4" />
        Logout
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex w-64 bg-card border-r border-border flex-col shrink-0">
        <NavContent />
      </aside>

      {/* ── Mobile Overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={closeSidebar} aria-hidden="true" />
      )}

      {/* ── Mobile Drawer ── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out lg:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          onClick={closeSidebar}
          className="absolute top-4 right-4 p-1.5 rounded-md text-muted-foreground hover:bg-muted"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
        <NavContent onNav={closeSidebar} />
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 bg-card/95 backdrop-blur border-b border-border px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <img src={BAYAN_OPEN_LOGO} alt="Bayan Open" className="h-7 w-auto" />
            <span className="font-semibold text-sm">Client Area</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}