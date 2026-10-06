import { Link } from "react-router-dom";
import { ArrowDown, ArrowUpRight, Play, Shuffle } from "lucide-react";
import { useCatalog } from "../lib/catalog";
import { usePlayerStore } from "../store/AudioPlayerStore";
import Crown from "../components/Crown";
import AlbumCard from "../components/AlbumCard";
import TrackCard from "../components/TrackCard";
import CatalogFeedback from "../components/CatalogFeedback";
export default function Home() {
  const catalog = useCatalog();
  const tracks = catalog.data?.tracks ?? [];
  const playable = tracks.filter((track) => track.audioUrl);
  const play = usePlayerStore((state) => state.play);
  return (
    <>
      <section className="hero">
        <div className="hero-stage">
          <div className="hero-composition">
            <div className="hero-type">
              <span className="hero-echo display" aria-hidden="true">
                RAW
              </span>
              <h1 className="display">
                RAW
                <br />
                <span>CROWNZ</span>
              </h1>
              <div className="records-line">
                <span className="records-word">RECORDS</span>
                <span className="hero-rule" />
              </div>
            </div>
            <div className="hero-art">
              <Crown className="hero-crown" variant={2} />
              <span className="hero-sticker">
                100% RAW
                <br />
                0% FILTER
              </span>
              <span className="hero-art-label">
                ALL GAS.
                <br />
                NO BRAKES.
              </span>
              <div className="graphic-bars" aria-hidden="true">
                {Array.from({ length: 40 }, (_, index) => (
                  <i
                    key={index}
                    style={{
                      height: `${12 + Math.abs(Math.sin(index * 2.4)) * 70}%`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="ticker" aria-hidden="true">
            <div>
              {Array.from({ length: 6 }, (_, index) => (
                <span key={index}>
                  STRAIGHT OUTTA SIBERIA <b>✳</b> RAW CROWNZ RECORDS <b>✳</b>{" "}
                  BEATS / BARS / MIXES <b>✳</b> LOWKEY LOUD <b>✳</b>
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="hero-bottom">
          <p>
            Здесь музыка от наших парней.
            <br />
            Звук из Сибири в разных жанрах.
          </p>
          <div className="hero-actions">
            <Link className="button" to="/beats">
              <Play size={18} fill="currentColor" /> Press play
            </Link>
            <button
              className="button button-outline"
              disabled={!playable.length}
              onClick={() =>
                play(
                  playable[Math.floor(Math.random() * playable.length)],
                  playable,
                )
              }
            >
              <Shuffle size={18} /> Surprise me
            </button>
          </div>
          <a className="hero-down" href="#latest" aria-label="Перейти к трекам">
            <ArrowDown />
          </a>
        </div>
      </section>
      <div className="page-container home-content" id="latest">
        <CatalogFeedback
          loading={catalog.isPending}
          error={catalog.error}
          retry={catalog.refetch}
        >
          <section>
            <div className="section-heading">
              <div>
                <span className="meta accent">01 / PRESS PLAY</span>
                <h2>Fresh uploads</h2>
              </div>
              <Link to="/beats">
                All tracks <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className="track-list">
              {tracks
                .slice(-5)
                .reverse()
                .map((track, index, queue) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    index={index}
                    queue={queue}
                    album={catalog.data?.albums.find(
                      (album) => album.id === track.albumId,
                    )}
                  />
                ))}
            </div>
            {!tracks.length && (
              <div className="empty-state">
                Пока нет треков. Добавим их сюда после загрузки.
              </div>
            )}
          </section>
          <section className="home-releases">
            <div className="section-heading">
              <div>
                <span className="meta accent">02 / RELEASES</span>
                <h2>Releases</h2>
              </div>
              <Link to="/albums">
                All albums <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className="card-grid">
              {catalog.data?.albums
                .slice(-4)
                .reverse()
                .map((album) => (
                  <AlbumCard key={album.id} album={album} />
                ))}
            </div>
            {!catalog.data?.albums.length && (
              <div className="empty-state">
                Альбомы появятся здесь после публикации.
              </div>
            )}
          </section>
        </CatalogFeedback>
        <Link className="collective-banner" to="/artists">
          <div>
            <span className="meta">RAW CROWNZ / THE CREW</span>
            <h2>Meet the homies</h2>
          </div>
          <Crown />
          <ArrowUpRight size={40} />
        </Link>
      </div>
    </>
  );
}
