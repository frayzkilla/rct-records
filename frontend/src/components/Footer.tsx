import { Link } from "react-router-dom";
import Crown from "./Crown";
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-mark">
        <Crown />
        <span>RAW CROWNZ RECORDS</span>
      </div>
      <div className="footer-links">
        <Link to="/beats">Слушать</Link>
        <Link to="/about">О команде</Link>
        <Link to="/admin">Вход для артистов ↗</Link>
      </div>
      <span className="meta">
        © {new Date().getFullYear()} / INDEPENDENT SOUND
      </span>
    </footer>
  );
}
