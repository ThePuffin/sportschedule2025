import { ApiProperty } from '@nestjs/swagger';

export class UpdateGameDto {
  @ApiProperty()
  uniqueId: string;

  @ApiProperty()
  awayTeamId: string;

  @ApiProperty()
  awayTeamShort: string;

  @ApiProperty()
  awayTeam: string;

  @ApiProperty()
  awayTeamLogo: string;

  @ApiProperty()
  homeTeamId: string;

  @ApiProperty()
  homeTeamShort: string;

  @ApiProperty()
  homeTeam: string;

  @ApiProperty()
  homeTeamLogo: string;

  @ApiProperty()
  divisionName: string;

  @ApiProperty()
  arenaName: string;

  @ApiProperty()
  gameDate: string;

  @ApiProperty()
  teamSelectedId: string;

  @ApiProperty()
  show: string;

  @ApiProperty()
  selectedTeam: string;

  @ApiProperty()
  league: string;

  @ApiProperty()
  venueTimezone: string;

  @ApiProperty()
  timeStart: string;

  @ApiProperty()
  startTimeUTC: string;

  @ApiProperty({ default: new Date() })
  updateDate: string;
}
