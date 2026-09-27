import * as React from 'react';
import { Image } from 'react-native';
import renderer from 'react-test-renderer';

import GameModal from '../GameModal';
import { GameFormatted } from '../../utils/types';

// GameModal → utils/utils.tsx → utils/firebaseConfig.ts imports AsyncStorage,
// which needs its official jest mock (see the async-storage jest docs).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// utils/utils.tsx pulls in firebase (ESM not transformed by jest) through
// firebaseConfig and syncService; both are stubbed like in syncService.test.ts.
jest.mock('../../utils/firebaseConfig', () => ({
  auth: { currentUser: null },
  db: { mockDb: true },
}));

jest.mock('../../utils/syncService', () => ({
  syncToFirestore: jest.fn(),
}));

// @rneui/themed ships untranspiled ESM; GameModal only uses its Icon export,
// which is irrelevant to the logo rendering asserted below.
jest.mock('@rneui/themed', () => ({
  Icon: () => null,
}));

/**
 * Color scheme returned by the mocked `useColorScheme` hook below.
 * Must start with `mock` so jest allows referencing it inside `jest.mock`.
 */
let mockColorScheme: 'light' | 'dark' = 'light';

// `react-native` exposes `useColorScheme` as a getter re-exporting this module's
// default export, so mocking the source module is enough (mocking the whole
// `react-native` index instead eagerly loads every native TurboModule).
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockColorScheme,
}));

/** The bundled placeholder used for teams without a logo. */
const defaultLogoAsset = require('../../assets/images/default_logo.png');

const buildGame = (overrides: Partial<GameFormatted> = {}): GameFormatted => ({
  uniqueId: 'NHL-1',
  awayTeamId: 'away-id',
  awayTeam: 'Away team',
  awayTeamShort: 'AWY',
  awayTeamLogo: '',
  awayTeamLogoDark: '',
  awayTeamScore: null,
  homeTeamId: 'home-id',
  homeTeam: 'Home team',
  homeTeamShort: 'HOM',
  homeTeamScore: null,
  homeTeamLogo: '',
  homeTeamLogoDark: '',
  arenaName: 'Arena',
  placeName: 'City',
  gameDate: '2025-01-01',
  teamSelectedId: '',
  // Far in the future so the live-score effect skips its network call.
  startTimeUTC: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
  show: true,
  selectedTeam: false,
  league: 'NHL',
  urlLive: 'https://example.com/live',
  color: '#000000',
  backgroundColor: '#ffffff',
  awayTeamColor: '#000000',
  awayTeamBackgroundColor: '#ffffff',
  homeTeamColor: '#000000',
  homeTeamBackgroundColor: '#ffffff',
  gameStatus: 'SCHEDULED',
  ...overrides,
});

const renderModal = (data: GameFormatted): renderer.ReactTestRenderer => {
  let tree: renderer.ReactTestRenderer | undefined;
  renderer.act(() => {
    tree = renderer.create(
      <GameModal visible onClose={() => {}} data={data} gradientStyle={{}} favoriteTeams={[]} />,
    );
  });
  return tree as renderer.ReactTestRenderer;
};

/** Sources of the away then home team logo images, in render order. */
const logoSources = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAllByType(Image).map((node) => node.props.source);

describe('GameModal team logos', () => {
  beforeEach(() => {
    mockColorScheme = 'light';
  });

  it('renders the bundled default logo when both teams have no logo', () => {
    const sources = logoSources(renderModal(buildGame()));

    expect(sources).toHaveLength(2);
    sources.forEach((source) => {
      expect(source).toBe(defaultLogoAsset);
    });
  });

  it('never passes a non-string uri to Image (regression: require() asset used as uri)', () => {
    const sources = logoSources(renderModal(buildGame({ homeTeamLogoDark: 'x', awayTeamLogoDark: 'y' })));

    sources.forEach((source) => {
      if (source && typeof source === 'object' && 'uri' in source) {
        expect(typeof source.uri).toBe('string');
      }
    });
  });

  it('keeps the remote logo when the team has one', () => {
    const sources = logoSources(
      renderModal(
        buildGame({
          awayTeamLogo: 'https://cdn.example.com/away.png',
          homeTeamLogo: 'https://cdn.example.com/home.png',
        }),
      ),
    );

    expect(sources).toEqual([
      { uri: 'https://cdn.example.com/away.png' },
      { uri: 'https://cdn.example.com/home.png' },
    ]);
  });

  it('uses the dark logo variant in dark mode', () => {
    mockColorScheme = 'dark';

    const sources = logoSources(
      renderModal(
        buildGame({
          awayTeamLogo: 'https://cdn.example.com/away.png',
          awayTeamLogoDark: 'https://cdn.example.com/away-dark.png',
          homeTeamLogo: 'https://cdn.example.com/home.png',
          homeTeamLogoDark: 'https://cdn.example.com/home-dark.png',
        }),
      ),
    );

    expect(sources).toEqual([
      { uri: 'https://cdn.example.com/away-dark.png' },
      { uri: 'https://cdn.example.com/home-dark.png' },
    ]);
  });

  it('falls back to the default asset in dark mode when no dark logo exists', () => {
    mockColorScheme = 'dark';

    const sources = logoSources(renderModal(buildGame({ homeTeamLogoDark: '', awayTeamLogoDark: '' })));

    expect(sources).toHaveLength(2);
    sources.forEach((source) => {
      expect(source).toBe(defaultLogoAsset);
    });
  });

  it('falls back to the light logo in dark mode when only the light logo exists', () => {
    mockColorScheme = 'dark';

    const sources = logoSources(
      renderModal(
        buildGame({
          awayTeamLogo: 'https://cdn.example.com/away.png',
          homeTeamLogo: 'https://cdn.example.com/home.png',
        }),
      ),
    );

    expect(sources).toEqual([
      { uri: 'https://cdn.example.com/away.png' },
      { uri: 'https://cdn.example.com/home.png' },
    ]);
  });
});
