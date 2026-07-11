import { CvResultData } from "../parsers/parserResult";
import { Z21UdpTransport } from "../transport/Z21UdpTransport";

export class EngineController {
  private transport: Z21UdpTransport;

  // Serializes all CV read/write operations (including each internal step of
  // cvReadIndexed/cvWriteIndexed) so only one is ever in flight at a time.
  // Responses are correlated purely by CV number on a shared transport
  // EventEmitter with no per-request id, so two concurrent operations could
  // otherwise resolve each other's listeners with the wrong data.
  private cvQueue: Promise<void> = Promise.resolve();

  constructor(transport: Z21UdpTransport) {
    this.transport = transport;
  }

  /**
   * Run a CV operation once every previously queued CV operation has settled,
   * so at most one is ever in flight at a time.
   */
  private enqueueCv<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.cvQueue.then(operation, operation);
    this.cvQueue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
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

    // Set function number in bits 0-5 per Z21 LAN protocol specification
    // See: Z21 LAN Protocol v1.13, Section 4.2 (LAN_X_SET_LOCO_FUNCTION)
    // DB3 byte format: bits 7-6 = switch type (00=off, 01=on, 10=toggle), bits 5-0 = function index
    // Reference: https://www.z21.eu/media/Kwc_Basic_DownloadTag_Component/root-en-main_47-702/default/69bad87e/1712141518/z21-lan-protokoll-en.pdf
    functionByte |= (functionNumber & 0x3F);

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
  public async cvRead(cv: number): Promise<CvResultData> {
    return this.enqueueCv(() => this.rawCvRead(cv));
  }

  private rawCvRead(cv: number): Promise<CvResultData> {
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
  public async cvWrite(cv: number, value: number): Promise<CvResultData> {
    return this.enqueueCv(() => this.rawCvWrite(cv, value));
  }

  private rawCvWrite(cv: number, value: number): Promise<CvResultData> {
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

  /**
   * Validate parameters shared by cvReadIndexed/cvWriteIndexed.
   * @param value Only validated when provided (cvWriteIndexed passes it, cvReadIndexed doesn't).
   */
  private validateIndexedCvParams(indexHigh: number, indexLow: number, cv: number, value?: number): void {
    if (!Number.isInteger(indexHigh) || indexHigh < 0 || indexHigh > 255) {
      throw new Error("indexHigh must be an integer between 0 and 255");
    }
    if (!Number.isInteger(indexLow) || indexLow < 0 || indexLow > 255) {
      throw new Error("indexLow must be an integer between 0 and 255");
    }
    if (!Number.isInteger(cv) || cv < 257 || cv > 512) {
      throw new Error("cv must be an integer between 257 and 512 for indexed CV access");
    }
    if (value !== undefined && (!Number.isInteger(value) || value < 0 || value > 255)) {
      throw new Error("value must be an integer between 0 and 255");
    }
  }

  /**
   * Write the CV31/CV32 index registers to select an indexed CV page.
   */
  private async selectIndexPage(indexHigh: number, indexLow: number): Promise<void> {
    await this.rawCvWrite(31, indexHigh);
    await this.rawCvWrite(32, indexLow);
  }

  /**
   * Read a CV using indexed access (NMRA S-9.2.2, CV31/CV32 page registers).
   * Writes the index registers (CV31, CV32) then reads the target CV in the 257-512 window.
   *
   * The whole 3-step sequence (write CV31, write CV32, read target CV) runs as a single
   * queued unit, so no other CV operation on this controller can interleave with it and
   * change the page selection midway through.
   *
   * If the CV31 write succeeds but CV32 or the target read then fails, the decoder's index
   * registers are left with the new CV31 but a stale CV32 - there is no rollback. This is an
   * inherent limitation of the non-transactional NMRA CV31/32 mechanism, not specific to this
   * library; re-run cvReadIndexed/cvWriteIndexed with known-good values to recover.
   *
   * Because this performs 3 sequential round trips, each with its own 30s timeout, the total
   * call can take up to ~90s in the worst case (vs. ~30s for a plain cvRead/cvWrite).
   * @param indexHigh Index high byte, written to CV31 (0-255)
   * @param indexLow Index low byte, written to CV32 (0-255)
   * @param cv Target CV number within the indexed window (257-512)
   */
  public async cvReadIndexed(indexHigh: number, indexLow: number, cv: number): Promise<CvResultData> {
    this.validateIndexedCvParams(indexHigh, indexLow, cv);
    return this.enqueueCv(async () => {
      await this.selectIndexPage(indexHigh, indexLow);
      return this.rawCvRead(cv);
    });
  }

  /**
   * Write a CV using indexed access (NMRA S-9.2.2, CV31/CV32 page registers).
   * Writes the index registers (CV31, CV32) then writes the target CV in the 257-512 window.
   *
   * See {@link cvReadIndexed} for the atomicity, partial-failure, and timeout caveats that
   * apply equally here.
   * @param indexHigh Index high byte, written to CV31 (0-255)
   * @param indexLow Index low byte, written to CV32 (0-255)
   * @param cv Target CV number within the indexed window (257-512)
   * @param value Value to write (0-255)
   */
  public async cvWriteIndexed(indexHigh: number, indexLow: number, cv: number, value: number): Promise<CvResultData> {
    this.validateIndexedCvParams(indexHigh, indexLow, cv, value);
    return this.enqueueCv(async () => {
      await this.selectIndexPage(indexHigh, indexLow);
      return this.rawCvWrite(cv, value);
    });
  }

}