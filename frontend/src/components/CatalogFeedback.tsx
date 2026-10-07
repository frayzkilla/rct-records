import DirectionalArrow from "./DirectionalArrow";
import type { ReactNode } from "react";
export default function CatalogFeedback({
  loading,
  error,
  retry,
  children,
}: {
  loading: boolean;
  error: Error | null;
  retry: () => unknown;
  children: ReactNode;
}) {
  if (loading)
    return (
      <div className="feedback" role="status">
        <span className="meta">LOADING / ЗАГРУЗКА</span>
        <p>Загружаем каталог…</p>
        <div className="loading-line" />
      </div>
    );
  if (error)
    return (
      <div className="feedback" role="alert">
        <span className="meta">CONNECTION / ERROR</span>
        <h2>Каталог пока недоступен</h2>
        <p>{error.message}</p>
        <button className="button" onClick={retry}>
          Повторить запрос <DirectionalArrow />
        </button>
      </div>
    );
  return children;
}
