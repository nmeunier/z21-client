import { DetectorParser } from "../src/parsers/detectorParser";
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
