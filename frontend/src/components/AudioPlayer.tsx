import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ListMusic,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCatalog, formatTime } from "../lib/catalog";
import { usePlayerStore } from "../store/AudioPlayerStore";
import Artwork from "./Artwork";
import Waveform from "./Waveform";

export default function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [queueOpen, setQueueOpen] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const queueButtonRef = useRef<HTMLButtonElement>(null);
  const rememberedVolume = useRef(0.8);
  const catalog = useCatalog();
  const {
    current,
    queue,
    isPlaying,
    currentTime,
    duration,
    volume,
    seekTarget,
    error,
    toggle,
    next,
    previous,
    seek,
    play,
  } = usePlayerStore();
  const playable = catalog.data?.tracks.filter((track) => track.audioUrl) ?? [];
  const album = catalog.data?.albums.find(
    (item) => item.id === current?.albumId,
  );

  useEffect(() => {
    if (!catalog.data) return;
    const tracks = catalog.data.tracks.filter((track) => track.audioUrl);
    usePlayerStore.setState((state) => {
      if (state.current || !tracks.length) return { catalog: tracks };
      const selected = tracks[Math.floor(Math.random() * tracks.length)];
      return {
        catalog: tracks,
        current: selected,
        queue: tracks,
        isPlaying: false,
      };
    });
  }, [catalog.data]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    audio.src = current.audioUrl;
    audio.load();
    return () => {
      audio.pause();
    };
  }, [current]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (isPlaying) {
      const source = current.audioUrl;
      audio.play().catch((reason: DOMException) => {
        if (
          reason.name === "AbortError" ||
          usePlayerStore.getState().current?.audioUrl !== source
        )
          return;
        usePlayerStore.setState({
          isPlaying: false,
          error:
            reason.name === "NotAllowedError"
              ? "Нажми play, чтобы начать воспроизведение."
              : "Не удалось воспроизвести аудио. Попробуй ещё раз или выбери другой трек.",
        });
      });
    } else audio.pause();
  }, [isPlaying, current, seekTarget.serial]);
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);
  useEffect(() => {
    if (!("mediaSession" in navigator) || !current) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.producer,
      album: album?.title ?? "Raw Crownz Records",
      artwork: (album?.coverUrl || current.coverUrl)
        ? [{ src: new URL(album?.coverUrl || current.coverUrl, window.location.href).href }]
        : [],
    });
    const handlers: Partial<
      Record<MediaSessionAction, MediaSessionActionHandler>
    > = {
      play: () => usePlayerStore.setState({ isPlaying: true, error: "" }),
      pause: () => usePlayerStore.setState({ isPlaying: false }),
      nexttrack: next,
      previoustrack: previous,
      seekto: (details) => {
        if (details.seekTime !== undefined) seek(details.seekTime);
      },
      seekbackward: (details) =>
        seek(
          Math.max(
            0,
            usePlayerStore.getState().currentTime - (details.seekOffset ?? 10),
          ),
        ),
      seekforward: (details) => {
        const state = usePlayerStore.getState();
        seek(
          Math.min(
            state.duration,
            state.currentTime + (details.seekOffset ?? 10),
          ),
        );
      },
    };
    for (const [action, handler] of Object.entries(handlers)) {
      try {
        navigator.mediaSession.setActionHandler(
          action as MediaSessionAction,
          handler,
        );
      } catch {
        continue;
      }
    }
    return () => {
      for (const action of Object.keys(handlers)) {
        try {
          navigator.mediaSession.setActionHandler(
            action as MediaSessionAction,
            null,
          );
        } catch {
          continue;
        }
      }
    };
  }, [current, album?.title, album?.coverUrl, next, previous, seek]);
  useEffect(() => {
    if ("mediaSession" in navigator)
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && audio.readyState >= 1 && Number.isFinite(audio.duration)) {
      audio.currentTime = Math.min(seekTarget.time, audio.duration);
      usePlayerStore.setState({ currentTime: audio.currentTime });
    }
  }, [seekTarget]);
  useEffect(() => {
    if (!queueOpen) return;
    panelRef.current?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setQueueOpen(false);
        queueButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [queueOpen]);

  const handlePlay = () => {
    if (current) toggle();
    else if (playable[0]) play(playable[0], playable);
  };
  const mute = () => {
    if (volume) {
      rememberedVolume.current = volume;
      usePlayerStore.setState({ volume: 0 });
    } else usePlayerStore.setState({ volume: rememberedVolume.current });
  };
  return (
    <div className="player-shell">
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const audio = event.currentTarget;
          const state = usePlayerStore.getState();
          const total = Number.isFinite(audio.duration) ? audio.duration : 0;
          audio.currentTime = Math.min(state.seekTarget.time, total);
          usePlayerStore.setState({
            duration: total,
            currentTime: audio.currentTime,
          });
        }}
        onTimeUpdate={(event) =>
          usePlayerStore.setState({
            currentTime: event.currentTarget.currentTime,
          })
        }
        onEnded={next}
        onPlaying={() => setBuffering(false)}
        onCanPlay={() => setBuffering(false)}
        onWaiting={() => setBuffering(true)}
        onPause={() => setBuffering(false)}
        onError={() => {
          setBuffering(false);
          usePlayerStore.setState({
            isPlaying: false,
            error:
              "Аудиофайл недоступен. Выбери другой трек или попробуй ещё раз.",
          });
        }}
      />
      {queueOpen && (
        <div
          className="queue-panel"
          ref={panelRef}
          tabIndex={-1}
          id="player-queue"
          role="region"
          aria-label="Очередь воспроизведения"
        >
          <button
            className="icon-button queue-close"
            aria-label="Закрыть очередь"
            onClick={() => {
              setQueueOpen(false);
              queueButtonRef.current?.focus();
            }}
          >
            <X />
          </button>
          {queue.length ? (
            <ol>
              {queue.map((track, index) => (
                <li
                  key={track.id}
                  className={track.id === current?.id ? "is-active" : ""}
                >
                  <button
                    className="icon-button"
                    aria-label={`Слушать ${track.title}`}
                    onClick={() => play(track, queue)}
                  >
                    <Play size={16} />
                  </button>
                  <span className="meta">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Link to={`/beats/${track.id}`}>{track.title}</Link>
                  <Link to={`/artists/${track.artistId}`}>
                    {track.producer}
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p>Выбери трек — он откроет очередь.</p>
          )}
        </div>
      )}
      {error && (
        <div className="player-error" role="alert">
          <span>{error}</span>
          <button
            className="icon-button"
            aria-label="Закрыть сообщение"
            onClick={() => usePlayerStore.setState({ error: "" })}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div className="player-inner">
        <div className="player-controls">
          <button
            className="icon-button"
            aria-label="Предыдущий трек"
            disabled={!current}
            onClick={previous}
          >
            <SkipBack size={19} fill="currentColor" />
          </button>
          <button
            className="play-button"
            aria-label={isPlaying ? "Пауза" : "Воспроизвести"}
            disabled={!current && !playable.length}
            onClick={handlePlay}
          >
            {isPlaying ? (
              <Pause size={22} fill="currentColor" />
            ) : (
              <Play size={22} fill="currentColor" />
            )}
          </button>
          <button
            className="icon-button"
            aria-label="Следующий трек"
            disabled={!playable.length}
            onClick={next}
          >
            <SkipForward size={19} fill="currentColor" />
          </button>
        </div>
        <div className="player-progress">
          <span className="player-time">{formatTime(currentTime)}</span>
          <div className="player-wave">
            {current ? (
              <Waveform key={current.audioUrl} track={current} height={44} />
            ) : (
              <div className="idle-wave">ТРЕК ПОКА НЕ ВЫБРАН</div>
            )}
          </div>
          <span className="player-time">{formatTime(duration)}</span>
        </div>
        <div className="player-volume">
          <button
            className="icon-button"
            aria-label={volume ? "Выключить звук" : "Включить звук"}
            onClick={mute}
          >
            {volume ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(event) =>
              usePlayerStore.setState({ volume: Number(event.target.value) })
            }
            aria-label="Громкость"
          />
        </div>
        <div className="player-track">
          {current ? (
            <>
              <Link to={`/beats/${current.id}`} className="player-art">
                <Artwork src={album?.coverUrl || current.coverUrl} title={current.title} />
              </Link>
              <div className="player-titles">
                <Link to={`/beats/${current.id}`}>{current.title}</Link>
                <div>
                  <Link to={`/artists/${current.artistId}`}>
                    {current.producer}
                  </Link>
                  {album && (
                    <>
                      <span> / </span>
                      <Link to={`/albums/${album.id}`}>{album.title}</Link>
                    </>
                  )}
                </div>
                {buffering && isPlaying && (
                  <span className="meta accent" role="status">
                    Загрузка аудио…
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="player-titles">
              <span>Выбери, что послушать</span>
              <small>Выбери трек из каталога</small>
            </div>
          )}
        </div>
        <button
          ref={queueButtonRef}
          className={`icon-button queue-toggle ${queueOpen ? "accent" : ""}`}
          aria-label="Очередь воспроизведения"
          aria-expanded={queueOpen}
          aria-controls="player-queue"
          onClick={() => setQueueOpen(!queueOpen)}
        >
          <ListMusic size={22} />
        </button>
      </div>
    </div>
  );
}
