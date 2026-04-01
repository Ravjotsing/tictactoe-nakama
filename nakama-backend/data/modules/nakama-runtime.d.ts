// Nakama Runtime Type Declarations
// Based on https://github.com/heroiclabs/nakama-common

declare namespace nkruntime {
  interface Context {
    env: { [key: string]: string };
    executionMode: string;
    node: string;
    version: string;
    headers: { [key: string]: string[] };
    queryParams: { [key: string]: string[] };
    userId: string;
    username: string;
    vars: { [key: string]: string };
    sessionExpiry: number;
    sessionId: string;
    clientIp: string;
    clientPort: string;
    matchId: string;
    matchNode: string;
    matchLabel: string;
    matchTickRate: number;
  }

  interface Logger {
    debug(format: string, ...params: any[]): void;
    info(format: string, ...params: any[]): void;
    warn(format: string, ...params: any[]): void;
    error(format: string, ...params: any[]): void;
  }

  interface Presence {
    userId: string;
    sessionId: string;
    username: string;
    node: string;
    status: string;
  }

  interface MatchMessage {
    sender: Presence;
    persistence: boolean;
    status: string;
    opCode: number;
    data: Uint8Array;
    receiveTimeMs: number;
  }

  interface MatchDispatcher {
    broadcastMessage(opCode: number, data: string | Uint8Array, presences: Presence[] | null, sender: Presence | null, reliable: boolean): void;
    matchKick(presences: Presence[]): void;
    matchLabelUpdate(label: string): void;
  }

  interface StorageObject {
    collection: string;
    key: string;
    userId: string;
    value: any;
    version: string;
    permissionRead: number;
    permissionWrite: number;
    createTime: number;
    updateTime: number;
  }

  interface StorageWriteRequest {
    collection: string;
    key: string;
    userId: string;
    value: any;
    version?: string;
    permissionRead: number;
    permissionWrite: number;
  }

  interface StorageReadRequest {
    collection: string;
    key: string;
    userId: string;
  }

  interface LeaderboardRecord {
    leaderboardId: string;
    ownerId: string;
    username: string;
    score: number;
    subscore: number;
    numScore: number;
    maxNumScore: number;
    metadata: any;
    createTime: number;
    updateTime: number;
    expiryTime: number;
    rank: number;
  }

  interface LeaderboardRecordList {
    records: LeaderboardRecord[];
    ownerRecords: LeaderboardRecord[];
    nextCursor: string;
    prevCursor: string;
  }

  interface Match {
    matchId: string;
    authoritative: boolean;
    label: string;
    size: number;
    tickRate: number;
    handlerName: string;
  }

  interface Nakama {
    // Storage
    storageRead(reads: StorageReadRequest[]): StorageObject[];
    storageWrite(writes: StorageWriteRequest[]): StorageObject[];
    storageDelete(deletes: StorageReadRequest[]): void;

    // Leaderboard
    leaderboardCreate(id: string, authoritative: boolean, sortOrder: string, operator: string, resetSchedule: string, metadata: any): void;
    leaderboardRecordWrite(id: string, ownerId: string, username: string, score: number, subscore: number, metadata: any): LeaderboardRecord;
    leaderboardRecordsList(id: string, ownerIds: string[] | null, limit: number, cursor: string | null, expiry: number): LeaderboardRecordList;

    // Users
    usersGetId(userIds: string[], facebookIds: string[]): Array<{ id: string; username: string; displayName: string }>;

    // Match
    matchCreate(module: string, params?: { [key: string]: string }): string;
    matchList(limit: number, authoritative: boolean | null, label: string | null, minSize: number | null, maxSize: number | null, query: string | null): Match[];

    // Utility
    binaryToString(data: Uint8Array): string;
    stringToBinary(str: string): Uint8Array;
    uuidV4(): string;
  }

  type RpcFunction = (ctx: Context, logger: Logger, nk: Nakama, payload: string) => string;

  interface MatchInitResult {
    state: any;
    tickRate: number;
    label: string;
  }

  type MatchInitFunction = (ctx: Context, logger: Logger, nk: Nakama, params: { [key: string]: string }) => MatchInitResult;
  type MatchJoinAttemptFunction = (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: any, presence: Presence, metadata: { [key: string]: any }) => { state: any; accept: boolean; rejectMessage?: string };
  type MatchJoinFunction = (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: any, presences: Presence[]) => { state: any } | null;
  type MatchLeaveFunction = (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: any, presences: Presence[]) => { state: any } | null;
  type MatchLoopFunction = (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: any, messages: MatchMessage[]) => { state: any } | null;
  type MatchTerminateFunction = (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: any, graceSeconds: number) => { state: any } | null;
  type MatchSignalFunction = (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: any, data: string) => { state: any; data: string };

  interface MatchHandler {
    matchInit: MatchInitFunction;
    matchJoinAttempt: MatchJoinAttemptFunction;
    matchJoin: MatchJoinFunction;
    matchLeave: MatchLeaveFunction;
    matchLoop: MatchLoopFunction;
    matchTerminate: MatchTerminateFunction;
    matchSignal: MatchSignalFunction;
  }

  interface Initializer {
    registerRpc(id: string, fn: RpcFunction): void;
    registerMatch(name: string, handlers: MatchHandler): void;
    registerBeforeRt(id: string, fn: Function): void;
    registerAfterRt(id: string, fn: Function): void;
  }
}

declare function InitModule(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer): void;
