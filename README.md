# z21-client

[![npm version](https://img.shields.io/npm/v/z21-client)](https://www.npmjs.com/package/z21-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://github.com/nmeunier/z21-client/workflows/Tests%20%26%20Build/badge.svg)](https://github.com/nmeunier/z21-client/actions)
[![codecov](https://codecov.io/gh/nmeunier/z21-client/branch/main/graph/badge.svg)](https://codecov.io/gh/nmeunier/z21-client)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-brightgreen.svg)](https://nodejs.org/)


**z21-client** is a TypeScript client library for connecting a Node.js application to a Roco/Fleischmann **Z21** command station over Ethernet/UDP, speaking the Z21 LAN protocol.
It gives you a typed, event-driven API to drive locomotives, operate accessories, read and write CVs, and receive occupancy and system events as they happen.

It stays close to the wire: it implements the published Z21 LAN protocol — encoding and decoding frames — and leaves higher-level concerns (decoder-specific CV meanings, layout state, automation) to your application.

---

## Features

- Connect to a Z21 command station over Ethernet/UDP (frame encoding and decoding handled for you)
- Control track power, emergency stop, turnouts, and engine functions
- Drive engines with speed and direction
- Read and write CVs (configuration variables)
- Query status, serial number, and broadcast flags
- Subscribe to occupancy, transponder and status updates
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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  try {
    await z21.system.setTrackPowerOn();
    await z21.system.getStatus();
    z21.engines.setDriveEngine(3, 50, true); // address, speed, forward
    await z21.engines.setEngineFunctions(3, 1, "on");
    await z21.engines.cvWrite(17, 192);
    const cvResult = await z21.engines.cvRead(17);
    const productId = await z21.engines.cvReadIndexed(0, 255, 261); // ESU indexed CV (Product ID byte 1)

    // Activate then Deactivate: most turnout decoders are solenoid-driven and
    // will overheat if left powered - see the Accessory Controller note below.
    await z21.accessories.setBasicAccessory(5, true); // address 5, output 2 (true), activate
    await delay(150);
    await z21.accessories.setBasicAccessory(5, true, false); // same address/output, deactivate
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
- `system.setBroadcastFlags(options?: { driving?, rbus?, railcom?, systemState?, loconetDetector?, canDetector? })`: Set broadcast flags. No argument sends the default `0x07` (driving + R-BUS + RailCom). Fields are applied over that default: `true` adds a flag, `false` removes it, an omitted field leaves it. `driving`, `rbus`, `loconetDetector` and `canDetector` produce typed events; `systemState` and `railcom` enable the broadcast on the wire but are not decoded yet (read them from the `debug` event)
- `system.getBroadcastFlags()`: Get broadcast flags (result: `{ raw, driving, rbus, railcom, systemState, loconetDetector, canDetector }`)
- `system.getRmbusData(groupIndex: 0 | 1)`: Poll an R-BUS feedback group (0 = feedback modules 1-10, 1 = 11-20); triggers an `"occupancy"` event with the current 80-channel snapshot
- `system.getLoconetDetector(type, reportAddress?)`: Poll LocoNet detectors (**experimental, not tested on real hardware**)
- `system.getCanDetector(nid?)`: Poll CAN detectors (**experimental, not tested on real hardware**)
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

> **⚠️ `setBasicAccessory`/`switchTurnout`: you must send Activate and Deactivate yourself.**
> With the default `queue=false` (Q=0), the Z21 keeps driving the coil as long as `activate=true` is the last command it received for that address — it does not turn itself off. Most classic accessory decoders (twin-coil/solenoid turnout motors, e.g. Roco/Fleischmann "Doppelspulenantrieb", k83, ...) are pulse-driven: leaving the coil powered for more than a couple hundred milliseconds can overheat and permanently damage it. Always call `setBasicAccessory(address, output, true)` followed shortly after (~100-150ms, per the Z21 LAN Protocol spec) by `setBasicAccessory(address, output, false)` — see the examples below. With `queue=true` (Q=1) the Z21 handles retransmission on the track for you, but you should still send the Deactivate unless you know your specific decoder auto-shuts-off.

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
- `"occupancy"`: `{ bus, channels: { address, channel, occupied, nid? }[] }` — occupancy snapshot for R-BUS, LocoNet or CAN
- `"transponder"` (**experimental, not tested on real hardware**): `{ bus, channels: { address, channel, locoAddress, direction, present, nid? }[] }` — LocoNet transponder / LISSY loco reports and CAN RailCom loco lists
- `"unknownBroadcast"`: Unknown broadcast received
- `"error"`: UDP or protocol errors
- `"debug"`: Debug messages

---

## Migration 1.x → 2.0

| 1.x | 2.0 |
| --- | --- |
| `z21.on("feedback", mods => …)` — `mods: {address, activeInputs}[]` | `z21.on("occupancy", ({ bus, channels }) => …)` — `channels: {address, channel, occupied, nid?}[]` (free channels are now included) |
| `setBroadcastFlags(engine, accessory, feedback)` | `setBroadcastFlags({ driving?, rbus?, railcom?, systemState?, loconetDetector?, canDetector? })`; `(true,true,true)` → `setBroadcastFlags()` |
| `getBroadcastFlags()` result `{ raw, engine, accessory, feedback }` | `{ raw, driving, rbus, railcom, systemState, loconetDetector, canDetector }` |
| types `FeedbackModuleStatus`, `FeedbackResult` | `OccupancyResult` / `OccupancyChannel`, `TransponderResult` / `TransponderChannel` |

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

## Disclaimer & trademarks

This is an independent, unofficial project. It is not affiliated with, authorized, sponsored, or endorsed by any of the companies named below, and it is not built from any confidential material.

- **Z21** is a trademark of Modelleisenbahn GmbH.
- **Roco** and **Fleischmann** are trademarks of Modelleisenbahn GmbH.
- **LocoNet** is a registered trademark of Digitrax, Inc.
- **RailCom** is a registered trademark of Lenz Elektronik GmbH.
- **LISSY** / **MARCO** are products of Uhlenbrock Elektronik GmbH.

All other product names, logos, and brands are the property of their respective owners. They are used here only to identify the hardware and protocol this library interoperates with, under nominative fair use.

The Z21 LAN protocol is documented publicly by the manufacturer at [z21.eu](https://www.z21.eu/en/downloads); this library is an independent implementation of that published specification.

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

