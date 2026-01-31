import { getSetWinner, resolveTiebreakTo, shouldStartTiebreak } from "../tennis/rules";

export type Sport = "tennis" | "padel" | "badminton";
export type Format = "singles" | "doubles";
export type TeamId = "A" | "B";

export type MatchConfig = {
  sport: Sport;
  format: Format;
  bestOf?: 1 | 3 | 5;
  tiebreakAt?: 6;
  tiebreakTo?: 7 | 10;
  gamesToWin?: 2;
  pointsToWinGame?: 21;
  winByTwo?: true;
  maxPointsCap?: 30;
  shortSetTo?: number;
  superTiebreakOnly?: boolean;
  startingServerUserId?: string;
  startTime?: number;
};

export type PlayerRef = { userId: string; name: string };
export type Team = { id: TeamId; players: PlayerRef[] };

export type SetScore = {
  gamesA: number;
  gamesB: number;
};

export type TennisPadelScore = {
  sport: "tennis" | "padel";
  bestOf: 1 | 3 | 5;
  tiebreakAt6All: boolean;
  tiebreakTo: 7 | 10;
  superTiebreakOnly?: boolean;
  shortSetTo?: number;
  sets: SetScore[];
  currentSet: number;
  gamePointsA: number;
  gamePointsB: number;
  isTiebreak: boolean;
  tiebreakPointsA: number;
  tiebreakPointsB: number;
  matchWinner?: TeamId;
};

export type BadmintonGameScore = {
  pointsA: number;
  pointsB: number;
};

export type BadmintonScore = {
  sport: "badminton";
  gamesToWin: 2;
  pointsToWinGame: 21;
  winByTwo: true;
  maxPointsCap: 30;
  games: BadmintonGameScore[];
  currentGame: number;
  matchWinner?: TeamId;
};

export type ScoreState = TennisPadelScore | BadmintonScore;

export type ServerRotationEntry = { teamId: TeamId; playerIndex: number };

export type TennisPadelServerState = {
  type: "tennis" | "padel";
  order: ServerRotationEntry[];
  index: number;
  tiebreakStartIndex?: number;
};

export type BadmintonServerState = {
  type: "badminton";
  servingTeamId: TeamId;
};

export type ServerState = TennisPadelServerState | BadmintonServerState;

export type MatchState = {
  config: MatchConfig;
  teams: { A: Team; B: Team };
  score: ScoreState;
  server: ServerState;
};

export type DisplayScore =
  | {
      sport: "tennis" | "padel";
      sets: SetScore[];
      currentSet: number;
      gamesA: number;
      gamesB: number;
      pointsA: number;
      pointsB: number;
      pointLabelA: string;
      pointLabelB: string;
      isTiebreak: boolean;
      tiebreakPointsA: number;
      tiebreakPointsB: number;
    }
  | {
      sport: "badminton";
      games: BadmintonGameScore[];
      currentGame: number;
      gamesWonA: number;
      gamesWonB: number;
      pointsA: number;
      pointsB: number;
    };

const otherTeam = (team: TeamId): TeamId => (team === "A" ? "B" : "A");

const resolveConfig = (config: MatchConfig): MatchConfig => {
  if (config.sport === "badminton") {
    return {
      ...config,
      gamesToWin: config.gamesToWin ?? 2,
      pointsToWinGame: config.pointsToWinGame ?? 21,
      winByTwo: config.winByTwo ?? true,
      maxPointsCap: config.maxPointsCap ?? 30
    };
  }
  const hasTiebreakAt = Object.prototype.hasOwnProperty.call(
    config,
    "tiebreakAt"
  );
  return {
    ...config,
    bestOf: config.bestOf ?? 3,
    tiebreakAt: hasTiebreakAt ? config.tiebreakAt : 6,
    tiebreakTo: resolveTiebreakTo(config.tiebreakTo),
    superTiebreakOnly: config.superTiebreakOnly ?? false
  };
};

const normalizeTeams = (format: Format, teamA: Team, teamB: Team) => {
  const takeCount = format === "doubles" ? 2 : 1;
  return {
    A: { ...teamA, players: teamA.players.slice(0, takeCount) },
    B: { ...teamB, players: teamB.players.slice(0, takeCount) }
  };
};

