import { Link, useParams } from "react-router-dom";
import { Play, ArrowUpRight } from "lucide-react";
import { useCatalog } from "../lib/catalog";
import { usePlayerStore } from "../store/AudioPlayerStore";
import Artwork from "../components/Artwork";
import AlbumCard from "../components/AlbumCard";
import TrackCard from "../components/TrackCard";
import Waveform from "../components/Waveform";
import CatalogFeedback from "../components/CatalogFeedback";

export default function EntityPage({
  kind,
}: {
  kind: "artist" | "album" | "track";
}) {
  const { id } = useParams();
  const catalog = useCatalog();
  const data = catalog.data;
  const artist =
    kind === "artist"
      ? data?.artists.find((item) => item.id === Number(id))
      : undefined;
  const album =
    kind === "album"
      ? data?.albums.find((item) => item.id === Number(id))
      : undefined;
  const track =
    kind === "track"
      ? data?.tracks.find((item) => item.id === Number(id))
      : undefined;
  const owner =
    artist ??
    data?.artists.find(
      (item) => item.id === (album?.artistId ?? track?.artistId),
    );
  const release =
    album ?? data?.albums.find((item) => item.id === track?.albumId);
  const exists = artist ?? album ?? track;
  const title = artist?.name ?? album?.title ?? track?.title ?? "";
  const collection =
    kind === "artist" ? "/artists" : kind === "album" ? "/albums" : "/beats";
  const label =
    kind === "artist" ? "Артисты" : kind === "album" ? "Альбомы" : "Треки";
  const tracks =
    data?.tracks.filter((item) =>
      kind === "artist"
        ? item.artistId === artist?.id
        : kind === "album"
          ? item.albumId === album?.id
          : track?.albumId
            ? item.albumId === track.albumId
            : item.artistId === track?.artistId,
    ) ?? [];
  const albums =
    data?.albums.filter((item) => item.artistId === owner?.id) ?? [];
  const playable = tracks.filter((item) => item.audioUrl);
  const related =
    kind === "track" ? tracks.filter((item) => item.id !== track?.id) : tracks;
  return (
    <div className="page-container">
      <CatalogFeedback
        loading={catalog.isPending}
        error={catalog.error}
        retry={catalog.refetch}
      >
        {exists ? (
          <>
            <nav className="breadcrumbs" aria-label="Хлебные крошки">
              <Link to="/">Главная</Link>
              <span>/</span>
              <Link to={collection}>{label}</Link>
              {kind === "track" && release && (
                <>
                  <span>/</span>
                  <Link to={`/albums/${release.id}`}>{release.title}</Link>
                </>
              )}
              <span>/</span>
              <span aria-current="page">{title}</span>
            </nav>
            <section className={`entity-hero entity-${kind}`}>
              <Artwork
                className="entity-art"
                src={artist?.avatarUrl ?? album?.coverUrl ?? track?.coverUrl}
                title={title}
              />
              <div className="entity-copy">
                <span className="eyebrow accent">
                  {kind === "artist"
                    ? "THE ARTIST"
                    : kind === "album"
                      ? `ALBUM / ${album?.year}`
                      : "TRACK / RAW SOUND"}
                </span>
                <h1>{title}</h1>
                <div className="entity-relations">
                  {kind !== "artist" && (
                    <Link to={`/artists/${album?.artistId ?? track?.artistId}`}>
                      {owner?.name ?? album?.artist ?? track?.producer}{" "}
                      <ArrowUpRight size={16} />
                    </Link>
                  )}
                  {kind === "track" && release && (
                    <Link to={`/albums/${release.id}`}>
                      {release.title} <ArrowUpRight size={16} />
                    </Link>
                  )}
                  {kind === "track" && !release && (
                    <span className="meta">Сингл / без альбома</span>
                  )}
                  {kind !== "track" && (
                    <span className="meta">
                      {tracks.length} треков
                      {kind === "artist" ? ` / ${albums.length} альбомов` : ""}
                    </span>
                  )}
                </div>
                {artist?.bio && <p className="entity-bio">{artist.bio}</p>}
                <button
                  className="button"
                  disabled={track ? !track.audioUrl : !playable.length}
                  onClick={() => {
                    const first = track ?? playable[0];
                    if (first) usePlayerStore.getState().play(first, tracks);
                  }}
                >
                  <Play size={18} fill="currentColor" />
                  {kind === "artist"
                    ? "Слушать артиста"
                    : kind === "album"
                      ? "Слушать альбом"
                      : "Слушать трек"}
                </button>
                {track?.audioUrl && (
                  <Waveform
                    key={track.audioUrl}
                    track={track}
                    queue={tracks}
                    height={72}
                  />
                )}
              </div>
            </section>
            {kind === "artist" && (
              <section className="entity-section">
                <div className="section-heading">
                  <div>
                    <span className="meta accent">DISCOGRAPHY</span>
                    <h2>
                      Альбомы <sup>{albums.length}</sup>
                    </h2>
                  </div>
                </div>
                <div className="card-grid">
                  {albums.map((item) => (
                    <AlbumCard key={item.id} album={item} />
                  ))}
                </div>
                {!albums.length && (
                  <div className="empty-state">
                    У артиста пока нет альбомов. Слушай отдельные треки ниже.
                  </div>
                )}
              </section>
            )}
            <section className="entity-section">
              <div className="section-heading">
                <div>
                  <span className="meta accent">KEEP LISTENING</span>
                  <h2>
                    {kind === "track"
                      ? release
                        ? "Ещё из альбома"
                        : "Ещё от артиста"
                      : "Треки"}{" "}
                    <sup>{related.length}</sup>
                  </h2>
                </div>
                {release && kind === "track" && (
                  <Link to={`/albums/${release.id}`}>Весь альбом ↗</Link>
                )}
              </div>
              <div className="track-list">
                {related.map((item, index) => (
                  <TrackCard
                    key={item.id}
                    track={item}
                    index={index}
                    queue={tracks}
                    album={data?.albums.find(
                      (value) => value.id === item.albumId,
                    )}
                  />
                ))}
              </div>
              {!related.length && (
                <div className="empty-state">
                  {kind === "track"
                    ? "Пока это единственный трек. Открой каталог и найди новый звук."
                    : "Здесь пока нет треков."}
                  <Link to="/beats">Все треки ↗</Link>
                </div>
              )}
            </section>
            {kind === "album" && owner && (
              <Link to={`/artists/${owner.id}`} className="artist-banner">
                <Artwork src={owner.avatarUrl} title={owner.name} />
                <div>
                  <span className="meta">BEHIND THE RELEASE</span>
                  <h2>{owner.name}</h2>
                  <span>Все альбомы и треки артиста</span>
                </div>
                <ArrowUpRight />
              </Link>
            )}
          </>
        ) : (
          <div className="feedback">
            <span className="meta accent">404 / NOT FOUND</span>
            <h1>Запись не найдена</h1>
            <p>Возможно, релиз удалён или ссылка изменилась.</p>
            <Link className="button" to={collection}>
              Вернуться в каталог ↗
            </Link>
          </div>
        )}
      </CatalogFeedback>
    </div>
  );
}
