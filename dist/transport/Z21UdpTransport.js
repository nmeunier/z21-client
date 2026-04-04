"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Z21UdpTransport = void 0;
const dgram_1 = __importDefault(require("dgram"));
const events_1 = require("events");
class Z21UdpTransport extends events_1.EventEmitter {
    constructor(host, port = 21105, debug = false, feedbackParser) {
        super();
        this.host = host;
        this.port = port;
        this.debug = debug;
        this.socket = dgram_1.default.createSocket("udp4");
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
            console.log("[Z21UdpTransport] Init");
        }
    }
    /**
     * Handle incoming UDP messages, parse and emit events.
     * @param msg Incoming UDP message buffer
     */
    handleMessage(msg) {
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
    buildFrame(payload) {
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
    async sendCommand(payload) {
        const frame = this.buildFrame(payload);
        await this.sendFrame(frame);
    }
    /**
     * Send UDP frame and return Promise.
     * @param frame Buffer to send
     */
    sendFrame(frame) {
        return new Promise((resolve, reject) => {
            this.socket.send(frame, this.port, this.host, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    close() {
        this.socket.close();
    }
}
exports.Z21UdpTransport = Z21UdpTransport;
