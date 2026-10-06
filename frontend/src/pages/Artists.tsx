import { useSearchParams } from "react-router-dom";
import { useCatalog } from "../lib/catalog";
import ArtistCard from "../components/ArtistCard";
import CatalogFeedback from "../components/CatalogFeedback";
import CatalogSearch from "../components/CatalogSearch";
import PageHeading from "../components/PageHeading";
export default function ArtistsPage() {
  const catalog = useCatalog();
  const [params] = useSearchParams();
  const query = (params.get("q") ?? "").toLocaleLowerCase();
  const artists =
    catalog.data?.artists.filter((artist) =>
      `${artist.name} ${artist.bio}`.toLocaleLowerCase().includes(query),
    ) ?? [];
  return (
    <div className="page-container">
      <PageHeading
        kicker="03 / THE PEOPLE"
        title="Артисты"
        description="Разные голоса. Один независимый звук. Знакомься с Raw Crownz."
        count={catalog.data?.artists.length}
      />
      <div className="catalog-toolbar">
        <CatalogSearch placeholder="Найти артиста" />
      </div>
      <CatalogFeedback
        loading={catalog.isPending}
        error={catalog.error}
        retry={catalog.refetch}
      >
        <div className="card-grid">
          {artists.map((artist, index) => (
            <ArtistCard key={artist.id} artist={artist} index={index} />
          ))}
        </div>
        {!artists.length && (
          <div className="empty-state">
            {query
              ? "Артист не найден. Попробуй другой запрос."
              : "Скоро здесь появятся наши артисты."}
          </div>
        )}
      </CatalogFeedback>
    </div>
  );
}
