"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackParser = void 0;
const lanXParser_1 = require("./lanXParser");
const lanParser_1 = require("./lanParser");
class FeedbackParser {
    constructor() {
        this.lanParser = new lanParser_1.LanParser();
        this.lanXParser = new lanXParser_1.LanXParser();
    }
    parse(payload) {
        if (!Buffer.isBuffer(payload) || payload.length < 2) {
            return {
                type: "error",
                value: {
                    code: "invalid-payload",
                    message: "Invalid payload length"
                }
            };
        }
        // Expected length is indicated in the first two bytes
        const expectedLength = payload.readUInt16LE(0);
        if (payload.length < expectedLength) {
            return {
                type: "error",
                value: {
                    code: "invalid-payload",
                    message: "Payload shorter than expected length"
                }
            };
        }
        // Buffer without the first 2 bytes (length)
        const data = Buffer.from(payload.subarray(2));
        if (data[0] === 0x40) {
            // LAN_X command: remove first 2 bytes of LAN_X header
            return this.lanXParser.parse(Buffer.from(data.subarray(2)));
        }
        else if (data[0] === 0x10 || data[0] === 0x51 || data[0] === 0x80) {
            // LAN command
            return this.lanParser.parse(data[0], data.subarray(2));
        }
        return null;
    }
}
exports.FeedbackParser = FeedbackParser;
