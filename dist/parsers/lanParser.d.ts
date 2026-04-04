import { ParserResult } from "./parserResult";
export declare class LanParser {
    /**
     * Parse Z21 LAN commands (0x40 command class).
     * These are non-LAN_X commands like serial number, hardware info, etc.
     * @param opcode - LAN command opcode
     * @param payload - Data after the opcode
     * @returns Parsed object or undefined if payload is invalid/unknown opcode
     */
    parse(opcode: number, payload: Buffer): ParserResult | null;
}
