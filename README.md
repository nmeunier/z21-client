# z21-client

z21-client is a Node.js library written in TypeScript that implements the UDP protocol of the Roco/Fleischmann Z21 DCC command station.
It provides a strongly-typed, event-driven API to control locomotives and accessories, read and write CVs, and monitor system events in real time.

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

(async () => {
  await z21.system.setTrackPowerOn();
  await z21.system.getStatus();
  z21.engines.setDriveEngine(3, 50, true); // address, speed, forward
  await z21.engines.setEngineFunctions(3, 1, "on");
  await z21.engines.cvWrite(17, 192);
  const cvResult = await z21.engines.cvRead(17);
  await z21.accessories.switchTurnout(5, true); // address 5, output 2 (true), activate (default)
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

---

### Accessory Controller

- `accessories.switchTurnout(address: number, output?: boolean, activate?: boolean, queue?: boolean)`: Switch turnout/accessory

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
- `"engineInfo"`: Engine info updates
- `"cvResult"`: CV read/write result
- `"accessoryInfo"`: Accessory/turnout info
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

