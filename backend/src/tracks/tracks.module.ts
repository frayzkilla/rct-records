import { Module } from '@nestjs/common';
import { TracksController } from './tracks.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Track } from './track.entity';
import { TracksService } from './tracks.service';
import { ArtistsService } from 'src/artists/artists.service';
import { ArtistsModule } from 'src/artists/artists.module';

@Module({
  imports: [TypeOrmModule.forFeature([Track]), ArtistsModule],
  controllers: [TracksController],
  providers: [TracksService],
})
export class TracksModule {}
