import { EventEmitter } from "events";
import { EngineController } from "./controllers/EngineController";
import { AccessoryController } from "./controllers/AccessoryController";
import { SystemController } from "./controllers/SystemController";
export declare class Z21Client extends EventEmitter {
    readonly engines: EngineController;
    readonly accessories: AccessoryController;
    readonly system: SystemController;
    private readonly transport;
    /**
     * Create a new Z21Client instance.
     * @param host The hostname or IP address of the Z21 device.
     * @param port The port number to connect to (default: 21105).
     * @param debug Enable debug mode (default: false).
     */
    constructor(host: string, port?: number, debug?: boolean);
    /**
     * Close the Z21Client connection.
     */
    close(): Promise<void>;
}
