import { Z21UdpTransport } from "../transport/Z21UdpTransport";

export class AccessoryController {
  private transport: Z21UdpTransport;

  constructor(transport: Z21UdpTransport) {
    this.transport = transport;
  }

/**
   * Switch a basic accessory decoder (turnout, decoupler, light, ...) using LAN_X_SET_TURNOUT.
   * @param address Accessory address (1-2047)
   * @param output Output: false = output 1, true = output 2 (default: false)
   * @param activate true to activate, false to deactivate (default: true)
   * @param queue Set to true to queue the command (default: false)
   */
  public async setBasicAccessory(
    address: number,
    output: boolean = false,
    activate: boolean = true,
    queue: boolean = false
  ): Promise<void> {

    address = address - 1; // Convert to 0-based address

    // Address split
    const FAdr_MSB = (address >> 8) & 0xFF;
    const FAdr_LSB = address & 0xFF;

    // 10Q0A00P
    // Bit 7: 1 (always)
    // Bit 6: 0 (always)
    // Bit 5: Q (queue)
    // Bit 4: 0 (always)
    // Bit 3: A (activate, 1=activate, 0=deactivate)
    // Bits 2-1: 0 (always)
    // Bit 0: P (output)
    let db2 = 0x80; // Bit 7 set

    if (queue) db2 |= 0x20;      // Q = bit 5
    if (activate) db2 |= 0x08;   // A = bit 3
    if (output) db2 |= 0x01;     // P = bit 0 (true = output 2, false = output 1)

    // Build XpressNet frame: [0x53, FAdr_MSB, FAdr_LSB, db2]
    const xpressNetFrame = [0x53, FAdr_MSB, FAdr_LSB, db2];

    // XOR checksum for XpressNet frame
    let xor = 0;
    for (const byte of xpressNetFrame) xor ^= byte;
    xpressNetFrame.push(xor);

    // LAN_X header: [0x40, 0x00]
    const payload = [0x40, 0x00, ...xpressNetFrame];

    await this.transport.sendCommand(payload);
  }

  /**
   * @deprecated Use {@link setBasicAccessory} instead. Kept as an alias for backward compatibility.
   */
  public async switchTurnout(
    address: number,
    output: boolean = false,
    activate: boolean = true,
    queue: boolean = false
  ): Promise<void> {
    return this.setBasicAccessory(address, output, activate, queue);
  }

  /**
   * Send an aspect to an extended accessory decoder (e.g. a multi-aspect signal)
   * using LAN_X_SET_EXT_ACCESSORY, per RCN-213 / Z21 LAN Protocol v1.13 §5.4.
   * @param address Extended accessory address (1-2043, as displayed in user interfaces;
   *   the first extended accessory decoder is address 1, which corresponds to RawAddress 4
   *   on the wire per RCN-213 - this method does the conversion). RawAddress 2047 (address 2044)
   *   is deliberately excluded: RCN-213 reserves it for the "emergency stop for extended
   *   accessory decoders" broadcast, which affects every extended accessory decoder on the
   *   layout rather than the one at that address.
   * @param aspect Aspect value to send (0-255; the usable range depends on the decoder)
   */
  public async setExtAccessory(address: number, aspect: number): Promise<void> {
    if (!Number.isInteger(address) || address < 1 || address > 2043) {
      throw new Error("address must be an integer between 1 and 2043");
    }
    if (!Number.isInteger(aspect) || aspect < 0 || aspect > 255) {
      throw new Error("aspect must be an integer between 0 and 255");
    }

    const rawAddress = address + 3; // RawAddress 4 = user-facing address 1 (RCN-213)
    const adrMsb = (rawAddress >> 8) & 0xFF;
    const adrLsb = rawAddress & 0xFF;

    // Build XpressNet frame: [0x54, Adr_MSB, Adr_LSB, aspect, 0x00 (reserved)]
    const xpressNetFrame = [0x54, adrMsb, adrLsb, aspect, 0x00];

    // XOR checksum for XpressNet frame
    let xor = 0;
    for (const byte of xpressNetFrame) xor ^= byte;
    xpressNetFrame.push(xor);

    // LAN_X header: [0x40, 0x00]
    const payload = [0x40, 0x00, ...xpressNetFrame];

    await this.transport.sendCommand(payload);
  }
}