import { Module } from '@nestjs/common';
import { AlbumsService } from './albums.service';
import { AlbumsController } from './albums.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Album } from './album.entity';
import { ArtistsModule } from 'src/artists/artists.module';

@Module({
  imports: [TypeOrmModule.forFeature([Album]), ArtistsModule],
  providers: [AlbumsService],
  controllers: [AlbumsController],
  exports: [AlbumsService],
})
export class AlbumsModule {}
