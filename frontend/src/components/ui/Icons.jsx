// Small inline icon set (stroke icons, 24px grid). No icon library needed.
const Svg = ({ children, size = 20, className = "", strokeWidth = 1.8, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    className={`shrink-0 ${className}`}
    {...rest}
  >
    {children}
  </svg>
);

export const IconMenu = (p) => <Svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>;
export const IconX = (p) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const IconCheck = (p) => <Svg {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
export const IconPlus = (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const IconArrowRight = (p) => <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>;
export const IconChevronLeft = (p) => <Svg {...p}><path d="M15 6l-6 6 6 6" /></Svg>;
export const IconChevronRight = (p) => <Svg {...p}><path d="M9 6l6 6-6 6" /></Svg>;
export const IconChevronDown = (p) => <Svg {...p}><path d="M6 9l6 6 6-6" /></Svg>;
export const IconHome = (p) => <Svg {...p}><path d="M4 10.5L12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" /></Svg>;
export const IconCalendar = (p) => <Svg {...p}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></Svg>;
export const IconClock = (p) => <Svg {...p}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 2.5" /></Svg>;
export const IconUser = (p) => <Svg {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></Svg>;
export const IconUsers = (p) => <Svg {...p}><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6" /><path d="M15.5 5.8a3 3 0 0 1 0 5.4M17.5 14.6c1.6.6 2.7 2 3 4.4" /></Svg>;
export const IconStethoscope = (p) => <Svg {...p}><path d="M6 3v5a4 4 0 0 0 8 0V3" /><path d="M10 12v2.5a5 5 0 0 0 10 0V13" /><circle cx="20" cy="11" r="2" /></Svg>;
export const IconList = (p) => <Svg {...p}><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></Svg>;
export const IconWallet = (p) => <Svg {...p}><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M16 12.5h2M3 9.5h18" /></Svg>;
export const IconSend = (p) => <Svg {...p}><path d="M5 12l15-7-5.5 15-2.5-6.5z" /><path d="M12 13.5L20 5" /></Svg>;
export const IconShield = (p) => <Svg {...p}><path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z" /><path d="M9 12l2.2 2.2L15.5 10" /></Svg>;
export const IconSparkles = (p) => <Svg {...p}><path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" /><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" /></Svg>;
export const IconChat = (p) => <Svg {...p}><path d="M5 18.5V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8.5z" /><path d="M9 10h6M9 13h3.5" /></Svg>;
export const IconSun = (p) => <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" /></Svg>;
export const IconMoon = (p) => <Svg {...p}><path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z" /></Svg>;
export const IconLogout = (p) => <Svg {...p}><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" /></Svg>;
export const IconMail = (p) => <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M4 7l8 6 8-6" /></Svg>;
export const IconPhone = (p) => <Svg {...p}><path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5V19a1.5 1.5 0 0 1-1.6 1.5C10.5 20 4 13.5 3.5 5.6A1.5 1.5 0 0 1 5 4z" /></Svg>;
export const IconMapPin = (p) => <Svg {...p}><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1 1 13 0C18.5 15.4 12 21 12 21z" /><circle cx="12" cy="10" r="2.3" /></Svg>;
export const IconInfo = (p) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></Svg>;
export const IconVerified = (p) => <Svg {...p}><path d="M12 3l2.4 1.8 3 .2.9 2.9 2 2.2-1 2.9 1 2.9-2 2.2-.9 2.9-3 .2L12 21l-2.4-1.8-3-.2-.9-2.9-2-2.2 1-2.9-1-2.9 2-2.2.9-2.9 3-.2z" /><path d="M9 12l2 2 4-4" /></Svg>;
export const IconUpload = (p) => <Svg {...p}><path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" /></Svg>;
export const IconTrash = (p) => <Svg {...p}><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" /></Svg>;
export const IconHeart = (p) => <Svg {...p}><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z" /></Svg>;
export const IconLock = (p) => <Svg {...p}><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></Svg>;
export const IconSearch = (p) => <Svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></Svg>;
