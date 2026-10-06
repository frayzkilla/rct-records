import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import Crown from "./Crown";

const links = [
  ["/beats", "Треки"],
  ["/albums", "Альбомы"],
  ["/artists", "Артисты"],
  ["/about", "О нас"],
  ["/admin", "Для артистов"],
];
export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link
          className="brand"
          to="/"
          onClick={() => setOpen(false)}
          aria-label="Raw Crownz Records — главная"
        >
          <Crown variant={3} />
          <span>
            RAW CROWNZ<small>RECORDS / SIBERIA</small>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Главная навигация">
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              className={({ isActive }) =>
                `nav-tab ${isActive ? "active" : ""}`
              }
            >
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button
          className="menu-toggle icon-button"
          aria-label={open ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav
          id="mobile-nav"
          className="mobile-nav"
          aria-label="Мобильная навигация"
        >
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              onClick={() => setOpen(false)}
            >
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
