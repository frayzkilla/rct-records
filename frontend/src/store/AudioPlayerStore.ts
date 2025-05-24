import { create } from "zustand";

interface PlayerState {
  track: string | null;
  isPlaying: boolean;
  title: string;
  artist: string;
  setTitle: (title: string) => void;
  setArtist: (artist: string) => void;
  setTrack: (track: string) => void;
  setIsPlaying: (value: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  track: "/hamdi_skanka.mp3",
  isPlaying: false,
  title: "Skanka",
  artist: "Leftover",
  setTitle: (title) => set({ title }),
  setArtist: (artist) => set({ artist }),
  setTrack: (track) => set({ track }),
  setIsPlaying: (value) => set({ isPlaying: value }),
}));
