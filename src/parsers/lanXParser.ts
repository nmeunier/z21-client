import { LAN_X_BC_CODES } from "./lanXReturnCodes";
import { CS_STATUS } from "./commandStationStatus";
import { ParserResult, SpeedSteps, StatusValue } from "./parserResult";



/**
 * Parser for LAN_X commands (0x40 command class).
 * Handles status changes, broadcasts, turnout info, and engine info.
 */
export class LanXParser {
  public parse(payload: Buffer): ParserResult | null {
    const opcode = payload[0];

    switch (opcode) {
      case 0x62: // LAN_X_STATUS_CHANGED
        if (payload[1] === 0x22) {
          const statusMap: Record<number, StatusValue> = {
            [CS_STATUS.CS_EMERGENCY_STOP]: "Emergency Stop Activated",
            [CS_STATUS.CS_TRACK_VOLTAGE_OFF]: "Track Voltage Off",
            [CS_STATUS.CS_SHORT_CIRCUIT]: "Short Circuit",
            [CS_STATUS.CS_PROGRAMMING_MODE_ACTIVE]: "Programming Mode Active",
          };
          const status = statusMap[payload[2]] ?? "Unknown Status";
          return { type: "status", value: status };
        }
        break;

      case 0x61: // LAN_X_BROADCAST
        switch (payload[1]) {
          case LAN_X_BC_CODES.LAN_X_BC_TRACK_POWER_OFF:
            return { type: "trackPower", value: "off" };
          case LAN_X_BC_CODES.LAN_X_BC_TRACK_POWER_ON:
            return { type: "trackPower", value: "on" };
          case LAN_X_BC_CODES.LAN_X_BC_PROGRAMMING_MODE:
            return { type: "programmingMode", value: "active" };
          case LAN_X_BC_CODES.LAN_X_BC_TRACK_SHORT_CIRCUIT:
            return { type: "shortCircuit", value: "detected" };
          case LAN_X_BC_CODES.LAN_X_CV_NACK:
            return {
              type: "error", value: {
                code: "nack",
                message: "CV Read/Write NACK"
              }
            };
          case LAN_X_BC_CODES.LAN_X_CV_NACK_SC:
            return {
              type: "error", value: {
                code: "nack-sc",
                message: "CV Read/Write NACK due to short-circuit"
              }
            };
          default:
            console.warn(`[LAN_X Parser] Unknown broadcast code: 0x${payload[1].toString(16)}`);
            return { type: "unknownBroadcast", value: payload[1] };
        }

      case 0x64: // LAN_X_CV_RESULT
        if (payload[1] === 0x14) {
          return this.parseCV(payload);
        }
        break;
      case 0x43: // LAN_X_TURNOUT_INFO
        return this.parseTurnoutInfo(payload.subarray(1));

      case 0xEF: // LAN_X_ENGINE_INFO
        return this.parseEngineInfo(payload.subarray(1));

      default:
        console.warn(`[LAN_X Parser] Unknown opcode: 0x${opcode.toString(16)}`);
        return null;
    }

    return null;
  }

  private parseTurnoutInfo(payload: Buffer): ParserResult {
    const adrMsb = payload[0] & 0x3F;
    const adrLsb = payload[1];
    const turnoutAddress = ((adrMsb << 8) + adrLsb) + 1;

    const turnoutStatus = payload[2] & 0b11;
    let position: "not_switched" | "P0" | "P1" | "invalid";
    switch (turnoutStatus) {
      case 0b00:
        position = "not_switched";
        break;
      case 0b01:
        position = "P0";
        break;
      case 0b10:
        position = "P1";
        break;
      default:
        position = "invalid";
    }

    return { type: "accessoryInfo", value: { address: turnoutAddress, position } };
  }

  private parseEngineInfo(payload: Buffer): ParserResult {
    const adrMsb = payload[0] & 0x3F;
    const adrLsb = payload[1];
    const engineAddress = (adrMsb << 8) + adrLsb;

    const db2 = payload[2];
    const busy = (db2 & 0b00001000) !== 0;
    const kkk = db2 & 0b00000111;

    let speedSteps: SpeedSteps;
    switch (kkk) {
      case 0:
        speedSteps = 14;
        break;
      case 2:
        speedSteps = 28;
        break;
      case 4:
        speedSteps = 128;
        break;
      default:
        speedSteps = "unknown";
    }

    const db3 = payload[3];
    const direction = (db3 & 0x80) ? "forward" : "reverse";
    const speed = db3 & 0x7F;

    const db4 = payload[4];
    // Not officially documented in Z21/LAN_X protocol; may always be false
    const doubleTraction = (db4 & 0b01000000) !== 0;
    const functions: Record<string, boolean> = {
      F0: (db4 & 0b00010000) !== 0,
      F1: (db4 & 0b00000001) !== 0,
      F2: (db4 & 0b00000010) !== 0,
      F3: (db4 & 0b00000100) !== 0,
      F4: (db4 & 0b00001000) !== 0,
    };

    if (payload.length > 5) {
      for (let i = 0; i < 8; i++) functions[`F${5 + i}`] = (payload[5] & (1 << i)) !== 0;
    }
    if (payload.length > 6) {
      for (let i = 0; i < 8; i++) functions[`F${13 + i}`] = (payload[6] & (1 << i)) !== 0;
    }
    if (payload.length > 7) {
      for (let i = 0; i < 8; i++) functions[`F${21 + i}`] = (payload[7] & (1 << i)) !== 0;
    }
    if (payload.length > 8) {
      for (let i = 0; i < 3; i++) functions[`F${29 + i}`] = (payload[8] & (1 << i)) !== 0;
    }

    return {
      type: "engineInfo",
      value: {
        address: engineAddress,
        busy,
        speedSteps,
        direction,
        speed,
        doubleTraction,
        functions,
      },
    };
  }

  private parseCV(payload: Buffer): ParserResult {

    const cvMsb = payload[2];
    const cvLsb = payload[3];
    const value = payload[4];
    const cvAddress = (cvMsb << 8) + cvLsb;

    return {
      type: "cvResult",
      value: {
        cv: cvAddress + 1, // CVs are 1-based for user
        value,
      },
    };
  }


}
