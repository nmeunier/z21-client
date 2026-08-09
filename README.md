# z21-client

[![npm version](https://img.shields.io/npm/v/z21-client)](https://www.npmjs.com/package/z21-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://github.com/nmeunier/z21-client/workflows/Tests%20%26%20Build/badge.svg)](https://github.com/nmeunier/z21-client/actions)
[![codecov](https://codecov.io/gh/nmeunier/z21-client/branch/main/graph/badge.svg)](https://codecov.io/gh/nmeunier/z21-client)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-brightgreen.svg)](https://nodejs.org/)


z21-client is a Node.js library written in TypeScript that implements the Roco/Fleischmann Z21 DCC command station.
It provides a strongly-typed, event-driven API to control locomotives and accessories, read and write CVs, and monitor system events in real time.
Connection to the Z21 command station is performed over the LAN (Ethernet/UDP).

---

## Features

- Send and receive UDP commands to/from a Z21 command station
- Control track power, emergency stop, turnouts, and engine functions
- Drive engines with speed and direction
- Read and write CVs (configuration variables)
- Query status, serial number, and broadcast flags
- Subscribe to feedback and status updates
- Fully typed API for Node.js
- Extensive unit tests

---

## Installation

```sh
npm install z21-client
```

---

## Usage Example

```typescript
import { Z21Client } from "z21-client";

const z21 = new Z21Client("192.168.0.111", 21105);

z21.on("status", (status) => {
  console.log("Z21 status:", status);
});

// Required: Z21Client forwards protocol errors (e.g. CV NACKs) as "error" events.
// Without a listener here, an unhandled "error" event crashes the Node process.
z21.on("error", (err) => {
  console.error("Z21Client error:", err);
});

(async () => {
  try {
    await z21.system.setTrackPowerOn();
    await z21.system.getStatus();
    z21.engines.setDriveEngine(3, 50, true); // address, speed, forward
    await z21.engines.setEngineFunctions(3, 1, "on");
    await z21.engines.cvWrite(17, 192);
    const cvResult = await z21.engines.cvRead(17);
    const productId = await z21.engines.cvReadIndexed(0, 255, 261); // ESU indexed CV (Product ID byte 1)
    await z21.accessories.switchTurnout(5, true); // address 5, output 2 (true), activate (default)
  } catch (err) {
    console.error("Command failed:", err);
  }
})();
```

---

## API

### Constructor

```typescript
new Z21Client(host: string, port?: number, debug?: boolean)
```

- `host`: IP address of your Z21 (e.g. `"192.168.0.111"`)
- `port`: UDP port (default: `21105`)
- `debug`: Enable debug logs (default: `false`)

---

### System Controller

- `system.setTrackPowerOn()`: Turn track power on
- `system.setTrackPowerOff()`: Turn track power off
- `system.emergencyStop()`: Emergency stop
- `system.setBroadcastFlags(engine?: boolean, accessory?: boolean, feedback?: boolean)`: Set broadcast flags
- `system.getBroadcastFlags()`: Get broadcast flags
- `system.getSerialNumber()`: Get Z21 serial number
- `system.getStatus()`: Get Z21 status

---

### Engine Controller

- `engines.getEngineInfo(address: number)`: Request information about an engine and subscribe to updates
- `engines.setDriveEngine(address: number, speed: number, forward: boolean, engineSpeedSteps?: number)`: Drive an engine with speed and direction (speed steps: 14, 28, or 128)
- `engines.setEngineFunctions(address: number, functionNumber: number, state: "on" | "off" | "toggle")`: Set a function state on an engine (F1-F28)
- `engines.cvRead(cv: number)`: Read a CV in direct mode
- `engines.cvWrite(cv: number, value: number)`: Write a CV in direct mode
- `engines.cvReadIndexed(indexHigh: number, indexLow: number, cv: number)`: Read a CV using NMRA indexed access (CV31/CV32 page registers, target `cv` in range 257-512). Used by decoders (e.g. ESU LokSound) to expose configuration beyond the direct-mode range — for example, reading CV261-264 with `indexHigh=0, indexLow=255` returns the decoder's ESU Product ID
- `engines.cvWriteIndexed(indexHigh: number, indexLow: number, cv: number, value: number)`: Write a CV using NMRA indexed access (CV31/CV32 page registers, target `cv` in range 257-512)

---

### Accessory Controller

- `accessories.setBasicAccessory(address: number, output?: boolean, activate?: boolean, queue?: boolean)`: Switch a basic accessory decoder (turnout, decoupler, light, ...) using `LAN_X_SET_TURNOUT`
- `accessories.switchTurnout(address: number, output?: boolean, activate?: boolean, queue?: boolean)`: Deprecated alias for `setBasicAccessory`, kept for backward compatibility
- `accessories.setExtAccessory(address: number, aspect: number)`: Send an aspect (0-255) to an extended accessory decoder (e.g. a multi-aspect signal) using `LAN_X_SET_EXT_ACCESSORY`. `address` is the user-facing address (1 = first extended accessory decoder), converted internally to the RCN-213 RawAddress (`address + 3`)

---

### General

- `close()`: Close UDP socket and logout

---

## Events

- `"status"`: Z21 status updates
- `"broadcastFlags"`: Broadcast flags updates
- `"serialNumber"`: Serial number received
- `"trackPower"`: Track power state
- `"programmingMode"`: Programming mode state
- `"shortCircuit"`: Short circuit detected
- `"stopped"`: Global emergency stop broadcast (track power stays on)
- `"engineInfo"`: Engine info updates
- `"cvResult"`: CV read/write result
- `"accessoryInfo"`: Basic accessory/turnout info
- `"extAccessoryInfo"`: Extended accessory (signal) aspect info
- `"feedback"`: Feedback module updates ()
- `"unknownBroadcast"`: Unknown broadcast received
- `"error"`: UDP or protocol errors
- `"debug"`: Debug messages

---

## TypeScript

This library is fully typed. All types and interfaces are included automatically.

---

## Development & Testing

- Run all tests:  
  ```sh
  npm test
  ```
- Run tests with coverage:  
  ```sh
  npm run test:coverage
  ```

---

## License

MIT

---

## Author

Nicolas Meunier

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## Links

- [Roco Z21 Documentation (EN)](https://www.z21.eu/en/downloads)
- [Node.js](https://nodejs.org/)
- [TypeScript](https://www.typescriptlang.org/)

---

