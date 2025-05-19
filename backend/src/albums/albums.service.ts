import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Album } from './album.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AlbumsService {
  constructor(
    @InjectRepository(Album)
    private readonly albumsRepo: Repository<Album>,
  ) {}

  async findAll(): Promise<Album[]> {
    return this.albumsRepo.find({
      relations: ['artist', 'tracks'],
    });
  }
}
