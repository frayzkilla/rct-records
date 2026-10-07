import { useCatalog } from "../lib/catalog";
import ArtistCard from "../components/ArtistCard";
import CatalogFeedback from "../components/CatalogFeedback";
import PageHeading from "../components/PageHeading";
export default function ArtistsPage() {
  const catalog = useCatalog();
  const artists = catalog.data?.artists ?? [];
  return (
    <div className="page-container">
      <PageHeading
        kicker="03 / THE PEOPLE"
        title="The crew."
        description="Кто делает биты, читает рэп и записывает миксы в Raw Crownz."
        count={catalog.data?.artists.length}
      />
      <CatalogFeedback
        loading={catalog.isPending}
        error={catalog.error}
        retry={catalog.refetch}
      >
        <div className="crew-intro">
          <span className="meta">SIBERIA / INDEPENDENT SOUND</span>
          <p>Разные люди.<br /><em>Общий звук.</em></p>
          <span className="crew-mark" aria-hidden="true">↙</span>
        </div>
        <div className="crew-grid">
          {artists.map((artist, index) => (
            <ArtistCard key={artist.id} artist={artist} index={index} />
          ))}
        </div>
        {!artists.length && (
          <div className="empty-state">
            Скоро здесь появятся наши артисты.
          </div>
        )}
      </CatalogFeedback>
    </div>
  );
}
