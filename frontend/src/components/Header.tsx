import { Menu, X, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import Crown from "./Crown";

const links = [
  ["/beats", "Треки"],
  ["/albums", "Альбомы"],
  ["/artists", "Артисты"],
  ["/about", "О нас"],
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
          <Crown />
          <span>
            RAW CROWNZ<small>INDEPENDENT RECORDS</small>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Главная навигация">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to}>
              {label}
            </NavLink>
          ))}
        </nav>
        <Link className="header-cta" to="/beats">
          Найди свой звук <ArrowUpRight size={16} />
        </Link>
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
            <NavLink key={to} to={to} onClick={() => setOpen(false)}>
              {label}
              <ArrowUpRight />
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
