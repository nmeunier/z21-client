import dgram from "dgram";
import { EventEmitter } from "events";
import { FeedbackParser } from "../parsers/feedbackParser";


export class Z21UdpTransport extends EventEmitter {
  private socket: dgram.Socket;
  private host: string;
  private port: number;
  private debug: boolean;
  private feedbackParser: FeedbackParser;

  constructor(host: string, port: number = 21105, debug: boolean = false, feedbackParser: FeedbackParser) {
    super();
    this.host = host;
    this.port = port;
    this.debug = debug;
    this.socket = dgram.createSocket("udp4");
    this.feedbackParser = feedbackParser;

    // Listen to incoming UDP messages
    this.socket.on("message", (msg) => this.handleMessage(msg));

    // Handle UDP errors
    this.socket.on("error", (err) => {
      console.log(`[Z21UdpTransport] UDP socket error: ${err.message}`);
      this.emit("error", err);
      this.close();
    });

    if (this.debug) {
      console.log(`[Z21UdpTransport] Init`);
    }
  }

  /**
   * Handle incoming UDP messages, parse and emit events.
   * @param msg Incoming UDP message buffer
   */
  private handleMessage(msg: Buffer) {

    if (this.debug) {
      this.emit("debug", msg);
    }

    const parsed = this.feedbackParser.parse(msg);
    if (parsed) {
      this.emit(parsed.type, parsed.value);
    }

  }

  /**
   * Build a Z21 frame.
   * Frame format: [length (2 bytes LE)+[payload...]
   * Length includes entire frame length (header + payload).
   * @param payload Command bytes after header
   * @returns Buffer frame to send
   */
  private buildFrame(payload: number[]): Buffer {
    const length = payload.length + 2; // 2 bytes length
    const buffer = Buffer.alloc(length);

    buffer.writeUInt16LE(length, 0);
    for (let i = 0; i < payload.length; i++) {
      buffer[2 + i] = payload[i];
    }

    return buffer;
  }

  /**
   * Send a command frame asynchronously.
   * @param payload Command payload bytes
   */
  public async sendCommand(payload: number[]): Promise<void> {
    const frame = this.buildFrame(payload);
    await this.sendFrame(frame);
  }

  /**
   * Send UDP frame and return Promise.
   * @param frame Buffer to send
   */
  private sendFrame(frame: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.send(frame, this.port, this.host, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  public close(): void {
    this.socket.close();
  }
}