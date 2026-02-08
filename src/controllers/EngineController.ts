import { CvResultData, ErrorResultData } from "../parsers/parserResult";
import { Z21UdpTransport } from "../transport/Z21UdpTransport";

export class EngineController {
  private transport: Z21UdpTransport;

  constructor(transport: Z21UdpTransport) {
    this.transport = transport;
  }

  /**
   * Request information about an engine and subscribe to updates for this address.
   * @param address Engine address (1-10239)
   */
  public async getEngineInfo(address: number): Promise<void> {

    // Split address into MSB and LSB
    let addrMsb = (address >> 8) & 0x3F;
    const addrLsb = address & 0xFF;

    // For addresses >= 128, set the two highest bits in MSB
    if (address >= 128) {
      addrMsb = 0xC0 | addrMsb;
    }

    // Build XpressNet frame: [0xE3, 0xF0, Adr_MSB, Adr_LSB]
    const xpressNetFrame = [0xE3, 0xF0, addrMsb, addrLsb];

    // XOR checksum for XpressNet frame
    let xor = 0;
    for (const byte of xpressNetFrame) xor ^= byte;
    xpressNetFrame.push(xor);

    // LAN_X header: [0x40, 0x00]
    const payload = [0x40, 0x00, ...xpressNetFrame];

    await this.transport.sendCommand(payload);
  }

  /**
   * Drive an engine with speed and direction.
   * @param address Engine address (1-10239)
   * @param speed Speed value (0-127)
   * @param forward Direction (true=forward, false=backward)
   */
  setDriveEngine(address: number, speed: number, forward: boolean, engineSpeedSteps: number = 128): void {
    // --- Build XpressNet engine control frame ---
    const addrL = address & 0xFF;                  // Low byte of engine address
    const addrH = (address >> 8) & 0x3F;           // High byte (14-bit address max)
    const directionBit = forward ? 0x80 : 0x00;    // Set direction bit if forward
    const speedByte = directionBit | (speed & 0x7F); // Combine direction and speed

    let steps = 0x13; // Default to DCC128
    if (engineSpeedSteps === 28) {
      steps = 0x12; // DCC27 for 27-speed
    } else if (engineSpeedSteps === 14) {
      steps = 0x10; // DCC14 for 14-speed
    }

    // XpressNet frame: E4 = drive engine command
    const xpressNetFrame = [0xE4, steps, addrH, addrL, speedByte];

    // --- Calculate XOR checksum ---
    let xor = 0;
    for (const byte of xpressNetFrame) {
      xor ^= byte;
    }
    xpressNetFrame.push(xor);

    // --- Wrap in LAN_X payload (0x40 0x00 = LAN_X header, 0x24 = XpressNet command) ---
    const payload = [0x40, 0x00, ...xpressNetFrame];

    // --- Build complete Z21 frame and send ---
    this.transport.sendCommand(payload);
  }

  /**
   * Set a function state on an engine.
   * @param address Engine address (1-10239)
   * @param functionNumber Function number (1-28)
   * @param state Function state (on, off, toggle)
   */
  public async setEngineFunctions(address: number, functionNumber: number, state: string): Promise<void> {

    const addrL = address & 0xFF;                  // Low byte of engine address
    const addrH = (address >> 8) & 0x3F;           // High byte (14-bit address max)

    // Generation of functionByte according to functionNumber (1-28) and state
    let functionByte = 0x00;
    if (functionNumber < 0 || functionNumber > 28) {
      throw new Error("functionNumber must be between 0 and 28");
    }

    // define functionByte based on state
    switch (state) {
      case "on":
        functionByte = 0x40;
        break;
      case "off":
        functionByte = 0x00;
        break;
      case "toggle":
        functionByte = 0x80;
        break;
      default:
        throw new Error("state must be \"on\", \"off\" or \"toggle\"");
    }

    // Set the specific function bit
    functionByte |= (1 << (functionNumber - 1)); // Set the bit corresponding to the function number

    // Build the command payload
    // E4 = set function command, 0x40 = LAN_X header, 0x00 = XpressNet command
    // Payload format: [0x40, 0x00, 0xE4, addrH, addrL, functionByte]
    const payload = [0x40, 0x00, 0xE4, 0xF8, addrH, addrL, functionByte];
    await this.transport.sendCommand(payload);
  }

  /**
   * Read a CV in direct mode.
   * @param cv CV number (1-1024)
   */
  public async cvRead(cv: number): Promise<ErrorResultData | CvResultData> {
    return new Promise((resolve, reject) => {

      const cvAddr = cv - 1;
      const cvMsb = (cvAddr >> 8) & 0xFF;
      const cvLsb = cvAddr & 0xFF;

      // Build XpressNet frame: [0x23, 0x11, cvMsb, cvLsb]
      const xpressNetFrame = [0x23, 0x11, cvMsb, cvLsb];

      let xor = 0;
      for (const byte of xpressNetFrame) xor ^= byte;
      xpressNetFrame.push(xor);

      // LAN_X header: [0x40, 0x00]
      const payload = [0x40, 0x00, ...xpressNetFrame];

      const timeoutMs = 30000; // 30 seconds
      let timer: NodeJS.Timeout | null = setTimeout(() => {
        cleanup();
        reject(new Error("cvRead timeout"));
      }, timeoutMs);

      const onCv = (msg: any) => {
        if (msg.cv === cv) {
          cleanup();
          resolve(msg);
        }
      };

      const onError = (msg: any) => {
        if (msg.code === "nack" || msg.code === "nack-sc") {
          cleanup();
          reject(msg);
        }
      };

      const cleanup = () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        this.transport.removeListener("cvResult", onCv);
        this.transport.removeListener("error", onError);
      };

      this.transport.on("cvResult", onCv);
      this.transport.on("error", onError);

      this.transport.sendCommand(payload).catch((err) => {
        cleanup();
        reject(err);
      });

    });

  }
  /**
   * Write a CV in direct mode.
   * @param cv CV number (1-1024)
   * @param value Value to write (0-255)
   */
  public async cvWrite(cv: number, value: number): Promise<ErrorResultData | CvResultData> {
    return new Promise((resolve, reject) => {
      // CVs are 1-based in docs, but 0-based in protocol
      const cvAddr = cv - 1;
      const cvMsb = (cvAddr >> 8) & 0xFF;
      const cvLsb = cvAddr & 0xFF;

      // Build XpressNet frame: [0x24, 0x12, cvMsb, cvLsb, value]
      const xpressNetFrame = [0x24, 0x12, cvMsb, cvLsb, value];

      // XOR checksum for XpressNet frame
      let xor = 0;
      for (const byte of xpressNetFrame) xor ^= byte;
      xpressNetFrame.push(xor);

      // LAN_X header: [0x40, 0x00]
      const payload = [0x40, 0x00, ...xpressNetFrame];

      const timeoutMs = 30000; // 30 seconds
      let timer: NodeJS.Timeout | null = setTimeout(() => {
        cleanup();
        reject(new Error("cvWrite timeout"));
      }, timeoutMs);

      const onCv = (msg: any) => {
        if (msg.cv === cv) {
          cleanup();
          resolve(msg);
        }
      };

      const onError = (msg: any) => {
        if (msg.code === "nack" || msg.code === "nack-sc") {
          cleanup();
          reject(msg);
        }
      };

      const cleanup = () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        this.transport.removeListener("cvResult", onCv);
        this.transport.removeListener("error", onError);
      };

      this.transport.on("cvResult", onCv);
      this.transport.on("error", onError);

      this.transport.sendCommand(payload).catch((err) => {
        cleanup();
        reject(err);
      });
    });



  }

}