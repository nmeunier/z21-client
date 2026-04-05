import { ParserResult } from "./parserResult";
/**
 * Parser for LAN_X commands (0x40 command class).
 * Handles status changes, broadcasts, turnout info, and engine info.
 */
export declare class LanXParser {
    parse(payload: Buffer): ParserResult | null;
    private parseTurnoutInfo;
    private parseEngineInfo;
    private parseCV;
}
