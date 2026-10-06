import { useSearchParams } from "react-router-dom";
import { Play } from "lucide-react";
import { useCatalog } from "../lib/catalog";
import { usePlayerStore } from "../store/AudioPlayerStore";
import TrackCard from "../components/TrackCard";
import CatalogFeedback from "../components/CatalogFeedback";
import CatalogSearch from "../components/CatalogSearch";
import PageHeading from "../components/PageHeading";

export default function BeatsPage() {
  const catalog = useCatalog();
  const [params] = useSearchParams();
  const query = (params.get("q") ?? "").toLocaleLowerCase();
  const tracks =
    catalog.data?.tracks.filter((track) =>
      `${track.title} ${track.producer} ${catalog.data?.albums.find((album) => album.id === track.albumId)?.title ?? ""}`
        .toLocaleLowerCase()
        .includes(query),
    ) ?? [];
  return (
    <div className="page-container">
      <PageHeading
        kicker="01 / THE SOUND"
        title="Все треки"
        description="Сырой звук. Честный грув. Нажми play и оставайся на волне."
        count={catalog.data?.tracks.length}
      />
      <div className="catalog-toolbar">
        <CatalogSearch placeholder="Трек, артист или альбом" />
        <button
          className="button"
          disabled={!tracks.some((track) => track.audioUrl)}
          onClick={() => {
            const track = tracks.find((item) => item.audioUrl);
            if (track) usePlayerStore.getState().play(track, tracks);
          }}
        >
          <Play size={18} /> Слушать всё
        </button>
      </div>
      <CatalogFeedback
        loading={catalog.isPending}
        error={catalog.error}
        retry={catalog.refetch}
      >
        <div className="list-caption">
          <span>ТРЕК / АРТИСТ</span>
          <span>{tracks.length} В КАТАЛОГЕ</span>
        </div>
        <div className="track-list">
          {tracks.map((track, index) => (
            <TrackCard
              key={track.id}
              track={track}
              index={index}
              queue={tracks}
              album={catalog.data?.albums.find(
                (album) => album.id === track.albumId,
              )}
            />
          ))}
        </div>
        {!tracks.length && (
          <div className="empty-state">
            {query
              ? "Ничего не найдено. Попробуй другой запрос."
              : "Первый звук уже на подходе. Треки появятся здесь."}
          </div>
        )}
      </CatalogFeedback>
    </div>
  );
}