const buildServerOrder = (
  format: Format,
  teams: { A: Team; B: Team },
  startingServerUserId?: string
): { order: ServerRotationEntry[]; index: number } => {
  if (format === "singles") {
    const defaultOrder: ServerRotationEntry[] = [
      { teamId: "A", playerIndex: 0 },
      { teamId: "B", playerIndex: 0 }
    ];
    const startingTeam =
      startingServerUserId === teams.B.players[0]?.userId ? "B" : "A";
    const startIndex = startingTeam === "A" ? 0 : 1;
    return { order: defaultOrder, index: startIndex };
  }

  const allEntries: ServerRotationEntry[] = [
    { teamId: "A", playerIndex: 0 },
    { teamId: "A", playerIndex: 1 },
    { teamId: "B", playerIndex: 0 },
    { teamId: "B", playerIndex: 1 }
  ];
  let startingEntry: ServerRotationEntry | undefined;
  for (const entry of allEntries) {
    const team = teams[entry.teamId];
    if (team.players[entry.playerIndex]?.userId === startingServerUserId) {
      startingEntry = entry;
      break;
    }
  }
  const start = startingEntry ?? { teamId: "A", playerIndex: 0 };

  if (start.teamId === "A") {
    const otherIndex = start.playerIndex === 0 ? 1 : 0;
    return {
      order: [
        start,
        { teamId: "B", playerIndex: 0 },
        { teamId: "A", playerIndex: otherIndex },
        { teamId: "B", playerIndex: 1 }
      ],
      index: 0
    };
  }

  const otherIndex = start.playerIndex === 0 ? 1 : 0;
  return {
    order: [
      start,
      { teamId: "A", playerIndex: 0 },
      { teamId: "B", playerIndex: otherIndex },
      { teamId: "A", playerIndex: 1 }
    ],
    index: 0
  };
};

export const createMatch = (
  config: MatchConfig,
  teamA: Team,
  teamB: Team
): MatchState => {
  const resolved = resolveConfig(config);
  const teams = normalizeTeams(resolved.format, teamA, teamB);

  if (resolved.sport === "badminton") {
    return {
      config: resolved,
      teams,
      score: {
        sport: "badminton",
        gamesToWin: resolved.gamesToWin ?? 2,
        pointsToWinGame: resolved.pointsToWinGame ?? 21,
        winByTwo: resolved.winByTwo ?? true,
        maxPointsCap: resolved.maxPointsCap ?? 30,
        games: [{ pointsA: 0, pointsB: 0 }],
        currentGame: 0
      },
      server: {
        type: "badminton",
        servingTeamId: "A"
      }
    };
  }

  const { order, index } = buildServerOrder(
    resolved.format,
    teams,
    resolved.startingServerUserId
  );

  const superTiebreakOnly = resolved.superTiebreakOnly ?? false;
  return {
    config: resolved,
    teams,
    score: {
      sport: resolved.sport,
      bestOf: resolved.bestOf ?? 3,
      tiebreakAt6All: resolved.tiebreakAt === 6,
      tiebreakTo: resolveTiebreakTo(resolved.tiebreakTo),
      superTiebreakOnly,
      shortSetTo: resolved.shortSetTo,
      sets: [{ gamesA: 0, gamesB: 0 }],
      currentSet: 0,
      gamePointsA: 0,
      gamePointsB: 0,
      isTiebreak: superTiebreakOnly,
      tiebreakPointsA: 0,
      tiebreakPointsB: 0
    },
    server: {
      type: resolved.sport,
      order,
      index,
      tiebreakStartIndex: superTiebreakOnly ? index : undefined
    }
  };
};

export const undo = (state: MatchState): MatchState => state;

export const resetMatch = (
  state: MatchState,
  overrideConfig?: MatchConfig
): MatchState => {
  const config = overrideConfig ?? state.config;
  return createMatch(config, state.teams.A, state.teams.B);
};

const cloneSets = (sets: SetScore[]): SetScore[] =>
  sets.map((set) => ({ ...set }));

