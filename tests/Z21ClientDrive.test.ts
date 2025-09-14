// tests/Z21ClientDrive.test.ts
import { Z21Client } from "../src/Z21Client";
import dgram from "dgram";

jest.mock("dgram");

describe("Z21Client", () => {
  let client: Z21Client;
  let mockSocket: any;
  let mockParser: any;

  // Setup before each test
  beforeEach(() => {
    mockSocket = {
      send: jest.fn((buffer, port, host, cb) => cb && cb(null)),
      on: jest.fn(),
      close: jest.fn(),
    };
    (dgram.createSocket as jest.Mock).mockReturnValue(mockSocket);

    // Mock FeedbackParser to control parse returns
    mockParser = {
      parse: jest.fn(),
    };

    // Patch the constructor to inject the mock parser
    jest.spyOn(require("../src/parsers/feedbackParser"), "FeedbackParser").mockImplementation(() => mockParser);

    client = new Z21Client("192.168.0.100", 21105);
  });

  // Cleanup after each test
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("should send a UDP packet for setEngineFunctions", async () => {
    await client.engines.setEngineFunctions(3, 1, "on");
    expect(mockSocket.send).toHaveBeenCalledTimes(1);
    const sentBuffer: Buffer = mockSocket.send.mock.calls[0][0];
    expect(sentBuffer[2]).toBe(0x40);
  });

  it("should send a UDP packet to drive engine 1234 at speed 50 forward", async () => {
    client.engines.setDriveEngine(1234, 50, true);
    expect(mockSocket.send).toHaveBeenCalledTimes(1);
    const sentBuffer: Buffer = mockSocket.send.mock.calls[0][0];
    expect(sentBuffer[2]).toBe(0x40);
    const expected = [0xE4, 0x13, 0x04, 0xD2, 0xB2, 0x93];
    const actual = Array.from(sentBuffer.subarray(4, 10));
    expect(actual).toEqual(expected);
  });

  it("should send a UDP packet to activate F0 for engine 1234", async () => {
    await client.engines.setEngineFunctions(1234, 0, "on");
    expect(mockSocket.send).toHaveBeenCalledTimes(1);
    const sentBuffer: Buffer = mockSocket.send.mock.calls[0][0];
    expect(sentBuffer[2]).toBe(0x40);
    const expected = [0xE4, 0xF8, 0x04, 0xD2, 0x40];
    const actual = Array.from(sentBuffer.subarray(4, 9));
    expect(actual).toEqual(expected);
  });

  it("should send a UDP packet for getEngineInfo", async () => {
    await client.engines.getEngineInfo(1234);
    expect(mockSocket.send).toHaveBeenCalledTimes(1);
    const sentBuffer: Buffer = mockSocket.send.mock.calls[0][0];
    // For 1234: addrMsb = 0xC4, addrLsb = 0xD2, XOR calculated
    // Expected payload: [0x40, 0x00, 0xE3, 0xF0, 0xC4, 0xD2, xor]
    expect(Array.from(sentBuffer.subarray(4, 9))).toEqual([0xE3, 0xF0, 0xC4, 0xD2, 0x05]);
  });

  it("should send a UDP packet to drive engine 1234 at speed 50 forward with 28 speed steps", async () => {
    client.engines.setDriveEngine(1234, 50, true, 28);
    expect(mockSocket.send).toHaveBeenCalledTimes(1);
    const sentBuffer: Buffer = mockSocket.send.mock.calls[0][0];
    // steps = 0x12 (DCC27), addrH = 0x04, addrL = 0xD2, speedByte = 0xB2
    // Expected payload: [0xE4, 0x12, 0x04, 0xD2, 0xB2, xor]
    const expected = [0xE4, 0x12, 0x04, 0xD2, 0xB2, 0x92];
    expect(Array.from(sentBuffer.subarray(4, 10))).toEqual(expected);
  });

  it("should send a UDP packet to drive engine 1234 at speed 50 forward with 14 speed steps", async () => {
    client.engines.setDriveEngine(1234, 50, true, 14);
    expect(mockSocket.send).toHaveBeenCalledTimes(1);
    const sentBuffer: Buffer = mockSocket.send.mock.calls[0][0];
    // steps = 0x10 (DCC14), addrH = 0x04, addrL = 0xD2, speedByte = 0xB2
    // Expected payload: [0xE4, 0x10, 0x04, 0xD2, 0xB2, xor]
    const expected = [0xE4, 0x10, 0x04, 0xD2, 0xB2, 0x90];
    expect(Array.from(sentBuffer.subarray(4, 10))).toEqual(expected);
  });

  it("should send a UDP packet to setEngineFunctions OFF for engine 1234, F1", async () => {
    await client.engines.setEngineFunctions(1234, 1, "off");
    expect(mockSocket.send).toHaveBeenCalledTimes(1);
    const sentBuffer: Buffer = mockSocket.send.mock.calls[0][0];
    // functionByte: 0x00 | (1 << 0) = 0x01
    // Expected payload: [0xE4, 0xF8, 0x04, 0xD2, 0x01]
    expect(Array.from(sentBuffer.subarray(4, 9))).toEqual([0xE4, 0xF8, 0x04, 0xD2, 0x01]);
  });

  it("should send a UDP packet to setEngineFunctions TOGGLE for engine 1234, F2", async () => {
    await client.engines.setEngineFunctions(1234, 2, "toggle");
    expect(mockSocket.send).toHaveBeenCalledTimes(1);
    const sentBuffer: Buffer = mockSocket.send.mock.calls[0][0];
    // functionByte: 0x80 | (1 << 1) = 0x82
    // Expected payload: [0xE4, 0xF8, 0x04, 0xD2, 0x82]
    expect(Array.from(sentBuffer.subarray(4, 9))).toEqual([0xE4, 0xF8, 0x04, 0xD2, 0x82]);
  });

  it("should throw an error if setEngineFunctions is called with an unknown state", async () => {
    await expect(client.engines.setEngineFunctions(3, 1, "invalid-state")).rejects.toThrow(
      'state must be "on", "off" or "toggle"'
    );
  });

  it("should throw an error if setEngineFunctions is called with an invalid function number", async () => {
    await expect(client.engines.setEngineFunctions(3, 29, "on")).rejects.toThrow(
      "functionNumber must be between 0 and 28"
    );
    await expect(client.engines.setEngineFunctions(3, -1, "on")).rejects.toThrow(
      "functionNumber must be between 0 and 28"
    );
  });

});
