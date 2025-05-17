import { Album } from "src/albums/album.entity";
import { Artist } from "src/artists/artist.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Track {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  title: string;

  @Column()
  audioUrl: string;

  @Column({ nullable: true })
  coverUrl: string;

  @ManyToOne(() => Artist, (artist) => artist.tracks, { onDelete: 'CASCADE' })
  artist: Artist;

  @ManyToOne(() => Album, (album) => album.tracks, { nullable: true, onDelete: 'SET NULL' })
  album: Album;
}