const serverForTiebreakPoint = (
  order: ServerRotationEntry[],
  startIndex: number,
  pointNumber: number
): number => {
  if (pointNumber === 1) {
    return startIndex;
  }
  const block = Math.floor((pointNumber - 2) / 2) + 1;
  return (startIndex + block) % order.length;
};

const countSetsWon = (
  sets: SetScore[],
  rules: Pick<TennisPadelScore, "tiebreakAt6All" | "shortSetTo">
): { winsA: number; winsB: number } => {
  return sets.reduce(
    (acc, set) => {
      const winner = getSetWinner(set.gamesA, set.gamesB, {
        tiebreakAt6All: rules.tiebreakAt6All,
        shortSetTo: rules.shortSetTo
      });
      if (winner === "A") {
        return { winsA: acc.winsA + 1, winsB: acc.winsB };
      }
      if (winner === "B") {
        return { winsA: acc.winsA, winsB: acc.winsB + 1 };
      }
      return acc;
    },
    { winsA: 0, winsB: 0 }
  );
};

const isGameWin = (pointsA: number, pointsB: number): TeamId | undefined => {
  if (pointsA >= 4 || pointsB >= 4) {
    if (Math.abs(pointsA - pointsB) >= 2) {
      return pointsA > pointsB ? "A" : "B";
    }
  }
  return undefined;
};

const startNextSet = (score: TennisPadelScore): TennisPadelScore => {
  return {
    ...score,
    sets: [...score.sets, { gamesA: 0, gamesB: 0 }],
    currentSet: score.currentSet + 1,
    gamePointsA: 0,
    gamePointsB: 0,
    isTiebreak: false,
    tiebreakPointsA: 0,
    tiebreakPointsB: 0
  };
};

const finalizeMatchIfNeeded = (
  score: TennisPadelScore
): TennisPadelScore => {
  const { winsA, winsB } = countSetsWon(score.sets, score);
  const needed = Math.ceil(score.bestOf / 2);
  if (winsA >= needed) {
    return { ...score, matchWinner: "A" };
  }
  if (winsB >= needed) {
    return { ...score, matchWinner: "B" };
  }
  return score;
};

const awardGame = (
  score: TennisPadelScore,
  server: TennisPadelServerState,
  winner: TeamId
): { score: TennisPadelScore; server: TennisPadelServerState } => {
  const nextScore: TennisPadelScore = {
    ...score,
    sets: cloneSets(score.sets),
    gamePointsA: 0,
    gamePointsB: 0
  };
  const set = nextScore.sets[nextScore.currentSet];
  if (winner === "A") {
    set.gamesA += 1;
  } else {
    set.gamesB += 1;
  }

  const setWinner = getSetWinner(set.gamesA, set.gamesB, {
    tiebreakAt6All: nextScore.tiebreakAt6All,
    shortSetTo: nextScore.shortSetTo
  });
  const nextServer = {
    ...server,
    index: (server.index + 1) % server.order.length
  };

  if (setWinner) {
    const updated = finalizeMatchIfNeeded(nextScore);
    if (updated.matchWinner) {
      return { score: updated, server: nextServer };
    }
    return { score: startNextSet(updated), server: nextServer };
  }

  if (
    shouldStartTiebreak(set.gamesA, set.gamesB, {
      tiebreakAt6All: nextScore.tiebreakAt6All,
      shortSetTo: nextScore.shortSetTo
    })
  ) {
    return {
      score: {
        ...nextScore,
        isTiebreak: true,
        tiebreakPointsA: 0,
        tiebreakPointsB: 0
      },
      server: {
        ...nextServer,
        tiebreakStartIndex: nextServer.index
      }
    };
  }

  return { score: nextScore, server: nextServer };
};

