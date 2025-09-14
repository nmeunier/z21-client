// src/Z21Client.ts
import { EventEmitter } from "events";
import { Z21UdpTransport } from "./transport/Z21UdpTransport";
import { EngineController } from "./controllers/EngineController";
import { AccessoryController } from "./controllers/AccessoryController";
import { SystemController } from "./controllers/SystemController";
import { FeedbackParser } from "./parsers/feedbackParser";

export class Z21Client extends EventEmitter {
  public readonly engines: EngineController;
  public readonly accessories: AccessoryController;
  public readonly system: SystemController;
  private readonly transport: Z21UdpTransport;


  /**
   * Create a new Z21Client instance.
   * @param host The hostname or IP address of the Z21 device.
   * @param port The port number to connect to (default: 21105).
   * @param debug Enable debug mode (default: false).
   */
  constructor(host: string, port: number = 21105, debug: boolean = false) {
    super();
    this.transport = new Z21UdpTransport(host, port, debug, new FeedbackParser());

    // Initialize controllers
    this.engines = new EngineController(this.transport);
    this.accessories = new AccessoryController(this.transport);
    this.system = new SystemController(this.transport);

    // Forward transport events to Z21Client
    this.transport.on("debug", (msg) => this.emit("debug", msg));
    this.transport.on("serialNumber", (msg) => this.emit("serialNumber", msg));
    this.transport.on("broadcastFlags", (msg) => this.emit("broadcastFlags", msg));
    this.transport.on("status", (msg) => this.emit("status", msg));
    this.transport.on("trackPower", (msg) => this.emit("trackPower", msg));
    this.transport.on("programmingMode", (msg) => this.emit("programmingMode", msg));
    this.transport.on("shortCircuit", (msg) => this.emit("shortCircuit", msg));
    this.transport.on("engineInfo", (msg) => this.emit("engineInfo", msg));
    this.transport.on("cvResult", (msg) => this.emit("cvResult", msg));
    this.transport.on("accessoryInfo", (msg) => this.emit("accessoryInfo", msg));
    this.transport.on("unknownBroadcast", (err) => this.emit("unknownBroadcast", err));
    this.transport.on("feedback", (msg) => this.emit("feedback", msg));

    this.transport.on("error", (err) => this.emit("error", err));

    if (debug) {
      console.log(`[Z21Client] Init`);
    }

  }

  /**
   * Close the Z21Client connection.
   */
  public async close(): Promise<void> {
    await this.system.logout();
    await this.transport.close();
  }
}