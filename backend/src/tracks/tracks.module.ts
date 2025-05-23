import { forwardRef, Module } from '@nestjs/common';
import { TracksController } from './tracks.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Track } from './track.entity';
import { TracksService } from './tracks.service';
import { ArtistsService } from 'src/artists/artists.service';
import { ArtistsModule } from 'src/artists/artists.module';
import { AlbumsModule } from 'src/albums/albums.module';

@Module({
  imports: [TypeOrmModule.forFeature([Track]), ArtistsModule, forwardRef(() => AlbumsModule)],
  controllers: [TracksController],
  providers: [TracksService],
})
export class TracksModule {}
