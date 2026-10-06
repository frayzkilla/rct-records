import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <div className="page-container feedback">
      <span className="meta accent">404 / LOST IN SOUND</span>
      <h1>Здесь тишина.</h1>
      <p>Этой страницы нет. Но музыка рядом.</p>
      <Link className="button" to="/beats">
        Найти свой звук ↗
      </Link>
    </div>
  );
}
