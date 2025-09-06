import { LanXParser } from "./lanXParser";
import { LanParser } from "./lanParser";
import { ParserResult } from "./parserResult";

export class FeedbackParser {
  private lanParser: LanParser;
  private lanXParser: LanXParser;

  constructor() {
    this.lanParser = new LanParser();
    this.lanXParser = new LanXParser();
  }

  public parse(payload: Buffer): ParserResult | null {
    if (!Buffer.isBuffer(payload) || payload.length < 2) {
      return {
        type: "error",
        value: {
          code: "invalid-payload",
          message: "Invalid payload length"
        }
      };
    }

    // Expected length is indicated in the first two bytes
    const expectedLength = payload.readUInt16LE(0);
    if (payload.length < expectedLength) {
      return {
        type: "error",
        value: {
          code: "invalid-payload",
          message: "Payload shorter than expected length"
        }
      };
    }

    // Buffer without the first 2 bytes (length)
    const data = Buffer.from(payload.subarray(2));

    if (data[0] === 0x40) {
      // LAN_X command: remove first 2 bytes of LAN_X header
      return this.lanXParser.parse(Buffer.from(data.subarray(2)));
    } else if (data[0] === 0x10 || data[0] === 0x51) {
      // LAN command
      return this.lanParser.parse(data[0], data.subarray(2));
    }

    return null;
  }
}

