import { Body, Controller, Get, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Track } from './track.entity';
import { Repository } from 'typeorm';
import { TrackResponseDto } from './trackresponse.dto';
import { TracksService } from './tracks.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { TrackCreateDto } from './trackcreate.dto';
import { ArtistsService } from 'src/artists/artists.service';

@Controller('api/beats')
export class TracksController {
  constructor(
    @InjectRepository(Track)
    private readonly tracksRepo: Repository<Track>,
    private readonly trackService: TracksService,
    private readonly artistsService: ArtistsService, 
  ) {}

  @Get()
  async findAll(): Promise<TrackResponseDto[]> {
    const tracks = await this.trackService.findAll();
    return tracks.map((track) => new TrackResponseDto(track));
  }

  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 2, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const type = file.fieldname === 'audio' ? 'tracks' : 'covers';
          const path = `../storage/${type}`;

          cb(null, path);
        },
        filename: (req, file, cb) => {
          const artist = req.body.artist.replace(/\s+/g, '_');
          const title = req.body.title.replace(/\s+/g, '_');
          const ext = extname(file.originalname);
          cb(null, `${artist}_${title}${ext}`);
        },
      }),
    }),
  )
  async createTrack(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: TrackCreateDto,
  ) {
    const audioFile = files.find((f) => f.fieldname === 'audio');
    const coverFile = files.find((f) => f.fieldname === 'cover');

    const artist = await this.artistsService.findById(body.artistId);

    const track = new Track();
    track.title = body.title;
    track.artist = artist;
    track.audioUrl = `/storage/tracks/${audioFile.filename}`;
    track.coverUrl = `/storage/covers/${coverFile.filename}`;

    return this.tracksRepo.save(track);
  }
}
