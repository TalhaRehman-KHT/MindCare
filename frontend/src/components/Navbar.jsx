import { useContext, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { assets } from "../assets/assets";
import { AppContext } from "../../context/AppContext";
import { ASSISTANT_NAME, SITE_NAME } from "../config.js";
import useTheme from "../hooks/useTheme.js";
import {
  Avatar,
  Button,
  Container,
  IconCalendar,
  IconChat,
  IconChevronDown,
  IconLogout,
  IconMenu,
  IconMoon,
  IconSun,
  IconUser,
  IconX,
} from "./ui";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/doctors", label: "All Doctors" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

const ThemeToggle = () => {
  const { theme, toggle } = useTheme();
  return (
    <Button
      variant="ghost"
      iconOnly
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      {theme === "dark" ? <IconSun /> : <IconMoon />}
    </Button>
  );
};

const UserMenu = ({ userData, onLogout }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "flex min-h-11 items-center gap-3 rounded-lg px-3 text-small font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex min-h-11 items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-surface-2"
      >
        <Avatar src={userData.img} name={userData.name} size={34} />
        <IconChevronDown size={16} className={`text-ink-subtle transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        <span className="sr-only">Account menu</span>
      </button>
      {open && (
        <div role="menu" className="card anim-scale-in absolute right-0 top-full mt-2 w-56 origin-top-right p-2 shadow-lg">
          <p className="truncate px-3 pb-2 pt-1 text-small font-semibold">{userData.name}</p>
          <Link role="menuitem" to="/my-profile" className={item}>
            <IconUser size={18} /> My Profile
          </Link>
          <Link role="menuitem" to="/my-appointments" className={item}>
            <IconCalendar size={18} /> My Appointments
          </Link>
          <button role="menuitem" type="button" onClick={onLogout} className={`${item} w-full hover:text-danger-strong`}>
            <IconLogout size={18} /> Logout
          </button>
        </div>
      )}
    </div>
  );
};

const Navbar = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { token, setToken, userData } = useContext(AppContext);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [drawer]);

  const logout = () => {
    setToken(false);
    localStorage.removeItem("token");
    navigate("/login");
    toast.error("Signed Out");
  };

  const signedIn = token && userData;

  return (
    <>
    <header className="vt-nav surface-glass sticky top-0 z-(--z-sticky) border-b border-line/70 pt-[env(safe-area-inset-top)]">
      <Container className="flex h-(--nav-h) items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5" aria-label={`${SITE_NAME} home`}>
          <img src={assets.logo} alt="" width="44" height="44" className="size-11 rounded-full" />
          <span className="font-display text-lg font-bold tracking-tight">{SITE_NAME}</span>
        </Link>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-5">
            {LINKS.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to} end={l.end} className="nav-link">
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button as={Link} to="/chatbot" variant="secondary" className="hidden lg:inline-flex">
            <IconChat size={18} /> {ASSISTANT_NAME}
          </Button>
          {signedIn ? (
            <UserMenu userData={userData} onLogout={logout} />
          ) : (
            <>
              <Link to="/login?role=doctor&mode=signup" className="nav-link hidden text-small xl:inline-flex">
                Join as a Doctor
              </Link>
              <Button as={Link} to="/login" size="sm" className="hidden md:inline-flex">
                Sign in
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            iconOnly
            className="md:hidden"
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
            aria-expanded={drawer}
            aria-controls="mobile-drawer"
          >
            <IconMenu />
          </Button>
        </div>
      </Container>
    </header>

      {/* Mobile drawer (outside the header: backdrop-filter would trap position:fixed) */}
      <div
        className={`fixed inset-0 z-(--z-drawer) bg-black/40 transition-opacity duration-300 md:hidden ${
          drawer ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setDrawer(false)}
        aria-hidden="true"
      />
      <aside
        id="mobile-drawer"
        aria-label="Menu"
        inert={!drawer}
        className={`fixed inset-y-0 right-0 z-(--z-drawer) flex w-[min(20rem,86vw)] flex-col gap-2 bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-lg transition-transform duration-300 ease-out-soft md:hidden ${
          drawer ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="font-display text-lg font-bold">{SITE_NAME}</span>
          <Button variant="ghost" iconOnly onClick={() => setDrawer(false)} aria-label="Close menu">
            <IconX />
          </Button>
        </div>
        <nav aria-label="Mobile">
          <ul className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    `flex min-h-12 items-center rounded-xl px-4 font-medium transition-colors ${
                      isActive ? "bg-brand-soft text-brand-strong" : "text-ink-muted hover:bg-surface-2"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto flex flex-col gap-2 border-t border-line pt-4">
          <Button as={Link} to="/chatbot" variant="secondary" block>
            <IconChat size={18} /> Chat with {ASSISTANT_NAME}
          </Button>
          {signedIn ? (
            <>
              <Button as={Link} to="/my-appointments" variant="outline" block>
                My Appointments
              </Button>
              <Button variant="ghost" block onClick={logout}>
                <IconLogout size={18} /> Logout
              </Button>
            </>
          ) : (
            <>
              <Button as={Link} to="/login" block>
                Sign in
              </Button>
              <Button as={Link} to="/login?role=doctor&mode=signup" variant="ghost" block>
                Join as a Doctor
              </Button>
            </>
          )}
        </div>
      </aside>
    </>
  );
};

export default Navbar;
