import { Z21UdpTransport } from "../transport/Z21UdpTransport";
import { commands } from "../Z21Commands";

export class SystemController {
  private transport: Z21UdpTransport;

  constructor(transport: Z21UdpTransport) {
    this.transport = transport;
  }


  /** Enable engine, accessory and feedback broadcast info */
  public async setBroadcastFlags(
    engine: boolean = true,
    accessory: boolean = true,
    feedback: boolean = true
  ): Promise<void> {
    let flags = 0;
    if (engine) flags |= 0x01;
    if (accessory) flags |= 0x02;
    if (feedback) flags |= 0x04;

    // Flags on 4 bytes (Little Endian)
    const payload = [
      ...commands.LAN_SET_BROADCAST_FLAGS,
      flags, 0x00, 0x00, 0x00
    ];

    await this.transport.sendCommand(payload);
  }


  /** Request Z21 serial number */
  public async getSerialNumber(): Promise<void> {
    await this.transport.sendCommand(commands.LAN_GET_SERIAL_NUMBER);
  }

  /** Request current broadcast flags */
  public async getBroadcastFlags(): Promise<void> {
    await this.transport.sendCommand(commands.LAN_GET_BROADCAST_FLAGS);
  }

  /** Request Z21 status */
  public async getStatus(): Promise<void> {
    await this.transport.sendCommand(commands.LAN_X_GET_STATUS);
  }

  /** Turn track power on */
  public async setTrackPowerOn(): Promise<void> {
    await this.transport.sendCommand(commands.LAN_X_TRACK_POWER_ON);
  }

  /** Turn track power off */
  public async setTrackPowerOff(): Promise<void> {
    await this.transport.sendCommand(commands.LAN_X_TRACK_POWER_OFF);
  }

  /** Emergency stop all engines */
  public async emergencyStop(): Promise<void> {
    await this.transport.sendCommand(commands.LAN_X_SET_STOP);
  }


  /** Logout from Z21 */
  public async logout(): Promise<void> {
    await this.transport.sendCommand(commands.LAN_LOGOFF);
    this.delay(500); // Wait for logoff to complete
  }

  public async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}