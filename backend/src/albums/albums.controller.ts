import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Album } from './album.entity';
import { AlbumsService } from './albums.service';
import { AlbumResponseDto } from './albumresponse.dto';

@Controller('api/albums')
export class AlbumsController {
  constructor(
    private readonly albumsService: AlbumsService,
  ) {}

  @Get()
  async findAll(): Promise<AlbumResponseDto[]> {
    const albums = await this.albumsService.findAll();
    return albums.map((album) => new AlbumResponseDto(album));
  }
}
