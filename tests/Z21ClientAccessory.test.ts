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

  it("should send a UDP packet for switchTurnout output 1 activate", async () => {
    await client.accessories.switchTurnout(10, false, true, false);
    expect(mockSocket.send).toHaveBeenCalledTimes(1);
    const sentBuffer: Buffer = mockSocket.send.mock.calls[0][0];
    expect(sentBuffer[2]).toBe(0x40);

    const expected = [0x53, 0x00, 0x09, 0x88, 0xd2];
    const actual = Array.from(sentBuffer.subarray(4, 9));
    expect(actual).toEqual(expected);
  });

  it("should send a UDP packet for switchTurnout output 2 deactivate", async () => {
    await client.accessories.switchTurnout(10, true, false, false);
    expect(mockSocket.send).toHaveBeenCalledTimes(1);
    const sentBuffer: Buffer = mockSocket.send.mock.calls[0][0];
    expect(sentBuffer[2]).toBe(0x40);
    expect(sentBuffer.includes(0x53)).toBe(true); // XpressNet header
  });

});
