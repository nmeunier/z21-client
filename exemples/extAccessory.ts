/* exemples/extAccessory.ts */
import { Z21Client } from "../src/Z21Client";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const z21 = new Z21Client("192.168.0.215", 21105, false);

  z21.on("accessoryInfo", (payload) => console.log("[accessoryInfo]", payload));
  z21.on("extAccessoryInfo", (payload) => console.log("[extAccessoryInfo]", payload));
  z21.on("error", (err) => console.error("[error]", err));

  try {
    await z21.system.setBroadcastFlags(true, true, true);
    await delay(300);

    // Activate then Deactivate: most turnout decoders are solenoid-driven and
    // will overheat if left powered for too long.
    console.log("Switching basic accessory #10 (setBasicAccessory)...");
    await z21.accessories.setBasicAccessory(10, false, true, false);
    await delay(500);
    await z21.accessories.setBasicAccessory(10, false, false, false);
    await delay(500);

    console.log("Sending aspect 5 to extended accessory #1 (setExtAccessory)...");
    await z21.accessories.setExtAccessory(1, 5);
    await delay(1000);

    console.log("Sending aspect 0 (stop) to extended accessory #1...");
    await z21.accessories.setExtAccessory(1, 0);
    await delay(1000);
  } catch (err) {
    console.error("Command failed:", err);
  }

  await z21.close();
}

main();
