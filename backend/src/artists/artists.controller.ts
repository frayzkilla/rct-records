import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { Param, Delete } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Artist } from './artist.entity';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ArtistCreateDto } from './artistcreate.dto';
import { ArtistsService } from './artists.service';
import { join } from 'path';

@Controller('api/artists')
export class ArtistsController {
  constructor(
    @InjectRepository(Artist)
    private readonly artistRepo: Repository<Artist>,
    private readonly artistsService: ArtistsService, 
  ) {}

  @Get()
  async findAll(): Promise<Artist[]> {
    return this.artistRepo.find();
  }

  // @Post()
  // @UseInterceptors(
  //   FileFieldsInterceptor([{ name: 'avatar', maxCount: 1 }], {
  //     storage: diskStorage({
  //       destination: (req, file, cb) => {
  //         cb(null, `../storage/artists_images`);
  //       },
  //       filename: (req, file, cb) => {
  //         cb(null, file.originalname);
  //       },
  //     }),
  //   }),
  // )
  // async createArtist(
  //   @UploadedFiles()
  //   files: {
  //     avatar?: Express.Multer.File[];
  //   },
  //   @Body() body: ArtistCreateDto,
  // ) {
  //   const coverFile = files.avatar?.[0];

  //   const artist = new Artist();
  //   artist.name = body.name;
  //   artist.bio = body.bio;
  //   artist.avatarUrl = `storage/artists_images/${coverFile.filename}`;

  //   return this.artistRepo.save(artist);
  // }

  @Post()
@UseInterceptors(
  FileFieldsInterceptor([{ name: 'avatar', maxCount: 1 }], {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = join(process.cwd(), 'storage', 'artists_images');
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
      },
    }),
  }),
)
async createArtist(
  @UploadedFiles()
  files: {
    avatar?: Express.Multer.File[];
  },
  @Body() body: ArtistCreateDto,
) {
  const coverFile = files.avatar?.[0];
  
  if (!coverFile) {
    throw new BadRequestException('Avatar file is required');
  }

  const artist = new Artist();
  artist.name = body.name;
  artist.bio = body.bio;
  artist.avatarUrl = `/storage/artists_images/${coverFile.filename}`;

  return this.artistRepo.save(artist);
}

  @Delete(':id')
  async deleteTrack(@Param('id') id: number) {
    await this.artistsService.remove(id);
    return { message: 'Артист удалён' };
  }
}
