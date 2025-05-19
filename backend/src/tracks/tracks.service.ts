import { Injectable } from '@nestjs/common';
import { Track } from './track.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class TracksService {
  constructor(
    @InjectRepository(Track)
    private readonly tracksRepo: Repository<Track>,
  ) {}

  async findAll(): Promise<Track[]> {
    return this.tracksRepo.find({
      relations: ['artist'],
    });
  }
}
