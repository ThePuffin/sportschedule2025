import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { GameService } from './games.service';
import { UpdateGameDto } from './dto/update-game.dto';
import { CreateGameDto } from './dto/create-game.dto';

@Controller('games')
export class GamesController {
  constructor(private readonly GameService: GameService) {}

  @Get()
  async findAll(): Promise<any[]> {
    return this.GameService.findAll();
  }
  @Get('/team/:teamSelectedId')
  findByTeam(@Param('teamSelectedId') teamSelectedId: string) {
    return this.GameService.findByTeam(teamSelectedId);
  }

  @Get('/date/:gameDate')
  findByDate(@Param('gameDate') gameDate: string) {
    return this.GameService.findByDate(gameDate);
  }

  @Get(':uniqueId')
  findOne(@Param('uniqueId') uniqueId: string) {
    return this.GameService.findOne(uniqueId);
  }

  @Post()
  async create(@Body() createGameDto: CreateGameDto) {
    this.GameService.create(createGameDto);
  }

  @Post('refresh/all')
  async refresh() {
    return this.GameService.getAllGames();
  }

  @Post('/refresh/:league')
  async refreshByLeague(@Param('league') league: string) {
    return this.GameService.getLeagueGames(league);
  }

  @Patch(':uniqueId')
  update(
    @Param('uniqueId') uniqueId: string,
    @Body() updateGameDto: UpdateGameDto,
  ) {
    return this.GameService.update(uniqueId, updateGameDto);
  }

  @Delete('all')
  removeAll() {
    return this.GameService.removeAll();
  }

  @Delete(':uniqueId')
  remove(@Param('uniqueId') uniqueId: string) {
    return this.GameService.remove(uniqueId);
  }
}
