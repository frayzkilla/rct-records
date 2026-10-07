import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import type { Track } from "../lib/catalog";
import { usePlayerStore } from "../store/AudioPlayerStore";

const cache = new Map<string, { peaks: number[][]; duration: number }>();

export default function Waveform({
  track,
  queue,
  height = 48,
}: {
  track: Track;
  queue?: Track[];
  height?: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const wave = useRef<WaveSurfer | null>(null);
  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  const [status, setStatus] = useState("Загрузка волны…");
  const progress = usePlayerStore((state) =>
    state.current?.id === track.id && state.duration
      ? (state.currentTime / state.duration) * 100
      : 0,
  );
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let instance: WaveSurfer | null = null;
    let disposed = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          disposed ||
          !entries.some((entry) => entry.isIntersecting) ||
          instance
        )
          return;
        observer.disconnect();
        setStatus("Загрузка волны…");
        const saved = cache.get(track.audioUrl);
        const accent = getComputedStyle(element)
          .getPropertyValue("--accent")
          .trim();
        instance = WaveSurfer.create({
          container: element,
          height,
          barWidth: 1,
          barGap: 1,
          waveColor: "#77736d",
          progressColor: accent,
          cursorColor: accent,
          cursorWidth: 1,
          normalize: true,
          interact: false,
        });
        wave.current = instance;
        instance.on("ready", () => {
          if (disposed || !instance) return;
          setStatus("");
          if (!saved) {
            if (cache.size >= 50) cache.delete(cache.keys().next().value!);
            cache.set(track.audioUrl, {
              peaks: instance.exportPeaks({ maxLength: 16000, precision: 10000 }),
              duration: instance.getDuration(),
            });
          }
          const state = usePlayerStore.getState();
          instance.setTime(
            state.current?.id === track.id ? state.currentTime : 0,
          );
        });
        instance.on("error", () => {
          if (!disposed) setStatus("Волна недоступна");
        });
        instance
          .load(saved ? "" : track.audioUrl, saved?.peaks, saved?.duration)
          .catch(() => {
            if (!disposed) setStatus("Волна недоступна");
          });
      },
      { rootMargin: "120px" },
    );
    observer.observe(element);
    const unsubscribe = usePlayerStore.subscribe((state, previous) => {
      if (
        state.current?.id === previous.current?.id &&
        state.currentTime === previous.currentTime
      )
        return;
      if (
        instance &&
        instance.getDuration() &&
        (state.current?.id === track.id || previous.current?.id === track.id)
      )
        instance.setTime(
          state.current?.id === track.id ? state.currentTime : 0,
        );
    });
    return () => {
      disposed = true;
      observer.disconnect();
      unsubscribe();
      instance?.destroy();
      wave.current = null;
    };
  }, [track.id, track.audioUrl, height]);

  const seek = (fraction: number) => {
    const instance = wave.current;
    const state = usePlayerStore.getState();
    const duration = instance?.getDuration() ||
      (state.current?.id === track.id ? state.duration : 0);
    if (!duration) return;
    const time = fraction * duration;
    if (state.current?.id === track.id) state.seek(time);
    else state.play(track, queueRef.current, time);
  };

  return (
    <div
      className="waveform"
      role="slider"
      tabIndex={0}
      aria-label={`Перемотка: ${track.title}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      onClick={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        seek(
          Math.max(
            0,
            Math.min(1, (event.clientX - bounds.left) / bounds.width),
          ),
        );
      }}
      onKeyDown={(event) => {
        if (["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          const state = usePlayerStore.getState();
          const duration = wave.current?.getDuration() ||
            (state.current?.id === track.id ? state.duration : 0);
          const time = state.current?.id === track.id ? state.currentTime : 0;
          seek(
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? 1
                : Math.max(
                    0,
                    Math.min(
                      1,
                      (time + (event.key === "ArrowRight" ? 5 : -5)) /
                        (duration || 1),
                    ),
                  ),
          );
        }
      }}
    >
      <div ref={container} style={{ minHeight: height }} />
      {status && <span className="wave-status">{status}</span>}
    </div>
  );
}
