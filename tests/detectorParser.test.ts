import { DetectorParser, decodeLoconetDirection } from "../src/parsers/detectorParser";
import { OccupancyResult } from "../src/parsers/parserResult";

describe("DetectorParser — R-BUS (0x80)", () => {
  const parser = new DetectorParser();

  // payload = frame bytes AFTER the 2-byte Z21 header: groupIndex(1) + status[10]
  const rbus = (groupIndex: number, status: number[]) =>
    Buffer.from([groupIndex, ...status]);

  it("decodes a group snapshot into 80 channels with bus 'rbus'", () => {
    const result = parser.parse(0x80, rbus(0, [0x01, 0x00, 0xc5, 0, 0, 0, 0, 0, 0, 0])) as OccupancyResult;
    expect(result.type).toBe("occupancy");
    expect(result.value.bus).toBe("rbus");
    expect(result.value.channels).toHaveLength(80);
  });

  it("marks exactly the active inputs occupied (groupIndex 0)", () => {
    const result = parser.parse(0x80, rbus(0, [0x01, 0x00, 0xc5, 0, 0, 0, 0, 0, 0, 0])) as OccupancyResult;
    const occupied = result.value.channels.filter((c) => c.occupied);
    expect(occupied).toEqual([
      { address: 1, channel: 1, occupied: true },
      { address: 3, channel: 1, occupied: true },
      { address: 3, channel: 3, occupied: true },
      { address: 3, channel: 7, occupied: true },
      { address: 3, channel: 8, occupied: true },
    ]);
  });

  it("includes free channels in the snapshot", () => {
    const result = parser.parse(0x80, rbus(0, [0x01, 0, 0, 0, 0, 0, 0, 0, 0, 0])) as OccupancyResult;
    expect(result.value.channels).toContainEqual({ address: 1, channel: 2, occupied: false });
  });

  it("offsets addresses by 10 for groupIndex 1", () => {
    const result = parser.parse(0x80, rbus(1, [0x01, 0x00, 0xc5, 0, 0, 0, 0, 0, 0, 0])) as OccupancyResult;
    const occupied = result.value.channels.filter((c) => c.occupied);
    expect(occupied).toEqual([
      { address: 11, channel: 1, occupied: true },
      { address: 13, channel: 1, occupied: true },
      { address: 13, channel: 3, occupied: true },
      { address: 13, channel: 7, occupied: true },
      { address: 13, channel: 8, occupied: true },
    ]);
  });

  it("returns an error for a truncated frame", () => {
    expect(parser.parse(0x80, Buffer.from([0x00, 0x01, 0x02]))).toEqual({
      type: "error",
      value: { code: "invalid-payload", message: "LAN_RMBUS_DATACHANGED frame too short" },
    });
  });

  it("returns null for an unhandled opcode", () => {
    expect(parser.parse(0x99, Buffer.alloc(11))).toBeNull();
  });
});

describe("decodeLoconetDirection", () => {
  it("returns unknown when DIR1 bit (0x40) is clear", () => {
    expect(decodeLoconetDirection(0x00)).toBe("unknown");
    expect(decodeLoconetDirection(0x20)).toBe("unknown");
  });
  it("returns forward when DIR1 set and DIR0 (0x20) clear", () => {
    expect(decodeLoconetDirection(0x40)).toBe("forward");
  });
  it("returns reverse when DIR1 and DIR0 set", () => {
    expect(decodeLoconetDirection(0x60)).toBe("reverse");
  });
});

describe("DetectorParser — LocoNet (0xA4) [experimental]", () => {
  const parser = new DetectorParser();
  // payload = type(1) + feedbackAddr(2 LE) + info[n]
  const ln = (type: number, addr: number, info: number[] = []) =>
    Buffer.from([type, addr & 0xff, (addr >> 8) & 0xff, ...info]);

  it("type 0x01: occupied", () => {
    expect(parser.parse(0xa4, ln(0x01, 5, [1]))).toEqual({
      type: "occupancy",
      value: { bus: "loconet", channels: [{ address: 5, channel: 0, occupied: true }] },
    });
  });

  it("type 0x01: free", () => {
    expect(parser.parse(0xa4, ln(0x01, 5, [0]))).toEqual({
      type: "occupancy",
      value: { bus: "loconet", channels: [{ address: 5, channel: 0, occupied: false }] },
    });
  });

  it("type 0x11 (LISSY block) decodes like occupancy", () => {
    expect(parser.parse(0xa4, ln(0x11, 9, [1]))).toEqual({
      type: "occupancy",
      value: { bus: "loconet", channels: [{ address: 9, channel: 0, occupied: true }] },
    });
  });

  it("type 0x02: transponder enters block", () => {
    expect(parser.parse(0xa4, ln(0x02, 7, [0xd2, 0x04]))).toEqual({
      type: "transponder",
      value: {
        bus: "loconet",
        channels: [{ address: 7, channel: 0, locoAddress: 1234, direction: "unknown", present: true }],
      },
    });
  });

  it("type 0x03: transponder exits block", () => {
    const result = parser.parse(0xa4, ln(0x03, 7, [0xd2, 0x04])) as any;
    expect(result.value.channels[0]).toMatchObject({ locoAddress: 1234, present: false });
  });

  it("type 0x10: LISSY loco with direction", () => {
    expect(parser.parse(0xa4, ln(0x10, 3, [0xd2, 0x04, 0x60]))).toEqual({
      type: "transponder",
      value: {
        bus: "loconet",
        channels: [{ address: 3, channel: 0, locoAddress: 1234, direction: "reverse", present: true }],
      },
    });
  });

  it("type 0x12 (LISSY speed) is ignored", () => {
    expect(parser.parse(0xa4, ln(0x12, 3, [0x10, 0x00]))).toBeNull();
  });

  it("unknown type is ignored", () => {
    expect(parser.parse(0xa4, ln(0x77, 3, [0x00]))).toBeNull();
  });

  it("truncated frame returns an error", () => {
    expect(parser.parse(0xa4, Buffer.from([0x01, 0x05]))).toEqual({
      type: "error",
      value: { code: "invalid-payload", message: "LAN_LOCONET_DETECTOR frame too short" },
    });
  });

  it("recognised type with missing info returns an error", () => {
    expect(parser.parse(0xa4, ln(0x02, 7, [0x01]))).toEqual({
      type: "error",
      value: { code: "invalid-payload", message: "LAN_LOCONET_DETECTOR frame too short" },
    });
  });
});
