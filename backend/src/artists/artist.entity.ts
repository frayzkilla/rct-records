import { Album } from 'src/albums/album.entity';
import { Track } from 'src/tracks/track.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany  } from 'typeorm';

@Entity()
export class Artist {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  bio: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @OneToMany(() => Track, (track) => track.artist)
  tracks: Track[];

  @OneToMany(() => Album, (album) => album.artist)
  albums: Album[];
}
