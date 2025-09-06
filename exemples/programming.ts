// example/programming.ts
import { Z21Client } from "../src/Z21Client";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getLocoAddress(z21: any): Promise<number> {
  // Read CV29 to check if long address is used
  const cv29 = await z21.engines.cvRead(29);
  const isLongAddress = (cv29.value & 0b00100000) !== 0; // bit 5

  if (isLongAddress) {
    // Read CV17 and CV18 for long address
    const cv17 = await z21.engines.cvRead(17);
    const cv18 = await z21.engines.cvRead(18);

    const longAddress = ((cv17.value - 192) << 8) + cv18.value;
    return longAddress;
  } else {
    // Read CV1 for short address
    const cv1 = await z21.engines.cvRead(1);
    return cv1.value;
  }
}

async function main() {
  const z21 = new Z21Client("192.168.0.214", 21105, false); // Debug mode disabled

  // Event listeners
  z21.on("debug", (msg) => {
    console.log("Raw message received:", msg);
  });

  z21.on("serialNumber", (payload) => {
    console.log("Serial number is:", payload);
  });

  z21.on("status", (payload) => {
    console.log("Command station status is:", payload);
  });

  z21.on("trackPower", (payload) => {
    console.log("Track power is:", payload);
  });

  z21.on("engineInfo", (payload) => {
    console.log("Engine info received:", payload);
  });

  z21.on("accessoryInfo", (payload) => {
    console.log("Accessory info received:", payload);
  });

  z21.on("broadcastFlags", (payload) => {
    console.log("Broadcast flags response:", payload);
  });

  z21.on("cvResult", (payload) => {
    console.log("CV result response:", payload);
  });

  z21.on("programmingMode", (payload) => {
    console.log("Programming mode response:", payload);
  });

  z21.on("error", (err) => {
    console.error("Z21Client error:", err);
  });


  try {

    await z21.system.setBroadcastFlags(true, true, true);
    console.log("Broadcast flags set.");
    await delay(2000);

    console.log("CV read 1 requested.");
    console.log(await z21.engines.cvRead(1));

    console.log("Locomotive address is:", await getLocoAddress(z21));

    console.log("CV read 29 requested.");
    console.log(await z21.engines.cvRead(29));

    console.log("CV write 29 requested.");
    console.log(await z21.engines.cvWrite(29, 34));

  } catch (err) {
    console.error("Command failed:", err);
  }

  setTimeout(() => {
    z21.close();
    console.log("Client socket closed.");
  }, 10000);
}

main();
