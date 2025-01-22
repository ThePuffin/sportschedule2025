import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { TeamService } from '../teams/teams.service'
import { League } from '../utils/enum'
import { getTeamsSchedule } from '../utils/fetchData/espnAllData'
import { HockeyData } from '../utils/fetchData/hockeyData'
import { CreateGameDto } from './dto/create-game.dto'
import { UpdateGameDto } from './dto/update-game.dto'
import { Game } from './schemas/game.schema'

@Injectable()
export class GameService {
  constructor(
    @InjectModel(Game.name) public gameModel: Model<Game>,
    private readonly teamService: TeamService,
  ) {}

  async create(gameDto: CreateGameDto | UpdateGameDto): Promise<Game> {
    const { uniqueId } = gameDto;

    if (uniqueId) {
      const existingGame = await this.findOne(uniqueId);
      if (existingGame) {
        Object.assign(existingGame, gameDto);
        return await existingGame.save();
      }
    }

    const newGame = new this.gameModel(gameDto);
    return await newGame.save();
  }

  async getLeagueGames(league): Promise<any> {
    const teams = await this.teamService.findByLeague(league);
    let currentGames = {};
    if (league === League.NHL) {
      const hockeyData = new HockeyData();
      currentGames = await hockeyData.getNhlSchedule(teams);
    } else {
      currentGames = await getTeamsSchedule(teams, league);
    }

    for (const team in currentGames) {
      const games = currentGames[team];
      for (const game of games) {
        try {
          await this.create(game);
        } catch (error) {
          console.log({ error });
        }
      }
    }
    return currentGames;
  }

  async getAllGames(): Promise<Game[]> {
    let currentGames = {};

    const leagues = [League.NFL, League.NBA, League.MLB, League.NHL];
    for (const league of leagues) {
      currentGames = {
        ...currentGames,
        ...(await this.getLeagueGames(league)),
      };
    }
    return this.gameModel.find().exec();
  }

  async findAll(): Promise<Game[]> {
    const allGames = await this.gameModel
      .find()
      .sort({ startTimeUTC: 1 })
      .exec();
    if (Object.keys(allGames).length === 0 || allGames?.length === 0) {
      return this.getAllGames();
    }
    return allGames;
  }

  async findOne(uniqueId: string) {
    const filter = { uniqueId: uniqueId };
    const game = await this.gameModel.findOne(filter).exec();
    return game;
  }

  async findByTeam(teamSelectedId: string) {
    const filter = { teamSelectedId: teamSelectedId };
    const game = await this.gameModel
      .find(filter)
      .sort({ startTimeUTC: 1 })
      .exec();
    return game;
  }

  async filterGames(startDate, endDate, teamSelectedId) {
    const filter: any = {};

    if (startDate) {
      filter.gameDate = { $gte: startDate };
    }

    if (endDate) {
      filter.gameDate = { ...filter.gameDate, $lte: endDate };
    }

    if (teamSelectedId) {
      filter.teamSelectedId = teamSelectedId;
    }

    const games = await this.gameModel
      .find(filter)
      .sort({ startTimeUTC: 1 })
      .exec();
    return games;
  }

  async findByDate(gameDate: string) {
    const filter = { gameDate: gameDate };
    const games = await this.gameModel.find(filter).exec();
    return [...new Map(games.map((game) => [game.homeTeam, game])).values()];
  }

  update(uniqueId: string, updateGameDto: UpdateGameDto) {
    const filter = { uniqueId: uniqueId };
    return this.gameModel.updateOne(filter, updateGameDto);
  }

  async remove(uniqueId: string) {
    const filter = { uniqueId: uniqueId };

    const deleted = await this.gameModel.findOneAndDelete(filter).exec();
    return deleted;
  }

  async removeAll() {
    const games = await this.gameModel.find().exec();
    for (const game of games) {
      await this.remove(game.uniqueId);
    }
  }
}
