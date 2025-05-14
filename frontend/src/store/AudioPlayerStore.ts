import { create } from "zustand";

interface PlayerState {
  track: string | null;
  isPlaying: boolean;
  setTrack: (track: string) => void;
  setIsPlaying: (value: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  track: "/hamdi_skanka.mp3",
  isPlaying: false,
  setTrack: (track) => set({ track, isPlaying: true }),
  setIsPlaying: (value) => set({ isPlaying: value }),
}));
