import { ParserResult } from "./parserResult";

export class LanParser {
  /**
   * Parse Z21 LAN commands (0x40 command class).
   * These are non-LAN_X commands like serial number, hardware info, etc.
   * @param opcode - LAN command opcode
   * @param payload - Data after the opcode
   * @returns Parsed object or undefined if payload is invalid/unknown opcode
   */
  public parse(opcode: number, payload: Buffer): ParserResult | null {
    switch (opcode) {
      case 0x10: // GET_SERIAL_NUMBER
        if (payload.length === 4) {
          const serialNumber = payload.readUInt32LE(0);
          return { type: "serialNumber", value: { "serialNumber": serialNumber } };
        } else {
          console.log("[LAN Parser] Wrong Payload for GET_SERIAL_NUMBER");
          return null;
        }

      case 0x51: // GET_BROADCAST_FLAGS
        if (payload.length >= 4) {
          const flags = payload.readUInt32LE(0);
          return {
            type: "broadcastFlags",
            value: {
              raw: flags,
              engine: !!(flags & 0x01),
              accessory: !!(flags & 0x02),
              feedback: !!(flags & 0x04),
            },
          };
        } else {
          console.log("[LAN Parser] Payload too short for GET_BROADCAST_FLAGS");
          return null;
        }
      default:
        return null;
    }
  }
}

