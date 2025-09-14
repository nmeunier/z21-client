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
    engine: boolean;
    accessory: boolean;
    feedback: boolean;
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

export interface FeedbackModuleStatus {
    address: number;
    activeInputs: number[];
}

export interface FeedbackResult {
    type: "feedback";
    value: FeedbackModuleStatus[];
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
    | UnknownBroadcastResult
    | AccessoryInfoResult
    | EngineInfoResult
    | CvResult
    | FeedbackResult;
