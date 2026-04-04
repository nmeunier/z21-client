import { CvResultData, ErrorResultData } from "../parsers/parserResult";
import { Z21UdpTransport } from "../transport/Z21UdpTransport";
export declare class EngineController {
    private transport;
    constructor(transport: Z21UdpTransport);
    /**
     * Request information about an engine and subscribe to updates for this address.
     * @param address Engine address (1-10239)
     */
    getEngineInfo(address: number): Promise<void>;
    /**
     * Drive an engine with speed and direction.
     * @param address Engine address (1-10239)
     * @param speed Speed value (0-127)
     * @param forward Direction (true=forward, false=backward)
     */
    setDriveEngine(address: number, speed: number, forward: boolean, engineSpeedSteps?: number): void;
    /**
     * Set a function state on an engine.
     * @param address Engine address (1-10239)
     * @param functionNumber Function number (1-28)
     * @param state Function state (on, off, toggle)
     */
    setEngineFunctions(address: number, functionNumber: number, state: string): Promise<void>;
    /**
     * Read a CV in direct mode.
     * @param cv CV number (1-1024)
     */
    cvRead(cv: number): Promise<ErrorResultData | CvResultData>;
    /**
     * Write a CV in direct mode.
     * @param cv CV number (1-1024)
     * @param value Value to write (0-255)
     */
    cvWrite(cv: number, value: number): Promise<ErrorResultData | CvResultData>;
}
