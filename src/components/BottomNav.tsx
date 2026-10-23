import { NavLink } from "react-router";

type NavIconName = "search" | "book" | "users";

function NavIcon({ name }: { name: NavIconName }) {
  const paths = {
    search: (
      <>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    book: (
      <>
        <path d="M12 6c-2.1-1.7-5.3-2-9-1.5V19c3.7-.5 6.9-.2 9 1.5" />
        <path d="M12 6c2.1-1.7 5.3-2 9-1.5V19c-3.7-.5-6.9-.2-9 1.5" />
        <path d="M12 6v14.5" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8.2" r="3" />
        <path d="M3.5 19v-1.3a5.5 5.5 0 0 1 11 0V19" />
        <path d="M16 5.8a3 3 0 0 1 0 5.8M17.3 13a4.5 4.5 0 0 1 3.2 4.3V19" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

const items: { to: string; label: string; icon: NavIconName; end?: boolean }[] = [
  { to: "/", label: "Dinner", icon: "search", end: true },
  { to: "/library", label: "Recipe Library", icon: "book" },
  { to: "/profiles", label: "Profiles", icon: "users" },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {items.map(({ to, label, icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `nav-item${isActive ? " nav-item--active" : ""}`
          }
        >
          <NavIcon name={icon} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