const finishTiebreak = (
  score: TennisPadelScore,
  server: TennisPadelServerState,
  winner: TeamId
): { score: TennisPadelScore; server: TennisPadelServerState } => {
  const nextScore: TennisPadelScore = {
    ...score,
    isTiebreak: false,
    tiebreakPointsA: 0,
    tiebreakPointsB: 0,
    sets: cloneSets(score.sets)
  };
  const set = nextScore.sets[nextScore.currentSet];
  if (winner === "A") {
    set.gamesA += 1;
  } else {
    set.gamesB += 1;
  }

  const startIndex = server.tiebreakStartIndex ?? server.index;
  const nextServer = {
    ...server,
    index: (startIndex + 1) % server.order.length,
    tiebreakStartIndex: undefined
  };

  const setWinner = getSetWinner(set.gamesA, set.gamesB, {
    tiebreakAt6All: nextScore.tiebreakAt6All,
    shortSetTo: nextScore.shortSetTo
  });
  if (setWinner) {
    const updated = finalizeMatchIfNeeded(nextScore);
    if (updated.matchWinner) {
      return { score: updated, server: nextServer };
    }
    return { score: startNextSet(updated), server: nextServer };
  }

  return { score: nextScore, server: nextServer };
};

const pointWonInTennis = (
  state: MatchState,
  teamId: TeamId
): MatchState => {
  const score = state.score as TennisPadelScore;
  const server = state.server as TennisPadelServerState;
  if (score.matchWinner) {
    return state;
  }

  if (score.isTiebreak) {
    const nextScore: TennisPadelScore = { ...score };
    if (teamId === "A") {
      nextScore.tiebreakPointsA += 1;
    } else {
      nextScore.tiebreakPointsB += 1;
    }
    const target = resolveTiebreakTo(nextScore.tiebreakTo);
    const tiebreakWinner =
      nextScore.tiebreakPointsA >= target ||
      nextScore.tiebreakPointsB >= target
        ? Math.abs(nextScore.tiebreakPointsA - nextScore.tiebreakPointsB) >=
          2
          ? nextScore.tiebreakPointsA > nextScore.tiebreakPointsB
            ? "A"
            : "B"
          : undefined
        : undefined;

    if (tiebreakWinner) {
      if (nextScore.superTiebreakOnly) {
        return {
          ...state,
          score: { ...nextScore, matchWinner: tiebreakWinner }
        };
      }
      const finished = finishTiebreak(nextScore, server, tiebreakWinner);
      return { ...state, score: finished.score, server: finished.server };
    }

    const totalPoints = nextScore.tiebreakPointsA + nextScore.tiebreakPointsB;
    const startIndex = server.tiebreakStartIndex ?? server.index;
    const nextPointNumber = totalPoints + 1;
    return {
      ...state,
      score: nextScore,
      server: {
        ...server,
        index: serverForTiebreakPoint(
          server.order,
          startIndex,
          nextPointNumber
        )
      }
    };
  }

  const nextScore: TennisPadelScore = { ...score };
  if (teamId === "A") {
    nextScore.gamePointsA += 1;
  } else {
    nextScore.gamePointsB += 1;
  }

  const winner = isGameWin(nextScore.gamePointsA, nextScore.gamePointsB);
  if (winner) {
    const awarded = awardGame(nextScore, server, winner);
    return { ...state, score: awarded.score, server: awarded.server };
  }

  return { ...state, score: nextScore };
};

const isBadmintonGameWin = (
  pointsA: number,
  pointsB: number,
  config: MatchConfig
): TeamId | undefined => {
  const pointsToWin = config.pointsToWinGame ?? 21;
  const cap = config.maxPointsCap ?? 30;
  if (pointsA === cap || pointsB === cap) {
    return pointsA > pointsB ? "A" : "B";
  }
  if (pointsA >= pointsToWin || pointsB >= pointsToWin) {
    if (Math.abs(pointsA - pointsB) >= 2) {
      return pointsA > pointsB ? "A" : "B";
    }
  }
  return undefined;
};

