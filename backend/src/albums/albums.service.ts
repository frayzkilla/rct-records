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

    const tracks = await this.trackRepo.find({
    where: { album: { id: albumId } },
    relations: ['album', 'artist'],
    order: { title: 'ASC' },
  });

  return tracks.filter((track) => track.album !== null);
  }

  async findById(id: number): Promise<Album> {
    const album = await this.albumsRepo.findOne({ where: { id } });

    if (!album) {
      throw new NotFoundException(`Album with ID ${id} not found`);
    }

    return album;
  }
}
