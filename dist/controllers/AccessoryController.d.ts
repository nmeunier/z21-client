import { Z21UdpTransport } from "../transport/Z21UdpTransport";
export declare class AccessoryController {
    private transport;
    constructor(transport: Z21UdpTransport);
    /**
       * Switch a turnout (accessory) using LAN_X_SET_TURNOUT.
       * @param address Turnout address (1-2047)
       * @param output Output: false = output 1, true = output 2 (default: false)
       * @param activate true to activate, false to deactivate (default: true)
       * @param queue Set to true to queue the command (default: false)
       */
    switchTurnout(address: number, output?: boolean, activate?: boolean, queue?: boolean): Promise<void>;
}
