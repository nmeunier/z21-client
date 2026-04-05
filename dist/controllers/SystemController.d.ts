import { Z21UdpTransport } from "../transport/Z21UdpTransport";
export declare class SystemController {
    private transport;
    constructor(transport: Z21UdpTransport);
    /** Enable engine, accessory and feedback broadcast info */
    setBroadcastFlags(engine?: boolean, accessory?: boolean, feedback?: boolean): Promise<void>;
    /** Request Z21 serial number */
    getSerialNumber(): Promise<void>;
    /** Request current broadcast flags */
    getBroadcastFlags(): Promise<void>;
    /** Request Z21 status */
    getStatus(): Promise<void>;
    /** Turn track power on */
    setTrackPowerOn(): Promise<void>;
    /** Turn track power off */
    setTrackPowerOff(): Promise<void>;
    /** Emergency stop all engines */
    emergencyStop(): Promise<void>;
    /** Logout from Z21 */
    logout(): Promise<void>;
    delay(ms: number): Promise<unknown>;
}
