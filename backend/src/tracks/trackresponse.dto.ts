import { Track } from "./track.entity";

export class TrackResponseDto {
  id: string;
  title: string;
  audioUrl: string;
  coverUrl: string;
  producer: string; 

  constructor(track: Track) {
    this.id = track.id; 
    this.title = track.title;
    this.audioUrl = track.audioUrl;
    this.coverUrl = track.coverUrl;
    this.producer = track.artist?.name ?? ''; 
  }
}
