import { ParserResult, OccupancyChannel } from "./parserResult";

const tooShort = (command: string): ParserResult => ({
  type: "error",
  value: { code: "invalid-payload", message: `${command} frame too short` },
});

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
}
