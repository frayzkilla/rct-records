import { Artist } from "src/artists/artist.entity";
import { Track } from "src/tracks/track.entity";
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Album {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  title: string;

  @Column({ type: 'date' })
  releaseDate: Date;

  @Column({ nullable: true })
  coverUrl: string;

  @ManyToOne(() => Artist, (artist) => artist.albums, { onDelete: 'CASCADE' })
  artist: Artist;

  @OneToMany(() => Track, (track) => track.album)
  tracks: Track[];
}
