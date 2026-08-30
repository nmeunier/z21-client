// Global results
export interface ErrorResult {
    type: "error";
    value: ErrorResultData;
}

export interface ErrorResultData {
    code: "invalid-payload" | "nack" | "nack-sc";
    message: string;
}

// LAN Parser results
export interface SerialNumberResult {
    type: "serialNumber";
    value: SerialNumberResultData;
}

export interface SerialNumberResultData {
    serialNumber: number;
}

export interface BroadcastFlagsResult {
    type: "broadcastFlags";
    value: BroadcastFlagsResultData;
}

export interface BroadcastFlagsResultData {
    raw: number;
    driving: boolean;          // 0x00000001
    rbus: boolean;             // 0x00000002
    railcom: boolean;          // 0x00000004
    systemState: boolean;      // 0x00000100
    loconetDetector: boolean;  // 0x08000000
    canDetector: boolean;      // 0x00080000
}

// LANX Parser results
export type StatusValue =
    | "Emergency Stop Activated"
    | "Track Voltage Off"
    | "Short Circuit"
    | "Programming Mode Active"
    | "Unknown Status";

export type SpeedSteps = 14 | 28 | 128 | "unknown";

export interface StatusResult {
    type: "status";
    value: StatusValue;
}


export interface TrackPowerResult {
    type: "trackPower";
    value: "on" | "off";
}

export interface ProgrammingModeResult {
    type: "programmingMode";
    value: "active" | "inactive";
}

export interface ShortCircuitResult {
    type: "shortCircuit";
    value: "detected"
}

export interface StoppedResult {
    type: "stopped";
}


export interface UnknownBroadcastResult {
    type: "unknownBroadcast";
    value: number;
}


export interface AccessoryInfoResult {
    type: "accessoryInfo";
    value: AccessoryInfoResultData;
}

export interface AccessoryInfoResultData {
    address: number;
    position: "not_switched" | "P0" | "P1" | "invalid";
}

export interface ExtAccessoryInfoResult {
    type: "extAccessoryInfo";
    value: ExtAccessoryInfoResultData;
}

export interface ExtAccessoryInfoResultData {
    address: number;
    aspect: number;
    valid: boolean;
}

export interface EngineInfoResult {
    type: "engineInfo";
    value: EngineInfoResultData;
}

export interface EngineInfoResultData {
    address: number;
    busy: boolean;
    speedSteps: SpeedSteps;
    direction: "forward" | "reverse";
    speed: number;
    doubleTraction: boolean;
    functions: Record<string, boolean>; // F0-F31
}

export interface CvResult {
    type: "cvResult";
    value: CvResultData;
}

export interface CvResultData {
    cv: number;
    value: number;
}

// Detector results (R-BUS / LocoNet / CAN)
export type FeedbackBus = "rbus" | "loconet" | "can";
export type TransponderBus = "loconet" | "can";
export type Direction = "forward" | "reverse" | "unknown";

export interface OccupancyChannel {
    address: number;   // R-BUS: module 1..20 | LocoNet: feedback address | CAN: configurable module Addr
    channel: number;   // R-BUS: input 1..8   | LocoNet: 0                | CAN: port 0..7
    occupied: boolean;
    nid?: number;       // CAN only: hardware CAN network id
}

export interface OccupancyResult {
    type: "occupancy";
    value: { bus: FeedbackBus; channels: OccupancyChannel[] };
}

// EXPERIMENTAL — not tested on real hardware
export interface TransponderChannel {
    address: number;
    channel: number;
    nid?: number;       // CAN only
    locoAddress: number;
    direction: Direction;
    present: boolean;   // LocoNet enter=true / exit=false ; CAN & LISSY: true
}

export interface TransponderResult {
    type: "transponder";
    value: { bus: TransponderBus; channels: TransponderChannel[] };
}

/**
 * Union type for all possible results
 */
export type ParserResult =
    | ErrorResult
    | SerialNumberResult
    | BroadcastFlagsResult
    | StatusResult
    | TrackPowerResult
    | ProgrammingModeResult
    | ShortCircuitResult
    | StoppedResult
    | UnknownBroadcastResult
    | AccessoryInfoResult
    | ExtAccessoryInfoResult
    | EngineInfoResult
    | CvResult
    | OccupancyResult
    | TransponderResult;
