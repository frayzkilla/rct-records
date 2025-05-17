import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Artist } from './artist.entity';

@Controller('api/artists')
export class ArtistsController {
  constructor(
    @InjectRepository(Artist)
    private readonly artistRepo: Repository<Artist>,
  ) {}

  @Get()
  async findAll(): Promise<Artist[]> {
    return this.artistRepo.find();
  }
}
