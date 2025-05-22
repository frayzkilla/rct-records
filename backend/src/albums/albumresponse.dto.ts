import { Album } from "./album.entity";

export class AlbumResponseDto {
  id: number;
  title: string;
  coverUrl: string;
  year: string;
  artist: string;
  tracksQuantity: number;

  constructor(album: Album) {
    this.id = album.id;
    this.title = album.title;
    this.coverUrl = album.coverUrl;
    this.year = new Date(album.releaseDate).getFullYear().toString();
    this.artist = album.artist?.name ?? '';
    this.tracksQuantity = album.tracks?.length ?? 0;
  }
}