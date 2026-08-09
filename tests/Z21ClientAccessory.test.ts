// tests/Z21ClientAccessory.test.ts
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

  it("should send a UDP packet for setBasicAccessory output 1 activate", async () => {
    await client.accessories.setBasicAccessory(10, false, true, false);
    expect(mockSocket.send).toHaveBeenCalledTimes(1);
    const sentBuffer: Buffer = mockSocket.send.mock.calls[0][0];
    expect(sentBuffer[2]).toBe(0x40);

    const expected = [0x53, 0x00, 0x09, 0x88, 0xd2];
    const actual = Array.from(sentBuffer.subarray(4, 9));
    expect(actual).toEqual(expected);
  });

  it("should send a UDP packet for setBasicAccessory output 2 deactivate", async () => {
    await client.accessories.setBasicAccessory(10, true, false, false);
    expect(mockSocket.send).toHaveBeenCalledTimes(1);
    const sentBuffer: Buffer = mockSocket.send.mock.calls[0][0];
    expect(sentBuffer[2]).toBe(0x40);
    expect(sentBuffer.includes(0x53)).toBe(true); // XpressNet header
  });

  it("should keep switchTurnout as a backward-compatible alias for setBasicAccessory", async () => {
    await client.accessories.switchTurnout(10, false, true, false);
    expect(mockSocket.send).toHaveBeenCalledTimes(1);
    const sentBuffer: Buffer = mockSocket.send.mock.calls[0][0];

    // Same frame as the equivalent setBasicAccessory call above.
    const expected = [0x53, 0x00, 0x09, 0x88, 0xd2];
    const actual = Array.from(sentBuffer.subarray(4, 9));
    expect(actual).toEqual(expected);
  });

  it("should send a UDP packet for setExtAccessory", async () => {
    // Spec example (Z21 LAN Protocol v1.13, §5.4): address 1 (RawAddress 4), aspect 5
    // -> 0x0A 0x00 0x40 0x00 0x54 0x00 0x04 0x05 0x00 0x55
    await client.accessories.setExtAccessory(1, 5);
    expect(mockSocket.send).toHaveBeenCalledTimes(1);
    const sentBuffer: Buffer = mockSocket.send.mock.calls[0][0];

    const expected = [0x40, 0x00, 0x54, 0x00, 0x04, 0x05, 0x00, 0x55];
    const actual = Array.from(sentBuffer.subarray(2, 10));
    expect(actual).toEqual(expected);
  });

  it("should reject setExtAccessory address 2044 (RawAddress 2047 is reserved for the extended-accessory emergency stop broadcast)", async () => {
    await expect(client.accessories.setExtAccessory(2044, 5)).rejects.toThrow(
      "address must be an integer between 1 and 2043"
    );
    expect(mockSocket.send).not.toHaveBeenCalled();
  });

  it("should emit extAccessoryInfo event when receiving LAN_X_EXT_ACCESSORY_INFO broadcast", () => {
    const extAccessoryHandler = jest.fn();
    client.on("extAccessoryInfo", extAccessoryHandler);

    mockParser.parse.mockReturnValue({
      type: "extAccessoryInfo",
      value: { address: 1, aspect: 5, valid: true }
    });

    const messageHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === "message")[1];
    messageHandler(Buffer.from([0x0A, 0x00, 0x40, 0x00, 0x44, 0x00, 0x04, 0x05, 0x00, 0x45]));

    expect(extAccessoryHandler).toHaveBeenCalledWith({ address: 1, aspect: 5, valid: true });
  });

});
