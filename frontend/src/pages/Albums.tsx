import { useSearchParams } from "react-router-dom";
import { useCatalog } from "../lib/catalog";
import AlbumCard from "../components/AlbumCard";
import CatalogFeedback from "../components/CatalogFeedback";
import CatalogSearch from "../components/CatalogSearch";
import PageHeading from "../components/PageHeading";
export default function AlbumsPage() {
  const catalog = useCatalog();
  const [params] = useSearchParams();
  const query = (params.get("q") ?? "").toLocaleLowerCase();
  const albums =
    catalog.data?.albums.filter((album) =>
      `${album.title} ${album.artist} ${album.year}`
        .toLocaleLowerCase()
        .includes(query),
    ) ?? [];
  return (
    <div className="page-container">
      <PageHeading
        kicker="02 / THE RELEASES"
        title="Albums"
        description="Альбомы и сборники нашей команды. Всё в одном месте."
        count={catalog.data?.albums.length}
      />
      <div className="catalog-toolbar">
        <CatalogSearch placeholder="Альбом, артист или год" />
      </div>
      <CatalogFeedback
        loading={catalog.isPending}
        error={catalog.error}
        retry={catalog.refetch}
      >
        <div className="card-grid">
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
        {!albums.length && (
          <div className="empty-state">
            {query
              ? "Релизы не найдены. Попробуй другой запрос."
              : "Новые релизы появятся здесь."}
          </div>
        )}
      </CatalogFeedback>
    </div>
  );
}
