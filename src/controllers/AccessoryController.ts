import { Z21UdpTransport } from "../transport/Z21UdpTransport";

export class AccessoryController {
  private transport: Z21UdpTransport;

  constructor(transport: Z21UdpTransport) {
    this.transport = transport;
  }

/**
   * Switch a turnout (accessory) using LAN_X_SET_TURNOUT.
   * @param address Turnout address (1-2047)
   * @param output Output: false = output 1, true = output 2 (default: false)
   * @param activate true to activate, false to deactivate (default: true)
   * @param queue Set to true to queue the command (default: false)
   */
  public async switchTurnout(
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
}