const pointWonInBadminton = (
  state: MatchState,
  teamId: TeamId
): MatchState => {
  const score = state.score as BadmintonScore;
  if (score.matchWinner) {
    return state;
  }

  const nextScore: BadmintonScore = {
    ...score,
    games: score.games.map((game) => ({ ...game }))
  };
  const current = nextScore.games[nextScore.currentGame];
  if (teamId === "A") {
    current.pointsA += 1;
  } else {
    current.pointsB += 1;
  }

  const gameWinner = isBadmintonGameWin(current.pointsA, current.pointsB, state.config);
  if (gameWinner) {
    const gamesWonA = nextScore.games.filter(
      (game) => game.pointsA > game.pointsB
    ).length;
    const gamesWonB = nextScore.games.filter(
      (game) => game.pointsB > game.pointsA
    ).length;
    const needed = state.config.gamesToWin ?? 2;
    if (
      gamesWonA >= needed ||
      gamesWonB >= needed
    ) {
      return {
        ...state,
        score: {
          ...nextScore,
          matchWinner: gamesWonA > gamesWonB ? "A" : "B"
        },
        server: {
          type: "badminton",
          servingTeamId: teamId
        }
      };
    }
    nextScore.games.push({ pointsA: 0, pointsB: 0 });
    nextScore.currentGame += 1;
  }

  return {
    ...state,
    score: nextScore,
    server: {
      type: "badminton",
      servingTeamId: teamId
    }
  };
};

export const pointWonBy = (state: MatchState, teamId: TeamId): MatchState => {
  if (state.config.sport === "badminton") {
    return pointWonInBadminton(state, teamId);
  }
  return pointWonInTennis(state, teamId);
};

export const getServer = (
  state: MatchState
): { teamId: TeamId; playerUserId: string } => {
  if (state.config.sport === "badminton") {
    const server = state.server as BadmintonServerState;
    const team = state.teams[server.servingTeamId];
    return {
      teamId: server.servingTeamId,
      playerUserId: team.players[0]?.userId ?? ""
    };
  }
  const server = state.server as TennisPadelServerState;
  const entry = server.order[server.index];
  const team = state.teams[entry.teamId];
  return {
    teamId: entry.teamId,
    playerUserId: team.players[entry.playerIndex]?.userId ?? ""
  };
};

const pointLabel = (points: number): string => {
  switch (points) {
    case 0:
      return "0";
    case 1:
      return "15";
    case 2:
      return "30";
    case 3:
      return "40";
    default:
      return "40";
  }
};

const pointDisplay = (score: TennisPadelScore, teamId: TeamId): string => {
  const ownPoints = teamId === "A" ? score.gamePointsA : score.gamePointsB;
  const opponentPoints = teamId === "A" ? score.gamePointsB : score.gamePointsA;
  if (ownPoints >= 3 && opponentPoints >= 3) {
    if (ownPoints === opponentPoints) {
      return "40";
    }
    return ownPoints > opponentPoints ? "Ad" : "40";
  }
  return pointLabel(ownPoints);
};

export const getDisplayScore = (state: MatchState): DisplayScore => {
  if (state.config.sport === "badminton") {
    const score = state.score as BadmintonScore;
    const current = score.games[score.currentGame];
    const completedGames = score.games.slice(0, score.currentGame);
    return {
      sport: "badminton",
      games: score.games,
      currentGame: score.currentGame,
      gamesWonA: completedGames.filter(
        (game) => game.pointsA > game.pointsB
      ).length,
      gamesWonB: completedGames.filter(
        (game) => game.pointsB > game.pointsA
      ).length,
      pointsA: current?.pointsA ?? 0,
      pointsB: current?.pointsB ?? 0
    };
  }
  const score = state.score as TennisPadelScore;
  const currentSet = score.sets[score.currentSet] ?? { gamesA: 0, gamesB: 0 };
  return {
    sport: score.sport,
    sets: score.sets,
    currentSet: score.currentSet,
    gamesA: currentSet.gamesA,
    gamesB: currentSet.gamesB,
    pointsA: score.gamePointsA,
    pointsB: score.gamePointsB,
    pointLabelA: score.isTiebreak
      ? `${score.tiebreakPointsA}`
      : pointDisplay(score, "A"),
    pointLabelB: score.isTiebreak
      ? `${score.tiebreakPointsB}`
      : pointDisplay(score, "B"),
    isTiebreak: score.isTiebreak,
    tiebreakPointsA: score.tiebreakPointsA,
    tiebreakPointsB: score.tiebreakPointsB
  };
};
