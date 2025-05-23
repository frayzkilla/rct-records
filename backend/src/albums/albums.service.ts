import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Album } from './album.entity';
import { Repository } from 'typeorm';
import { Track } from 'src/tracks/track.entity';

@Injectable()
export class AlbumsService {
  constructor(
    @InjectRepository(Album)
    private readonly albumsRepo: Repository<Album>,
    @InjectRepository(Track)
    private readonly trackRepo: Repository<Track>,
  ) {}

  async findAll(): Promise<Album[]> {
    return this.albumsRepo.find({
      relations: ['artist', 'tracks'],
    });
  }

  async remove(id: number): Promise<void> {
    await this.albumsRepo.delete(id);
  }

  async getTracksByAlbumId(albumId: number): Promise<Track[]> {
    const album = await this.albumsRepo.findOne({ where: { id: albumId } });

    if (!album) {
      throw new NotFoundException('Альбом не найден');
    }

    return this.trackRepo.find({
      where: { album: { id: albumId } },
      relations: ['album'],
      order: { title: 'ASC' },
    });
  }
}
