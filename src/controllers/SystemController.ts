import { Z21UdpTransport } from "../transport/Z21UdpTransport";
import { commands, BroadcastFlag } from "../Z21Commands";

export interface BroadcastFlagsOptions {
  driving?: boolean;
  rbus?: boolean;
  railcom?: boolean;
  systemState?: boolean;
  loconetDetector?: boolean;
  canDetector?: boolean;
}

export class SystemController {
  private transport: Z21UdpTransport;

  constructor(transport: Z21UdpTransport) {
    this.transport = transport;
  }


  /**
   * Set this client's Z21 broadcast flags (Z21 §2.16).
   *
   * Fields are applied on top of the historical default `0x07`
   * (`driving | rbus | railcom`): `true` adds a flag, `false` removes it, and
   * an omitted field leaves the default untouched. So
   * `setBroadcastFlags({ loconetDetector: true })` subscribes to
   * driving + R-BUS + RailCom **and** LocoNet detectors — not LocoNet alone.
   * `setBroadcastFlags()` with no argument re-sends the plain `0x07`.
   *
   * Flags that currently produce a typed event: `driving`, `rbus`,
   * `loconetDetector`, `canDetector`. `systemState` and `railcom` enable the
   * broadcast on the wire, but the library does not decode those frames yet —
   * read them from the raw `debug` event.
   */
  public async setBroadcastFlags(options: BroadcastFlagsOptions = {}): Promise<void> {
    let value = BroadcastFlag.DRIVING | BroadcastFlag.RBUS | BroadcastFlag.RAILCOM; // 0x07

    const apply = (bit: number, on: boolean | undefined) => {
      if (on === true) value |= bit;
      else if (on === false) value &= ~bit;
    };
    apply(BroadcastFlag.DRIVING, options.driving);
    apply(BroadcastFlag.RBUS, options.rbus);
    apply(BroadcastFlag.RAILCOM, options.railcom);
    apply(BroadcastFlag.SYSTEM_STATE, options.systemState);
    apply(BroadcastFlag.LOCONET_DETECTOR, options.loconetDetector);
    apply(BroadcastFlag.CAN_DETECTOR, options.canDetector);
    value >>>= 0;

    // Flags on 4 bytes (Little Endian)
    const payload = [
      ...commands.LAN_SET_BROADCAST_FLAGS,
      value & 0xff,
      (value >>> 8) & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 24) & 0xff,
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

  /** Poll an R-BUS feedback module group (0 = modules 1-10, 1 = modules 11-20). Z21 §7.2. */
  public async getRmbusData(groupIndex: 0 | 1): Promise<void> {
    if (groupIndex !== 0 && groupIndex !== 1) {
      throw new RangeError("getRmbusData: groupIndex must be 0 or 1");
    }
    await this.transport.sendCommand([...commands.LAN_RMBUS_GETDATA, groupIndex]);
  }

  /**
   * Poll LocoNet track occupancy detectors (Z21 §9.5). EXPERIMENTAL — not tested on real hardware.
   * @param type 0x80 = SIC (all Digitrax/Blucher), 0x81 = Uhlenbrock report address, 0x82 = LISSY
   * @param reportAddress used for 0x81/0x82 only; for 0x81 it is sent decremented by 1
   * @experimental
   */
  public async getLoconetDetector(type: 0x80 | 0x81 | 0x82, reportAddress = 0): Promise<void> {
    if (type !== 0x80 && type !== 0x81 && type !== 0x82) {
      throw new RangeError("getLoconetDetector: type must be 0x80, 0x81 or 0x82");
    }
    let addr = 0;
    if (type === 0x81) {
      if (!Number.isInteger(reportAddress) || reportAddress < 1 || reportAddress > 0x10000) {
        throw new RangeError("getLoconetDetector: reportAddress must be 1..65536 for type 0x81");
      }
      addr = reportAddress - 1;
    } else if (type === 0x82) {
      if (!Number.isInteger(reportAddress) || reportAddress < 0 || reportAddress > 0xffff) {
        throw new RangeError("getLoconetDetector: reportAddress must be 0..65535 for type 0x82");
      }
      addr = reportAddress;
    }
    await this.transport.sendCommand([
      ...commands.LAN_LOCONET_DETECTOR,
      type,
      addr & 0xff,
      (addr >>> 8) & 0xff,
    ]);
  }

  /**
   * Poll CAN track occupancy detectors (Z21 §10.1). EXPERIMENTAL — not tested on real hardware.
   * @param nid CAN network id; 0xD000 (default) polls all CAN detectors
   * @experimental
   */
  public async getCanDetector(nid = 0xd000): Promise<void> {
    if (!Number.isInteger(nid) || nid < 0 || nid > 0xffff) {
      throw new RangeError("getCanDetector: nid must be a uint16");
    }
    await this.transport.sendCommand([
      ...commands.LAN_CAN_DETECTOR,
      0x00, // Type 0x00 = request the CAN detector(s) with the given NId
      nid & 0xff,
      (nid >>> 8) & 0xff,
    ]);
  }
}
