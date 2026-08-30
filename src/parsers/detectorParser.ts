import { ParserResult, OccupancyChannel, Direction } from "./parserResult";

const tooShort = (command: string): ParserResult => ({
  type: "error",
  value: { code: "invalid-payload", message: `${command} frame too short` },
});

/** Decode the DIR1/DIR0 bits of LocoNet detector type 0x10 info[2]. @experimental not tested on real hardware. */
export function decodeLoconetDirection(b: number): Direction {
  if ((b & 0x40) === 0) return "unknown";
  return (b & 0x20) === 0 ? "forward" : "reverse";
}

export class DetectorParser {
  /**
   * Decode a Z21 detector frame.
   * @param opcode first header byte: 0x80 (R-BUS), 0xA4 (LocoNet), 0xC4 (CAN)
   * @param payload frame bytes AFTER the 2-byte Z21 header
   */
  public parse(opcode: number, payload: Buffer): ParserResult | null {
    switch (opcode) {
      case 0x80:
        return this.parseRbus(payload);
      case 0xa4:
        return this.parseLoconet(payload);
      default:
        return null;
    }
  }

  /** LAN_RMBUS_DATACHANGED (Z21 §7.1): groupIndex(1) + status[10], 1 bit per input. */
  private parseRbus(payload: Buffer): ParserResult | null {
    if (payload.length < 11) {
      return tooShort("LAN_RMBUS_DATACHANGED");
    }
    const groupIndex = payload[0];
    const channels: OccupancyChannel[] = [];
    for (let i = 0; i < 10; i++) {
      const address = groupIndex * 10 + i + 1;
      const byte = payload[1 + i];
      for (let bit = 0; bit < 8; bit++) {
        channels.push({ address, channel: bit + 1, occupied: (byte & (1 << bit)) !== 0 });
      }
    }
    return { type: "occupancy", value: { bus: "rbus", channels } };
  }

  /** LAN_LOCONET_DETECTOR (Z21 §9.5). EXPERIMENTAL — not tested on real hardware. */
  private parseLoconet(payload: Buffer): ParserResult | null {
    if (payload.length < 3) {
      return tooShort("LAN_LOCONET_DETECTOR");
    }
    const type = payload[0];
    const address = payload.readUInt16LE(1);
    const info = payload.subarray(3);

    switch (type) {
      case 0x01: // occupancy
      case 0x11: // LISSY block status
        if (info.length < 1) return tooShort("LAN_LOCONET_DETECTOR");
        return {
          type: "occupancy",
          value: { bus: "loconet", channels: [{ address, channel: 0, occupied: info[0] === 1 }] },
        };
      case 0x02: // transponder enters block
      case 0x03: // transponder exits block
        if (info.length < 2) return tooShort("LAN_LOCONET_DETECTOR");
        return {
          type: "transponder",
          value: {
            bus: "loconet",
            channels: [{
              address,
              channel: 0,
              locoAddress: info.readUInt16LE(0),
              direction: "unknown",
              present: type === 0x02,
            }],
          },
        };
      case 0x10: // LISSY loco address
        if (info.length < 3) return tooShort("LAN_LOCONET_DETECTOR");
        return {
          type: "transponder",
          value: {
            bus: "loconet",
            channels: [{
              address,
              channel: 0,
              locoAddress: info.readUInt16LE(0),
              direction: decodeLoconetDirection(info[2]),
              present: true,
            }],
          },
        };
      default: // 0x12 LISSY speed + any future/unknown type
        return null;
    }
  }
}
