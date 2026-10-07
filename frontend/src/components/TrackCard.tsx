import { Pause, Play } from "lucide-react";
import { Link } from "react-router-dom";
import type { Track, Album } from "../lib/catalog";
import { usePlayerStore } from "../store/AudioPlayerStore";
import Artwork from "./Artwork";
import Waveform from "./Waveform";
import LikeButton from "./LikeButton";
export default function TrackCard({
  track,
  queue,
  album,
  index = 0,
}: {
  track: Track;
  queue: Track[];
  album?: Album;
  index?: number;
}) {
  const active = usePlayerStore((state) => state.current?.id === track.id);
  const playing = usePlayerStore((state) => state.isPlaying);
  const play = usePlayerStore((state) => state.play);
  const toggle = usePlayerStore((state) => state.toggle);
  return (
    <article className={`track-row ${active ? "is-active" : ""}`}>
      <span className="track-number">{String(index + 1).padStart(2, "0")}</span>
      <button
        className="play-button"
        aria-label={`${active && playing ? "Пауза" : "Слушать"}: ${track.title}`}
        disabled={!track.audioUrl}
        onClick={() => (active && playing ? toggle() : play(track, queue))}
      >
        {active && playing ? (
          <Pause size={20} fill="currentColor" />
        ) : (
          <Play size={20} fill="currentColor" />
        )}
      </button>
      <Link to={`/beats/${track.id}`} className="track-art">
        <Artwork src={album?.coverUrl || track.coverUrl} title={track.title} />
      </Link>
      <div className="track-info">
        <Link className="track-title" to={`/beats/${track.id}`}>
          {track.title}
        </Link>
        <div className="track-meta">
          <Link to={`/artists/${track.artistId}`}>
            {track.producer || "Артист"}
          </Link>
          {album && (
            <>
              <span>/</span>
              <Link to={`/albums/${album.id}`}>{album.title}</Link>
            </>
          )}
        </div>
      </div>
      <div className="track-wave">
        {track.audioUrl ? (
          <Waveform track={track} queue={queue} />
        ) : (
          <span className="meta">Аудио недоступно</span>
        )}
      </div>
      <div className="track-actions">
        <LikeButton track={track} />
        <Link
          className="track-detail"
          to={`/beats/${track.id}`}
          aria-label={`Открыть трек ${track.title}`}
        >
          ↗
        </Link>
      </div>
    </article>
  );
}
