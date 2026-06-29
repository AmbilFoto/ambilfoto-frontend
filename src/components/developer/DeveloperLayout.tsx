import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Key,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  Code2,
  ChevronRight,
  ImagePlay,
  Menu,
  X,
} from "lucide-react";

interface DeveloperLayoutProps {
  children: React.ReactNode;
  developerId: string;
}

const navItems = (id: string) => [
  { label: "Overview",          href: `/developer/${id}`,            icon: LayoutDashboard },
  { label: "API Keys",          href: `/developer/${id}/keys`,       icon: Key },
  { label: "Usage & Analytics", href: `/developer/${id}/usage`,      icon: BarChart3 },
  { label: "Billing",           href: `/developer/${id}/billing`,    icon: FileText },
  { label: "Settings",          href: `/developer/${id}/settings`,   icon: Settings },
  { label: "Playground",        href: `/developer/${id}/playground`, icon: ImagePlay },
];

export const DeveloperLayout = ({ children, developerId }: DeveloperLayoutProps) => {
  const location              = useLocation();
  const navigate              = useNavigate();
  const { logout }            = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    const returnTo = encodeURIComponent(location.pathname + location.search);
    navigate(`/developer/login?redirect=${returnTo}`);
  };

  const isActive = (href: string) => {
    const basePath = `/developer/${developerId}`;
    if (href === basePath) return location.pathname === basePath;
    return location.pathname.startsWith(href);
  };

  const closeSidebar = () => setSidebarOpen(false);

  // ── Shared nav content (rendered in both desktop sidebar & mobile drawer) ──
  const NavContent = ({ onNav }: { onNav?: () => void }) => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link to="/" className="flex items-center gap-2" onClick={onNav}>
          <img
            src="https://res.cloudinary.com/dwyi4d3rq/image/upload/v1765171746/ambilfoto-logo_hvn8s2.png"
            alt="Logo AmbilFoto.id"
            className="h-16 w-auto"
          />
          <div>
            <p className="font-bold text-sm leading-tight">AmbilFoto</p>
            <p className="text-xs text-muted-foreground">API Developer Platform</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems(developerId).map((item) => (
          <Link
            key={item.href}
            to={item.href}
            onClick={onNav}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-smooth",
              isActive(item.href)
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Docs + Logout */}
      <div className="p-4 border-t border-border space-y-2">
        <Link
          to="/docs"
          onClick={onNav}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-smooth"
        >
          <Code2 className="h-4 w-4" />
          Documentation
          <ChevronRight className="h-3 w-3 ml-auto" />
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={() => { onNav?.(); handleLogout(); }}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-muted/30 flex">

      {/* ── Desktop Sidebar (hidden on mobile) ── */}
      <aside className="hidden lg:flex w-64 bg-card border-r border-border flex-col shrink-0">
        <NavContent />
      </aside>

      {/* ── Mobile Overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile Drawer ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close button */}
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <img
              src="https://res.cloudinary.com/dwyi4d3rq/image/upload/v1765171746/ambilfoto-logo_hvn8s2.png"
              alt="AmbilFoto.id"
              className="h-7 w-auto"
            />
            <span className="font-semibold text-sm">AmbilFoto</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
        </main>

      </div>
    </div>
  );
};