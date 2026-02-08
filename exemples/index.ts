// example/index.ts
import { Z21Client } from "../src/Z21Client";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


async function main() {
  const z21 = new Z21Client("192.168.0.215", 21105, false);

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

  z21.on("feedback", (payload) => {
    console.log("Feedback response:", payload);
  });

  z21.on("error", (err) => {
    console.error("Z21Client error:", err);
  });


  try {

    await z21.system.setBroadcastFlags(true, true, true);
    console.log("Broadcast flags set.");
    await delay(2000);

    await z21.system.getStatus();
    console.log("Status requested.");

    await z21.system.setTrackPowerOn();
    console.log("Track power turned on.");
    await delay(2000);

    await z21.system.getSerialNumber();
    console.log("SerialNumber requested.");

    await z21.accessories.switchTurnout(1, false);
    console.log("Turnout 1 switched to position 1.");
    await z21.accessories.switchTurnout(1, false, false);
    await delay(3000);

    await z21.engines.setEngineFunctions(210, 0, 'on');
    console.log("Engine functions set for locomotive 210.");

    await delay(500);
    await z21.engines.getEngineInfo(210);
    console.log("Request Info locomotive 210.");

    await z21.engines.setDriveEngine(210, 50, true);
    console.log("Driving locomotive 210 at speed 50 forward.");
    await delay(2000);

    await z21.engines.setDriveEngine(210, 0, true);
    console.log("Driving locomotive 210 at speed 0 forward.");
    await delay(5000);

    await z21.engines.setDriveEngine(210, 50, false);
    console.log("Driving locomotive 210 at speed 50 reverse.");
    await delay(2000);

    await z21.engines.setDriveEngine(210, 1, false);
    console.log("Driving locomotive 210 at e-stop.");
    await delay(2000);

    await z21.accessories.switchTurnout(1, true);
    await z21.accessories.switchTurnout(1, true, false);
    console.log("Turnout 1 switched to position 1.");
    await delay(1000);

    await z21.engines.setEngineFunctions(210, 0, 'off');
    console.log("Engine functions set for locomotive 210.");
    await delay(1000);

    await delay(260000);

    await z21.system.setTrackPowerOff();
    console.log("Track power turned off.");


  } catch (err) {
    console.error("Command failed:", err);
  }

  setTimeout(() => {
    z21.close();
    console.log("Client socket closed.");
  }, 10000);
}

main();
