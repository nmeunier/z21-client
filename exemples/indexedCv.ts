/* exemples/indexedCv.ts */
import { Z21Client } from "../src/Z21Client";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const z21 = new Z21Client("192.168.0.215", 21105, false);

  z21.on("error", (err) => {
    console.error("Z21Client error:", err);
  });

  try {
    await z21.system.setBroadcastFlags(true, true, true);
    await delay(1000);

    // ESU indexed CV convention: CV31=0, CV32=255 selects the page holding
    // Product ID (CV261-264), serial number (CV265-268) and production date (CV269-272).
    const cv261 = await z21.engines.cvReadIndexed(0, 255, 261);
    const cv262 = await z21.engines.cvReadIndexed(0, 255, 262);
    const cv263 = await z21.engines.cvReadIndexed(0, 255, 263);
    const cv264 = await z21.engines.cvReadIndexed(0, 255, 264);

    const productId =
      cv261.value +
      cv262.value * 256 +
      cv263.value * 65536 +
      cv264.value * 16777216;

    console.log("CV261-264:", cv261.value, cv262.value, cv263.value, cv264.value);
    console.log("ESU Product ID:", productId);
  } catch (err) {
    console.error("Command failed:", err);
  }

  z21.close();
}

main();
