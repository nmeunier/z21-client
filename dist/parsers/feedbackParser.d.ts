import { ParserResult } from "./parserResult";
export declare class FeedbackParser {
    private lanParser;
    private lanXParser;
    constructor();
    parse(payload: Buffer): ParserResult | null;
}
