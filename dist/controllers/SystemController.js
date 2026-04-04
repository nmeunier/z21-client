"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemController = void 0;
const Z21Commands_1 = require("../Z21Commands");
class SystemController {
    constructor(transport) {
        this.transport = transport;
    }
    /** Enable engine, accessory and feedback broadcast info */
    async setBroadcastFlags(engine = true, accessory = true, feedback = true) {
        let flags = 0;
        if (engine)
            flags |= 0x01;
        if (accessory)
            flags |= 0x02;
        if (feedback)
            flags |= 0x04;
        // Flags on 4 bytes (Little Endian)
        const payload = [
            ...Z21Commands_1.commands.LAN_SET_BROADCAST_FLAGS,
            flags, 0x00, 0x00, 0x00
        ];
        await this.transport.sendCommand(payload);
    }
    /** Request Z21 serial number */
    async getSerialNumber() {
        await this.transport.sendCommand(Z21Commands_1.commands.LAN_GET_SERIAL_NUMBER);
    }
    /** Request current broadcast flags */
    async getBroadcastFlags() {
        await this.transport.sendCommand(Z21Commands_1.commands.LAN_GET_BROADCAST_FLAGS);
    }
    /** Request Z21 status */
    async getStatus() {
        await this.transport.sendCommand(Z21Commands_1.commands.LAN_X_GET_STATUS);
    }
    /** Turn track power on */
    async setTrackPowerOn() {
        await this.transport.sendCommand(Z21Commands_1.commands.LAN_X_TRACK_POWER_ON);
    }
    /** Turn track power off */
    async setTrackPowerOff() {
        await this.transport.sendCommand(Z21Commands_1.commands.LAN_X_TRACK_POWER_OFF);
    }
    /** Emergency stop all engines */
    async emergencyStop() {
        await this.transport.sendCommand(Z21Commands_1.commands.LAN_X_SET_STOP);
    }
    /** Logout from Z21 */
    async logout() {
        await this.transport.sendCommand(Z21Commands_1.commands.LAN_LOGOFF);
        this.delay(500); // Wait for logoff to complete
    }
    async delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.SystemController = SystemController;
