import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useRouteError } from "react-router";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Bookmark,
  ChartLine,
  Clapperboard,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Menu,
  Settings,
  Signpost,
  Timer,
  X,
  type LucideIcon,
} from "lucide-react";
import { useProfile } from "@/lib/queries";
import { applyTheme, watchSystemTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { ErrorBlock, LoadingBlock, Logo } from "./common";
import { Button } from "./ui/button";
import Onboarding from "@/pages/Onboarding";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/learn", label: "Learn", icon: GraduationCap },
  { to: "/practice", label: "Practice Questions", icon: ListChecks },
  { to: "/mock-tests", label: "Mock Tests", icon: Timer },
  { to: "/hazard-perception", label: "Hazard Perception", icon: Clapperboard },
  { to: "/road-signs", label: "Road Signs", icon: Signpost },
  { to: "/progress", label: "My Progress", icon: ChartLine },
  { to: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { to: "/settings", label: "Settings", icon: Settings },
];

const MOBILE_TABS: NavItem[] = [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/learn", label: "Learn", icon: GraduationCap },
  { to: "/practice", label: "Practice", icon: ListChecks },
  { to: "/mock-tests", label: "Mock", icon: Timer },
];

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-semibold transition-colors",
              isActive ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-foreground",
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute inset-y-2 left-0 w-1 rounded-r bg-accent" aria-hidden="true" />}
              <item.icon className="size-[18px]" aria-hidden="true" />
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  return <p className="px-3 text-xs leading-relaxed text-muted">Practice tool for the GB car theory test. Not affiliated with or endorsed by DVSA.</p>;
}

export function AppShell() {
  const profile = useProfile();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Keep the theme in sync with the saved preference.
  const theme = profile.data?.theme ?? "system";
  useEffect(() => {
    applyTheme(theme);
    return watchSystemTheme(() => theme);
  }, [theme]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  let body: React.ReactNode;
  if (profile.isPending) body = <LoadingBlock rows={4} />;
  else if (profile.isError) body = <ErrorBlock error={profile.error} onRetry={() => profile.refetch()} />;
  else if (!profile.data.onboarded) body = <Onboarding />;
  else body = <Outlet />;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-border bg-surface px-3 py-5 lg:flex">
        <Link to="/" className="px-2">
          <Logo />
        </Link>
        <div className="flex-1 overflow-y-auto">
          <NavLinks items={NAV} />
        </div>
        <SidebarFooter />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur lg:hidden">
        <Link to="/" aria-label="Theory Hub home">
          <Logo />
        </Link>
        <DialogPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <DialogPrimitive.Trigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </DialogPrimitive.Trigger>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/45" />
            <DialogPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex w-[82%] max-w-xs flex-col gap-5 border-l border-border bg-surface p-4 shadow-xl animate-rise focus:outline-none">
              <div className="flex items-center justify-between">
                <DialogPrimitive.Title className="text-base font-bold">Menu</DialogPrimitive.Title>
                <DialogPrimitive.Close asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Close menu">
                    <X className="size-5" />
                  </Button>
                </DialogPrimitive.Close>
              </div>
              <DialogPrimitive.Description className="sr-only">Main navigation</DialogPrimitive.Description>
              <NavLinks items={NAV} onNavigate={() => setMenuOpen(false)} />
              <div className="mt-auto">
                <SidebarFooter />
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
        {body}
      </main>

      {/* Mobile bottom tabs */}
      <nav aria-label="Quick" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {MOBILE_TABS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", isActive ? "text-primary" : "text-muted")}
          >
            <item.icon className="size-5" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
        <button type="button" onClick={() => setMenuOpen(true)} className="flex cursor-pointer flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-muted">
          <Menu className="size-5" aria-hidden="true" />
          More
        </button>
      </nav>
    </div>
  );
}

export function RouteError() {
  const error = useRouteError();
  console.error(error);
  return (
    <div className="mx-auto max-w-lg p-8">
      <ErrorBlock error={error} onRetry={() => window.location.reload()} />
      <Link to="/" className="mt-4 inline-block font-semibold text-primary">
        Back to the dashboard
      </Link>
    </div>
  );
}
