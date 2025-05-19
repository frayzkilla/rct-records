import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Track } from './track.entity';
import { Repository } from 'typeorm';
import { TrackResponseDto } from './trackresponse.dto';
import { TracksService } from './tracks.service';

@Controller('api/beats')
export class TracksController {
  constructor(
    @InjectRepository(Track)
    private readonly tracksRepo: Repository<Track>,
    private readonly trackService: TracksService,
  ) {}

  @Get()
  async findAll(): Promise<TrackResponseDto[]> {
    const tracks = await this.trackService.findAll();
    return tracks.map((track) => new TrackResponseDto(track));
  }
}
