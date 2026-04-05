import { EventEmitter } from "events";
import { FeedbackParser } from "../parsers/feedbackParser";
export declare class Z21UdpTransport extends EventEmitter {
    private socket;
    private host;
    private port;
    private debug;
    private feedbackParser;
    constructor(host: string, port: number | undefined, debug: boolean | undefined, feedbackParser: FeedbackParser);
    /**
     * Handle incoming UDP messages, parse and emit events.
     * @param msg Incoming UDP message buffer
     */
    private handleMessage;
    /**
     * Build a Z21 frame.
     * Frame format: [length (2 bytes LE)+[payload...]
     * Length includes entire frame length (header + payload).
     * @param payload Command bytes after header
     * @returns Buffer frame to send
     */
    private buildFrame;
    /**
     * Send a command frame asynchronously.
     * @param payload Command payload bytes
     */
    sendCommand(payload: number[]): Promise<void>;
    /**
     * Send UDP frame and return Promise.
     * @param frame Buffer to send
     */
    private sendFrame;
    close(): void;
}
