// tests/Z21Client.test.ts
import { Z21Client } from "../src/Z21Client";
import dgram from "dgram";

jest.mock("dgram");

describe("Z21Client", () => {
  let client: Z21Client;
  let mockSocket: any;
  let mockParser: any;

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

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("should create a UDP socket with dgram", () => {
    expect(dgram.createSocket).toHaveBeenCalledWith("udp4");
    expect(client).toBeInstanceOf(Z21Client);
  });

  it("should emit error on UDP error", () => {
    const errorHandler = jest.fn();
    client.on("error", errorHandler);
    const error = new Error("UDP error");
    const errorCall = mockSocket.on.mock.calls.find((call: any[]) => call[0] === "error");
    if (errorCall) {
      errorCall[1](error);
    }
    expect(errorHandler).toHaveBeenCalledWith(error);
  });

  it("should emit serialNumber event when receiving serial number", () => {
    const serialHandler = jest.fn();
    client.on("serialNumber", serialHandler);

    // Simulate parser return
    mockParser.parse.mockReturnValue({ type: "serialNumber", value: 12345 });

    // Simulate receiving a UDP message
    const messageHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === "message")[1];
    messageHandler(Buffer.from([0x01, 0x02]));

    expect(serialHandler).toHaveBeenCalledWith(12345);
  });

  it("should close the UDP socket", async () => {
    await client.close();
    expect(mockSocket.close).toHaveBeenCalled();
  });


  it("should log debug messages when debug mode is enabled", () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => { });
    // Create a client in debug mode
    const debugClient = new Z21Client("192.168.0.100", 21105, true);

    // Simulate sending a command
    debugClient.engines.setDriveEngine(3, 10, true);

    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("should send a UDP packet for getSerialNumber", async () => {
    await client.system.getSerialNumber();
    expect(mockSocket.send).toHaveBeenCalledTimes(1);
    const sentBuffer: Buffer = mockSocket.send.mock.calls[0][0];
    // Check that the buffer contains the expected command
    expect(Array.from(sentBuffer.subarray(2, 4))).toEqual([0x10, 0x00]);
  });

  it("should send a UDP packet for getBroadcastFlags", async () => {
    await client.system.getBroadcastFlags();
    expect(mockSocket.send).toHaveBeenCalledTimes(1);
    const sentBuffer: Buffer = mockSocket.send.mock.calls[0][0];
    expect(Array.from(sentBuffer.subarray(2, 4))).toEqual([0x51, 0x00]);
  });

  it("should send a UDP packet for getStatus", async () => {
    await client.system.getStatus();
    expect(mockSocket.send).toHaveBeenCalledTimes(1);
    const sentBuffer: Buffer = mockSocket.send.mock.calls[0][0];
    expect(Array.from(sentBuffer.subarray(2, 7))).toEqual([0x40, 0x00, 0x21, 0x24, 0x05]);
  });

  it("should send a UDP packet for setTrackPowerOn", async () => {
    await client.system.setTrackPowerOn();
    expect(mockSocket.send).toHaveBeenCalledTimes(1);
    const sentBuffer: Buffer = mockSocket.send.mock.calls[0][0];
    expect(Array.from(sentBuffer.subarray(2, 7))).toEqual([0x40, 0x00, 0x21, 0x81, 0xa0]);
  });

  it("should send a UDP packet for setTrackPowerOff", async () => {
    await client.system.setTrackPowerOff();
    expect(mockSocket.send).toHaveBeenCalledTimes(1);
    const sentBuffer: Buffer = mockSocket.send.mock.calls[0][0];
    expect(Array.from(sentBuffer.subarray(2, 7))).toEqual([0x40, 0x00, 0x21, 0x80, 0xa1]);
  });

  it("should send a UDP packet for emergencyStop", async () => {
    await client.system.emergencyStop();
    expect(mockSocket.send).toHaveBeenCalledTimes(1);
    const sentBuffer: Buffer = mockSocket.send.mock.calls[0][0];
    expect(Array.from(sentBuffer.subarray(2, 4))).toEqual([0x80, 0x80]);
  });

  it("should send a UDP packet for setBroadcastFlags", async () => {
    await client.system.setBroadcastFlags(true, true, true);
    expect(mockSocket.send).toHaveBeenCalledTimes(1);
    const sentBuffer: Buffer = mockSocket.send.mock.calls[0][0];
    // [0x50, 0x00, 0x07, 0x00, 0x00, 0x00] for all flags set to true
    expect(Array.from(sentBuffer.subarray(2, 8))).toEqual([0x50, 0x00, 0x07, 0x00, 0x00, 0x00]);
  });

});
