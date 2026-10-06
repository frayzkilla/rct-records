import { Search, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
export default function CatalogSearch({
  placeholder,
}: {
  placeholder: string;
}) {
  const [params, setParams] = useSearchParams();
  const value = params.get("q") ?? "";
  const update = (query: string) => {
    const next = new URLSearchParams(params);
    if (query) next.set("q", query);
    else next.delete("q");
    setParams(next, { replace: true });
  };
  return (
    <div className="catalog-search">
      <Search size={20} />
      <input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => update(event.target.value)}
      />
      {value && (
        <button
          className="icon-button"
          aria-label="Очистить поиск"
          onClick={() => update("")}
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}
