"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Z21Client = void 0;
// src/Z21Client.ts
const events_1 = require("events");
const Z21UdpTransport_1 = require("./transport/Z21UdpTransport");
const EngineController_1 = require("./controllers/EngineController");
const AccessoryController_1 = require("./controllers/AccessoryController");
const SystemController_1 = require("./controllers/SystemController");
const feedbackParser_1 = require("./parsers/feedbackParser");
class Z21Client extends events_1.EventEmitter {
    /**
     * Create a new Z21Client instance.
     * @param host The hostname or IP address of the Z21 device.
     * @param port The port number to connect to (default: 21105).
     * @param debug Enable debug mode (default: false).
     */
    constructor(host, port = 21105, debug = false) {
        super();
        this.transport = new Z21UdpTransport_1.Z21UdpTransport(host, port, debug, new feedbackParser_1.FeedbackParser());
        // Initialize controllers
        this.engines = new EngineController_1.EngineController(this.transport);
        this.accessories = new AccessoryController_1.AccessoryController(this.transport);
        this.system = new SystemController_1.SystemController(this.transport);
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
            console.log("[Z21Client] Init");
        }
    }
    /**
     * Close the Z21Client connection.
     */
    async close() {
        await this.system.logout();
        await this.transport.close();
    }
}
exports.Z21Client = Z21Client;
