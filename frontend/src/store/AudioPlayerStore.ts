import { create } from "zustand";
import type { Track } from "../lib/catalog";

type PlayerState = {
  current: Track | null;
  queue: Track[];
  catalog: Track[];
  history: { track: Track; queue: Track[] }[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  seekTarget: { time: number; serial: number };
  error: string;
  play: (track: Track, queue?: Track[], time?: number) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  current: null,
  queue: [],
  catalog: [],
  history: [],
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  seekTarget: { time: 0, serial: 0 },
  error: "",
  play: (current, queue, time = 0) =>
    set((state) => ({
      current,
      queue: (queue ?? state.queue).filter((track) => track.audioUrl),
      isPlaying: true,
      error: "",
      history:
        state.current && state.current.id !== current.id
          ? [
              ...state.history,
              { track: state.current, queue: state.queue },
            ].slice(-100)
          : state.history,
      currentTime: time,
      duration: state.current?.id === current.id ? state.duration : 0,
      seekTarget: { time, serial: state.seekTarget.serial + 1 },
    })),
  toggle: () =>
    set((state) => ({
      isPlaying: !!state.current && !state.isPlaying,
      error: "",
    })),
  seek: (time) =>
    set((state) => ({
      seekTarget: {
        time: Math.max(0, time),
        serial: state.seekTarget.serial + 1,
      },
    })),
  next: () => {
    const { current, queue, catalog, play } = get();
    const index = queue.findIndex((track) => track.id === current?.id);
    const following = index >= 0 ? queue[index + 1] : undefined;
    const candidates = catalog.filter(
      (track) => track.id !== current?.id && track.audioUrl,
    );
    const random =
      candidates[Math.floor(Math.random() * candidates.length)] ??
      catalog.find((track) => track.audioUrl);
    const track = following ?? random;
    if (track) play(track, following ? queue : [track]);
    else set({ isPlaying: false });
  },
  previous: () => {
    const { history, queue, current, play } = get();
    const entry = history[history.length - 1];
    const track =
      entry?.track ??
      queue[queue.findIndex((item) => item.id === current?.id) - 1];
    if (track) {
      play(track, entry?.queue ?? queue);
      set({ history: history.slice(0, -1) });
    } else get().seek(0);
  },
}));
