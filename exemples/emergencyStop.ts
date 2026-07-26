/* exemples/emergencyStop.ts */
import { Z21Client } from "../src/Z21Client";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const z21 = new Z21Client("192.168.0.215", 21105, false);

  z21.on("status", (payload) => console.log("[status]", payload));
  z21.on("trackPower", (payload) => console.log("[trackPower]", payload));
  z21.on("stopped", () => console.log("[stopped] LAN_X_BC_STOPPED received"));
  z21.on("error", (err) => console.error("[error]", err));

  try {
    await z21.system.setBroadcastFlags(true, true, true);
    await delay(300);

    console.log("Turning track power ON...");
    await z21.system.setTrackPowerOn();
    await delay(500);

    console.log("Sending emergencyStop()...");
    await z21.system.emergencyStop();
    await delay(1000);

    // Emergency stop halts all engines but keeps track voltage present,
    // so trackPower stays "on" while "stopped" fires separately.
    console.log("Requesting status to confirm emergency-stop state...");
    await z21.system.getStatus();
    await delay(500);

    console.log("Restoring: resuming track power ON to clear emergency stop...");
    await z21.system.setTrackPowerOn();
    await delay(500);
  } catch (err) {
    console.error("Command failed:", err);
  }

  await z21.close();
}

main();
