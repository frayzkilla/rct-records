import { Module } from '@nestjs/common';
import { TracksController } from './tracks.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Track } from './track.entity';
import { TracksService } from './tracks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Track])],
  controllers: [TracksController],
  providers: [TracksService],
})
export class TracksModule {}
