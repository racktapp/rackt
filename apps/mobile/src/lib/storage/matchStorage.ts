import { TimelineEvent } from "../match/timeline";
import {
  createMatch,
  MatchConfig as EngineMatchConfig,
  MatchState,
  Team
} from "../scoring/engine";

export type MatchConfig = EngineMatchConfig & {
  teamA: Team;
  teamB: Team;
  startTime: number;
  tiebreakAt6All?: boolean;
};

export type StoredMatch = {
  config: MatchConfig;
  matchState: MatchState;
  history: MatchState[];
  timeline: TimelineEvent[];
};

const STORAGE_KEY = "rackt.match";

const getStorage = (): Storage | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const loadMatch = (): StoredMatch | null => {
  const storage = getStorage();
  if (!storage) {
    return null;
  }
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as StoredMatch;
    const fallbackTeamA = parsed.config?.teamA ?? {
      id: "A" as const,
      players: [
        {
          userId: "A-1",
          name: (parsed.config as { playerAName?: string })?.playerAName ?? "Player A"
        }
      ]
    };
    const fallbackTeamB = parsed.config?.teamB ?? {
      id: "B" as const,
      players: [
        {
          userId: "B-1",
          name: (parsed.config as { playerBName?: string })?.playerBName ?? "Player B"
        }
      ]
    };
    const config: MatchConfig = {
      ...(parsed.config as MatchConfig),
      teamA: fallbackTeamA,
      teamB: fallbackTeamB,
      sport: parsed.config?.sport ?? "tennis",
      format: parsed.config?.format ?? "singles",
      bestOf: parsed.config?.bestOf ?? 3,
      tiebreakAt6All: parsed.config?.tiebreakAt6All ?? true,
      tiebreakTo: parsed.config?.tiebreakTo ?? 7,
      tiebreakAt:
        parsed.config?.tiebreakAt ??
        (parsed.config?.tiebreakAt6All ?? true ? 6 : undefined),
      superTiebreakOnly: parsed.config?.superTiebreakOnly ?? false,
      shortSetTo: parsed.config?.shortSetTo,
      gamesToWin: parsed.config?.gamesToWin ?? 2,
      pointsToWinGame: parsed.config?.pointsToWinGame ?? 21,
      winByTwo: parsed.config?.winByTwo ?? true,
      maxPointsCap: parsed.config?.maxPointsCap ?? 30,
      startTime: parsed.config?.startTime ?? Date.now()
    };
    const legacyState = (parsed as { tennisState?: Record<string, unknown> })
      .tennisState;
    let matchState = parsed.matchState;
    if (!matchState) {
      if (legacyState) {
        const base = createMatch(config, config.teamA, config.teamB);
        if (base.score.sport !== "badminton") {
          const { server: legacyServer, ...legacyScore } =
            legacyState as Record<string, unknown>;
          base.score = {
            ...base.score,
            ...legacyScore
          } as MatchState["score"];
          if (legacyServer) {
            const serverIndex = base.server.order.findIndex(
              (entry) => entry.teamId === legacyServer
            );
            if (serverIndex >= 0) {
              base.server = { ...base.server, index: serverIndex };
            }
          }
        }
        matchState = base;
      }
    }
    return {
      ...parsed,
      config,
      matchState: matchState ?? createMatch(config, config.teamA, config.teamB),
      timeline: parsed.timeline ?? []
    };
  } catch {
    return null;
  }
};

export const saveMatch = (match: StoredMatch): void => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.setItem(STORAGE_KEY, JSON.stringify(match));
};

export const clearMatch = (): void => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.removeItem(STORAGE_KEY);
};
