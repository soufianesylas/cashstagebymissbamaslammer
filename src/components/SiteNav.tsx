import { Link, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import csLogo from "@/assets/cs-logo.png";
import { useAuth } from "@/hooks/useAuth";

const links = [
  { to: "/", label: "Home" },
  { to: "/app", label: "App" },
  { to: "/pitch", label: "Pitch Deck" },
];

const SiteNav = () => {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/60">
      <nav className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <img src={csLogo} alt="Cash Stage logo" width={36} height={36} className="h-9 w-9" />
          <span className="font-display text-2xl tracking-wider">
            CASH <span className="text-gradient-primary">STAGE</span>
          </span>
        </Link>
        <ul className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  pathname === l.to
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        {user ? (
          <div className="hidden sm:flex items-center gap-2">
            <Link
              to="/app"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent text-accent-foreground font-bold text-sm hover:scale-105 transition-transform glow-gold"
            >
              Enter Stage
            </Link>
            <button
              onClick={signOut}
              className="h-9 w-9 grid place-items-center rounded-full bg-secondary hover:bg-secondary/70"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Link
            to="/auth"
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent text-accent-foreground font-bold text-sm hover:scale-105 transition-transform glow-gold"
          >
            Sign In
          </Link>
        )}
      </nav>
    </header>
  );
};

export default SiteNav;
