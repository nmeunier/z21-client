// tests/Z21ClientProg.test.ts
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

describe("Z21Client - Indexed CV access", () => {
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

    mockParser = {
      parse: jest.fn(),
    };
    jest.spyOn(require("../src/parsers/feedbackParser"), "FeedbackParser").mockImplementation(() => mockParser);

    client = new Z21Client("192.168.0.100", 21105);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // Content doesn't matter: mockParser.parse is fully mocked below, so any buffer works
  // as the trigger for the UDP "message" handler.
  const dummyBuffer = Buffer.from([0x0a, 0x00, 0x40, 0x00, 0x64, 0x14, 0x00, 0x00, 0x00, 0x00]);
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  it("should resolve cvReadIndexed with the target CV value after writing CV31 and CV32", async () => {
    const messageHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === "message")[1];

    const promise = client.engines.cvReadIndexed(0, 255, 261);

    mockParser.parse.mockReturnValueOnce({ type: "cvResult", value: { cv: 31, value: 0 } });
    messageHandler(dummyBuffer);
    await flush();

    mockParser.parse.mockReturnValueOnce({ type: "cvResult", value: { cv: 32, value: 255 } });
    messageHandler(dummyBuffer);
    await flush();

    mockParser.parse.mockReturnValueOnce({ type: "cvResult", value: { cv: 261, value: 42 } });
    messageHandler(dummyBuffer);

    await expect(promise).resolves.toEqual({ cv: 261, value: 42 });
  });

  it("should reject cvReadIndexed immediately when the CV31 write NACKs, without writing CV32", async () => {
    client.on("error", () => { });
    const messageHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === "message")[1];

    const promise = client.engines.cvReadIndexed(0, 255, 261);

    mockParser.parse.mockReturnValueOnce({ type: "error", value: { code: "nack", message: "CV Read/Write NACK" } });
    messageHandler(dummyBuffer);

    await expect(promise).rejects.toEqual({ code: "nack", message: "CV Read/Write NACK" });
    // Only the CV31 write was ever sent — CV32 and the target CV read were never attempted
    expect(mockSocket.send).toHaveBeenCalledTimes(1);
  });

  it("should reject cvReadIndexed when indexHigh is out of range", async () => {
    await expect(client.engines.cvReadIndexed(256, 0, 261)).rejects.toThrow("indexHigh must be between 0 and 255");
  });

  it("should reject cvReadIndexed when indexLow is out of range", async () => {
    await expect(client.engines.cvReadIndexed(0, -1, 261)).rejects.toThrow("indexLow must be between 0 and 255");
  });

  it("should reject cvReadIndexed when cv is outside the 257-512 indexed window", async () => {
    await expect(client.engines.cvReadIndexed(0, 0, 256)).rejects.toThrow("cv must be between 257 and 512 for indexed CV access");
  });

  it("should resolve cvWriteIndexed with the target CV value after writing CV31 and CV32", async () => {
    const messageHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === "message")[1];

    const promise = client.engines.cvWriteIndexed(0, 255, 261, 42);

    mockParser.parse.mockReturnValueOnce({ type: "cvResult", value: { cv: 31, value: 0 } });
    messageHandler(dummyBuffer);
    await flush();

    mockParser.parse.mockReturnValueOnce({ type: "cvResult", value: { cv: 32, value: 255 } });
    messageHandler(dummyBuffer);
    await flush();

    mockParser.parse.mockReturnValueOnce({ type: "cvResult", value: { cv: 261, value: 42 } });
    messageHandler(dummyBuffer);

    await expect(promise).resolves.toEqual({ cv: 261, value: 42 });
  });

  it("should reject cvWriteIndexed when cv is outside the 257-512 indexed window", async () => {
    await expect(client.engines.cvWriteIndexed(0, 0, 513, 1)).rejects.toThrow("cv must be between 257 and 512 for indexed CV access");
  });
});
