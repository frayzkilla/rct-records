import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Track } from './track.entity';
import { Repository } from 'typeorm';
import { TrackResponseDto } from './trackresponse.dto';
import { TracksService } from './tracks.service';
import {
  FileFieldsInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { TrackCreateDto } from './trackcreate.dto';
import { ArtistsService } from 'src/artists/artists.service';
import { AlbumsService } from 'src/albums/albums.service';

@Controller('api/beats')
export class TracksController {
  constructor(
    @InjectRepository(Track)
    private readonly tracksRepo: Repository<Track>,
    private readonly trackService: TracksService,
    private readonly artistsService: ArtistsService,
    private readonly albumsService: AlbumsService,
  ) {}

  @Get()
  async findAll(): Promise<TrackResponseDto[]> {
    const tracks = await this.trackService.findAll();
    return tracks.map((track) => new TrackResponseDto(track));
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'audio', maxCount: 1 },
        { name: 'cover', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: (req, file, cb) => {
            const type = file.fieldname === 'audio' ? 'tracks' : 'covers';
            cb(null, `../storage/${type}`);
          },
          filename: (req, file, cb) => {
            cb(null, file.originalname);
          },
        }),
      },
    ),
  )
  async createTrack(
    @UploadedFiles()
    files: {
      audio?: Express.Multer.File[];
      cover?: Express.Multer.File[];
    },
    @Body() body: TrackCreateDto,
  ) {
    const audioFile = files.audio?.[0];
    const coverFile = files.cover?.[0];

    const artist = await this.artistsService.findById(body.artistId);

    const track = new Track();
    track.title = body.title;
    track.artist = artist;
    track.album = body.albumId ? await this.albumsService.findById(body.albumId) : null;
    track.audioUrl = `storage/tracks/${audioFile.filename}`;
    track.coverUrl = `storage/covers/${coverFile.filename}`;

    return this.tracksRepo.save(track);
  }

  @Delete(':id')
  async deleteTrack(@Param('id') id: number) {
    await this.trackService.remove(id);
    return { message: 'Трек удалён' };
  }
}
