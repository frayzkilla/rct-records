import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export type Artist = {
  id: number;
  name: string;
  bio: string;
  avatarUrl: string;
};
export type Album = {
  id: number;
  title: string;
  artistId: number;
  artist: string;
  coverUrl: string;
  year: number;
  releaseDate: string;
  tracksQuantity: number;
};
export type Track = {
  id: number;
  title: string;
  artistId: number;
  albumId: number | null;
  producer: string;
  audioUrl: string;
  coverUrl: string;
};

export function useCatalog() {
  return useQuery({
    queryKey: ["catalog"],
    queryFn: async () => {
      const [tracks, artists, albums] = await Promise.all([
        api<Track[]>("/beats"),
        api<Artist[]>("/artists"),
        api<Album[]>("/albums"),
      ]);
      return {
        tracks: tracks.map((track) => ({
          ...track,
          coverUrl:
            albums.find((album) => album.id === track.albumId)?.coverUrl ||
            track.coverUrl,
        })),
        artists,
        albums,
      };
    },
    staleTime: 60_000,
  });
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
