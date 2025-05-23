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
import { Album } from './album.entity';
import { AlbumsService } from './albums.service';
import { AlbumResponseDto } from './albumresponse.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { AlbumCreateDto } from './albumcreate.dto';
import { ArtistsService } from 'src/artists/artists.service';
import { Repository } from 'typeorm';

@Controller('api/albums')
export class AlbumsController {
  constructor(
    @InjectRepository(Album)
    private readonly albumsRepo: Repository<Album>,
    private readonly albumsService: AlbumsService,
    private readonly artistsService: ArtistsService,
  ) {}

  @Get()
  async findAll(): Promise<AlbumResponseDto[]> {
    const albums = await this.albumsService.findAll();
    return albums.map((album) => new AlbumResponseDto(album));
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'cover', maxCount: 1 }], {
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, `../storage/albums`);
        },
        filename: (req, file, cb) => {
          cb(null, file.originalname);
        },
      }),
    }),
  )
  async createAlbum(
    @UploadedFiles()
    files: {
      cover?: Express.Multer.File[];
    },
    @Body() body: AlbumCreateDto,
  ) {
    const coverFile = files.cover?.[0];

    const album = new Album();
    album.title = body.title;
    album.releaseDate = new Date(body.releaseDate);
    album.artist = await this.artistsService.findById(body.artistId);
    album.coverUrl = `storage/albums/${coverFile.filename}`;

    return this.albumsRepo.save(album);
  }

  @Delete(':id')
  async deleteTrack(@Param('id') id: number) {
    await this.albumsService.remove(id);
    return { message: 'Альбом удалён' };
  }
}
