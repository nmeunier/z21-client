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

  // cvRead/cvWrite are serialized through a queue (see EngineController.enqueueCv), which adds
  // one microtask hop before a call's listeners are actually registered. Tests must let that
  // hop run (via flush()) before triggering the mocked UDP response, or the response arrives
  // with no listener attached yet and is silently dropped.
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  // Content doesn't matter for tests using it below: mockParser.parse is fully mocked per-call,
  // so any buffer works as the trigger for the UDP "message" handler.
  const dummyBuffer = Buffer.from([0x0a, 0x00, 0x40, 0x00, 0x64, 0x14, 0x00, 0x00, 0x00, 0x00]);

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
    await flush();

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
    await flush();

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
    await flush();
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
    await flush();
    messageHandler(Buffer.from([0x0a, 0x00, 0x40, 0x00, 0x61, 0x14, 0x00, 0x10, 0x00, 0x00]));
    await expect(promise).rejects.toEqual({ code: "nack", message: "CV Read/Write NACK" });
  });

  it("should serialize concurrent cvRead calls so only one is in flight at a time", async () => {
    const messageHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === "message")[1];

    const p1 = client.engines.cvRead(1);
    const p2 = client.engines.cvRead(2);
    await flush();

    // Only the first call's frame has been sent - the second hasn't started yet
    expect(mockSocket.send).toHaveBeenCalledTimes(1);

    mockParser.parse.mockReturnValueOnce({ type: "cvResult", value: { cv: 1, value: 10 } });
    messageHandler(dummyBuffer);
    await expect(p1).resolves.toEqual({ cv: 1, value: 10 });
    await flush();

    // Only now, after the first call settled, does the second call's frame go out
    expect(mockSocket.send).toHaveBeenCalledTimes(2);

    mockParser.parse.mockReturnValueOnce({ type: "cvResult", value: { cv: 2, value: 20 } });
    messageHandler(dummyBuffer);
    await expect(p2).resolves.toEqual({ cv: 2, value: 20 });
  });

  it("should resolve cvReadIndexed with the target CV value after writing CV31 and CV32", async () => {
    const messageHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === "message")[1];

    const promise = client.engines.cvReadIndexed(0, 255, 261);
    await flush();

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
    await flush();

    mockParser.parse.mockReturnValueOnce({ type: "error", value: { code: "nack", message: "CV Read/Write NACK" } });
    messageHandler(dummyBuffer);

    await expect(promise).rejects.toEqual({ code: "nack", message: "CV Read/Write NACK" });
    // Only the CV31 write was ever sent — CV32 and the target CV read were never attempted
    expect(mockSocket.send).toHaveBeenCalledTimes(1);
  });

  it("should serialize whole cvReadIndexed sequences so a second call cannot interleave with the first", async () => {
    const messageHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === "message")[1];

    const p1 = client.engines.cvReadIndexed(0, 255, 261);
    const p2 = client.engines.cvReadIndexed(5, 10, 300);
    await flush();

    // p1's CV31 write is the only frame sent so far — p2 hasn't started at all
    expect(mockSocket.send).toHaveBeenCalledTimes(1);

    mockParser.parse.mockReturnValueOnce({ type: "cvResult", value: { cv: 31, value: 0 } });
    messageHandler(dummyBuffer);
    await flush();
    expect(mockSocket.send).toHaveBeenCalledTimes(2); // p1's CV32 write — still not p2

    mockParser.parse.mockReturnValueOnce({ type: "cvResult", value: { cv: 32, value: 255 } });
    messageHandler(dummyBuffer);
    await flush();
    expect(mockSocket.send).toHaveBeenCalledTimes(3); // p1's target read — still not p2

    mockParser.parse.mockReturnValueOnce({ type: "cvResult", value: { cv: 261, value: 42 } });
    messageHandler(dummyBuffer);
    await expect(p1).resolves.toEqual({ cv: 261, value: 42 });
    await flush();

    // Only now, after p1's entire sequence settled, does p2's CV31 write go out
    expect(mockSocket.send).toHaveBeenCalledTimes(4);

    mockParser.parse.mockReturnValueOnce({ type: "cvResult", value: { cv: 31, value: 5 } });
    messageHandler(dummyBuffer);
    await flush();
    mockParser.parse.mockReturnValueOnce({ type: "cvResult", value: { cv: 32, value: 10 } });
    messageHandler(dummyBuffer);
    await flush();
    mockParser.parse.mockReturnValueOnce({ type: "cvResult", value: { cv: 300, value: 99 } });
    messageHandler(dummyBuffer);

    await expect(p2).resolves.toEqual({ cv: 300, value: 99 });
  });

  it("should reject cvReadIndexed when indexHigh is out of range", async () => {
    await expect(client.engines.cvReadIndexed(256, 0, 261)).rejects.toThrow("indexHigh must be an integer between 0 and 255");
  });

  it("should reject cvReadIndexed when indexLow is out of range", async () => {
    await expect(client.engines.cvReadIndexed(0, -1, 261)).rejects.toThrow("indexLow must be an integer between 0 and 255");
  });

  it("should reject cvReadIndexed when cv is outside the 257-512 indexed window", async () => {
    await expect(client.engines.cvReadIndexed(0, 0, 256)).rejects.toThrow("cv must be an integer between 257 and 512 for indexed CV access");
  });

  it("should reject cvReadIndexed when indexHigh is NaN", async () => {
    await expect(client.engines.cvReadIndexed(NaN, 0, 261)).rejects.toThrow("indexHigh must be an integer between 0 and 255");
  });

  it("should reject cvReadIndexed when cv is not an integer", async () => {
    await expect(client.engines.cvReadIndexed(0, 0, 257.5)).rejects.toThrow("cv must be an integer between 257 and 512 for indexed CV access");
  });

  it("should resolve cvWriteIndexed with the target CV value after writing CV31 and CV32", async () => {
    const messageHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === "message")[1];

    const promise = client.engines.cvWriteIndexed(0, 255, 261, 42);
    await flush();

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
    await expect(client.engines.cvWriteIndexed(0, 0, 513, 1)).rejects.toThrow("cv must be an integer between 257 and 512 for indexed CV access");
  });

  it("should reject cvWriteIndexed when value is out of range", async () => {
    await expect(client.engines.cvWriteIndexed(0, 255, 261, 300)).rejects.toThrow("value must be an integer between 0 and 255");
  });
});
