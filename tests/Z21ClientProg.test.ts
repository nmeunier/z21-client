// tests/Z21ClientProg.test.ts
import { Z21Client } from "../src/Z21Client";
import dgram from "dgram";
import { FeedbackParser } from "../src/parsers/feedbackParser";

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

  it("should resolve cvRead with the value from the UDP response", async () => {
    // Prepare the expected response buffer (LAN_X_CV_RESULT)
    const responseBuffer = Buffer.from([0x0a, 0x00, 0x40, 0x00, 0x64, 0x14, 0x00, 0x10, 0xc0, 0xa0]);
    // Mock the parser to return a cvResult matching the response
    mockParser.parse.mockReturnValue({
      type: "cvResult",
      value: { cv: 17, value: 192 }
    });

    // Get the UDP message handler
    const messageHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === "message")[1];

    // Start the CV read (promise)
    const promise = client.engines.cvRead(17);

    // Simulate receiving the UDP response
    messageHandler(responseBuffer);

    // Check that the promise resolves with the correct value
    await expect(promise).resolves.toEqual({ cv: 17, value: 192 });
  });

  it("should resolve cvWrite with the value from the UDP response", async () => {
    // Prepare the expected response buffer (LAN_X_CV_RESULT)
    const responseBuffer = Buffer.from([0x0a, 0x00, 0x40, 0x00, 0x64, 0x14, 0x00, 0x10, 0x7f, 0x6b]);
    // Mock the parser to return a cvResult matching the response
    mockParser.parse.mockReturnValue({
      type: "cvResult",
      value: { cv: 17, value: 127 }
    });

    // Get the UDP message handler
    const messageHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === "message")[1];

    // Start the CV write (promise)
    const promise = client.engines.cvWrite(17, 127);

    // Simulate receiving the UDP response
    messageHandler(responseBuffer);

    // Check that the promise resolves with the correct value
    await expect(promise).resolves.toEqual({ cv: 17, value: 127 });
  });

  it("should reject cvRead with an error when receiving nack", async () => {
    // Add a dummy error handler to prevent unhandled error
    client.on("error", () => { });

    mockParser.parse.mockReturnValue({
      type: "error",
      value: { code: "nack", message: "CV Read/Write NACK" }
    });

    const messageHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === "message")[1];
    const promise = client.engines.cvRead(17);
    messageHandler(Buffer.from([0x0a, 0x00, 0x40, 0x00, 0x61, 0x14, 0x00, 0x10, 0x00, 0x00]));
    await expect(promise).rejects.toEqual({ code: "nack", message: "CV Read/Write NACK" });
  });

  it("should reject cvWrite with an error when receiving nack", async () => {
    // Add a dummy error handler to prevent unhandled error
    client.on("error", () => { });

    mockParser.parse.mockReturnValue({
      type: "error",
      value: { code: "nack", message: "CV Read/Write NACK" }
    });

    const messageHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === "message")[1];
    const promise = client.engines.cvWrite(17, 127);
    messageHandler(Buffer.from([0x0a, 0x00, 0x40, 0x00, 0x61, 0x14, 0x00, 0x10, 0x00, 0x00]));
    await expect(promise).rejects.toEqual({ code: "nack", message: "CV Read/Write NACK" });
  });
});
