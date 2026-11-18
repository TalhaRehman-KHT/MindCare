import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AdminContext } from "../context/AdminContext";
import { DoctorContext } from "../context/DoctorContext";
import useTheme from "../hooks/useTheme.js";
import { Badge, Button, IconLogout, IconMenu, IconMoon, IconSun } from "./ui";

const Navbar = ({ onMenu }) => {
  const { aToken, setAToken } = useContext(AdminContext);
  const { dToken, setdToken } = useContext(DoctorContext);
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const logout = () => {
    aToken && setAToken("");
    aToken && localStorage.removeItem("aToken");
    dToken && setdToken("");
    dToken && localStorage.removeItem("dToken");
    navigate("/login", { replace: true });
  };

  return (
    <header className="vt-nav surface-glass sticky top-0 z-(--z-sticky) border-b border-line pt-[env(safe-area-inset-top)]">
      <div className="flex h-(--nav-h) items-center justify-between gap-3 px-(--gutter)">
        <div className="flex items-center gap-2">
          <Button variant="ghost" iconOnly className="md:hidden" onClick={onMenu} aria-label="Open menu">
            <IconMenu />
          </Button>
          <span className="hidden font-display font-semibold sm:inline">{aToken ? "Admin panel" : "Doctor panel"}</span>
          <Badge tone="brand">{aToken ? "Admin" : "Doctor"}</Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            iconOnly
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? <IconSun /> : <IconMoon />}
          </Button>
          <Button variant="outline" size="sm" onClick={logout}>
            <IconLogout size={16} /> Logout
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
