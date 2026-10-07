import DirectionalArrow from "../components/DirectionalArrow";
import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <div className="page-container feedback">
      <span className="meta accent">404 / LOST IN SOUND</span>
      <h1>Страница не найдена</h1>
      <p>Проверь ссылку или перейди к трекам.</p>
      <Link className="button" to="/beats">
        Открыть треки <DirectionalArrow />
      </Link>
    </div>
  );
}
