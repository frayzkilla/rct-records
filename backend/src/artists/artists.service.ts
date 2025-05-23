import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Artist } from './artist.entity';

@Injectable()
export class ArtistsService {
  constructor(
    @InjectRepository(Artist)
    private readonly artistsRepo: Repository<Artist>,
  ) {}

  async findById(id: number): Promise<Artist> {
    const artist = await this.artistsRepo.findOne({ where: { id } });

    if (!artist) {
      throw new NotFoundException(`Artist with ID ${id} not found`);
    }

    return artist;
  }

  async remove(id: number): Promise<void> {
    await this.artistsRepo.delete(id);
  }
}
