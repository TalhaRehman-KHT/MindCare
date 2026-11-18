import { useContext, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AdminContext } from "../context/AdminContext";
import { DoctorContext } from "../context/DoctorContext";
import { assets } from "../assets/assets";
import { IconCalendar, IconClock, IconHome, IconPlus, IconShield, IconUser, IconUsers, IconX } from "./ui";

const ADMIN_LINKS = [
  { to: "/admin-dashboard", label: "Dashboard", icon: IconHome },
  { to: "/appointment-page", label: "Appointments", icon: IconCalendar },
  { to: "/add-doctor", label: "Add Doctor", icon: IconPlus },
  { to: "/doctors-list", label: "Doctors List", icon: IconUsers },
  { to: "/doctor-requests", label: "Doctor Requests", icon: IconShield, badge: "pending" },
];
const DOCTOR_LINKS = [
  { to: "/doctor-dashboard", label: "Dashboard", icon: IconHome },
  { to: "/doctor-appointments", label: "Appointments", icon: IconCalendar },
  { to: "/doctor-patients", label: "My Patients", icon: IconUsers },
  { to: "/doctor-schedule", label: "My Schedule", icon: IconClock },
  { to: "/doctor-profile", label: "Profile", icon: IconUser },
];

/**
 * Desktop (lg+): full sidebar with labels.
 * Tablet (md): collapses to an icon rail.
 * Mobile (<md): off-canvas drawer opened from the navbar.
 */
const Sidebar = ({ open, onClose }) => {
  const { aToken, pendingCount } = useContext(AdminContext);
  const { dToken } = useContext(DoctorContext);
  const { pathname } = useLocation();
  const links = aToken ? ADMIN_LINKS : dToken ? DOCTOR_LINKS : [];

  useEffect(() => onClose(), [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 z-(--z-drawer) bg-black/40 transition-opacity duration-300 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        aria-label="Sidebar"
        className={`fixed inset-y-0 left-0 z-(--z-drawer) flex w-64 flex-col border-r border-line bg-surface pt-[env(safe-area-inset-top)] transition-[transform,visibility] duration-300 ease-out-soft md:sticky md:top-0 md:z-auto md:h-dvh md:w-20 md:translate-x-0 lg:w-64 ${
          open ? "translate-x-0 shadow-lg" : "-translate-x-full max-md:invisible"
        }`}
      >
        <div className="flex h-(--nav-h) items-center justify-between gap-2 px-4 md:justify-center lg:justify-start">
          <div className="flex items-center gap-2.5">
            <img src={assets.logo} alt="" width="40" height="40" className="size-10 rounded-full" />
            <span className="font-display font-bold md:hidden lg:inline">MindCare</span>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon md:hidden" aria-label="Close menu">
            <IconX />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
          <ul className="flex flex-col gap-1">
            {links.map(({ to, label, icon: Icon, badge }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  title={label}
                  className={({ isActive }) =>
                    `group flex min-h-12 items-center gap-3 rounded-xl px-3.5 font-medium transition-colors duration-150 md:justify-center lg:justify-start ${
                      isActive
                        ? "bg-brand-soft text-brand-strong"
                        : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                    }`
                  }
                >
                  <span className="relative">
                    <Icon className="transition-transform duration-200 group-hover:scale-110" />
                    {badge && pendingCount > 0 && (
                      <span className="absolute -right-2 -top-2 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[0.65rem] font-bold leading-5 text-white lg:hidden">{pendingCount}</span>
                    )}
                  </span>
                  <span className="md:sr-only lg:not-sr-only">{label}</span>
                  {badge && pendingCount > 0 && (
                    <span className="ml-auto hidden min-w-6 rounded-full bg-danger px-1.5 text-center text-xs font-bold leading-6 text-white lg:inline-block" aria-label={pendingCount + " pending"}>{pendingCount}</span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
