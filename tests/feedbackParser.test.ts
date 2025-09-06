import { FeedbackParser } from "../src/parsers/feedbackParser";

describe("FeedbackParser", () => {
  let parser: FeedbackParser;

  beforeEach(() => {
    parser = new FeedbackParser();
  });

  it("should parse LAN_X_STATUS_CHANGED with csEmergencyStop", () => {
    // Simulate a full Z21 UDP response frame:
    // Length (2 bytes LE) + LAN_X header (0x40, 0x00) + payload (0x62, 0x22, 0x01)
    const payload = Buffer.from([
      0x07, 0x00, // Length = 7 bytes
      0x40, 0x00, // LAN_X header
      0x62, 0x22, 0x01 // LAN_X_STATUS_CHANGED, subopcode, status
    ]);
    const result = parser.parse(payload);
    expect(result).toEqual({
      type: "status",
      value: "Emergency Stop Activated",
    });
  });

  it("should parse LAN_X_STATUS_CHANGED with csTrackVoltageOff", () => {
    // Simulate a frame with Track Voltage Off status
    const payload = Buffer.from([
      0x07, 0x00,
      0x40, 0x00,
      0x62, 0x22, 0x02
    ]);
    const result = parser.parse(payload);
    expect(result).toEqual({
      type: "status",
      value: "Track Voltage Off",
    });
  });

  it("should parse LAN_X_STATUS_CHANGED with csShortCircuit", () => {
    // Simulate a frame with Short Circuit status
    const payload = Buffer.from([
      0x07, 0x00,
      0x40, 0x00,
      0x62, 0x22, 0x04
    ]);
    const result = parser.parse(payload);
    expect(result).toEqual({
      type: "status",
      value: "Short Circuit",
    });
  });

  it("should parse LAN_X_STATUS_CHANGED with csProgrammingModeActive", () => {
    // Simulate a frame with Programming Mode Active status
    const payload = Buffer.from([
      0x07, 0x00,
      0x40, 0x00,
      0x62, 0x22, 0x20
    ]);
    const result = parser.parse(payload);
    expect(result).toEqual({
      type: "status",
      value: "Programming Mode Active",
    });
  });

  it("should parse LAN_X_STATUS_CHANGED with unknown status", () => {
    // Simulate a frame with an unknown status code
    const payload = Buffer.from([
      0x07, 0x00,
      0x40, 0x00,
      0x62, 0x22, 0xFF
    ]);
    const result = parser.parse(payload);
    expect(result).toEqual({
      type: "status",
      value: "Unknown Status",
    });
  });

  it("should parse LAN_X_BC_TRACK_POWER_ON broadcast", () => {
    // Simulate a broadcast for track power ON
    const payload = Buffer.from([
      0x07, 0x00,
      0x40, 0x00,
      0x61, 0x01, 0x60
    ]);
    const result = parser.parse(payload);
    expect(result).toEqual({
      type: "trackPower",
      value: "on",
    });
  });

  it("should parse LAN_X_BC_TRACK_POWER_OFF broadcast", () => {
    // Simulate a broadcast for track power OFF
    const payload = Buffer.from([
      0x07, 0x00,
      0x40, 0x00,
      0x61, 0x00, 0x61
    ]);
    const result = parser.parse(payload);
    expect(result).toEqual({
      type: "trackPower",
      value: "off",
    });
  });

  it("should parse LAN_X_BC_PROGRAMMING_MODE", () => {
    // Simulate a broadcast for programming mode
    const payload = Buffer.from([
      0x07, 0x00,
      0x40, 0x00,
      0x61, 0x02, 0x63
    ]);
    const result = parser.parse(payload);
    expect(result).toEqual({ type: "programmingMode", value: "active" });
  });

  it("should parse LAN_X_BC_TRACK_SHORT_CIRCUIT", () => {
    // Simulate a broadcast for short circuit
    const payload = Buffer.from([
      0x07, 0x00,
      0x40, 0x00,
      0x61, 0x08, 0x69
    ]);
    const result = parser.parse(payload);
    expect(result).toEqual({ type: "shortCircuit", value: "detected" });
  });

  it("should parse LAN_X_CV_NACK", () => {
    // Simulate a NACK error for CV read/write
    const payload = Buffer.from([
      0x07, 0x00,
      0x40, 0x00,
      0x61, 0x13, 0x72
    ]);
    const result = parser.parse(payload);
    expect(result).toEqual({
      type: "error",
      value: {
        code: "nack",
        message: "CV Read/Write NACK"
      }
    });
  });

  it("should parse LAN_X_CV_NACK_SC", () => {
    // Simulate a NACK error due to short-circuit
    const payload = Buffer.from([
      0x07, 0x00,
      0x40, 0x00,
      0x61, 0x12, 0x73
    ]);
    const result = parser.parse(payload);
    expect(result).toEqual({
      type: "error",
      value: {
        code: "nack-sc",
        message: "CV Read/Write NACK due to short-circuit"
      }
    });
  });



  it("should parse LAN_X_LOCO_INFO with all fields", () => {
    // Example: Engine address 0x123, 128 speed steps, forward, speed 45, double traction, F0-F8 ON, F9-F12 OFF, F13-F20 ON, F21-F28 OFF, F29-F31 ON
    // DB0: Adr_MSB (0x01 << 2 = 0x04, 0x12 >> 8 = 0x01, so 0x01)
    // DB1: Adr_LSB (0x23)
    // DB2: 00000100 (KKK=4, 128 speed steps, busy=0)
    // DB3: 10101101 (direction=1, speed=45)
    // DB4: 00011111 (0x1F) => D=0 (doubleTraction: false), S=0, L=1, F=1, G=1, H=1, J=1 (F0-F4 ON)
    // DB5: 00001111 (F5-F8 ON, F9-F12 OFF)
    // DB6: 11111111 (F13-F20 ON)
    // DB7: 00000000 (F21-F28 OFF)
    // DB8: 00000111 (F29-F31 ON)
    // DataLen = 11 (0x0B), total packet = 11 bytes + 2 (length) = 13
    const payload = Buffer.from([
      0x0B, 0x00, // Length = 11
      0x40, 0x00, // LAN_X header
      0xEF,       // LAN_X_LOCO_INFO opcode
      0x01,       // Adr_MSB
      0x23,       // Adr_LSB
      0x04,       // DB2: 128 speed steps
      0xAD,       // DB3: direction=1, speed=45
      0x1F,       // DB4: F0-F4 ON, doubleTraction = false
      0x0F,       // DB5: F5-F8 ON, F9-F12 OFF
      0xFF,       // DB6: F13-F20 ON
      0x00,       // DB7: F21-F28 OFF
      0x07        // DB8: F29-F31 ON
    ]);
    const result = parser.parse(payload);

    expect(result).toEqual({
      type: "engineInfo",
      value: {
        address: 0x123,
        busy: false,
        speedSteps: 128,
        direction: "forward",
        speed: 45,
        doubleTraction: false,
        functions: {
          F0: true,
          F1: true,
          F2: true,
          F3: true,
          F4: true,
          F5: true,
          F6: true,
          F7: true,
          F8: true,
          F9: false,
          F10: false,
          F11: false,
          F12: false,
          F13: true,
          F14: true,
          F15: true,
          F16: true,
          F17: true,
          F18: true,
          F19: true,
          F20: true,
          F21: false,
          F22: false,
          F23: false,
          F24: false,
          F25: false,
          F26: false,
          F27: false,
          F28: false,
          F29: true,
          F30: true,
          F31: true,
        }
      }
    });
  });

  it("should parse LAN GET_SERIAL_NUMBER response", () => {
    // DataLen (2 bytes LE), Header (0x10, 0x00), Serial number (4 bytes LE)
    // Exemple : serial number = 0x12345678
    const payload = Buffer.from([
      0x08, 0x00, // DataLen = 8
      0x10, 0x00, // Header
      0x78, 0x56, 0x34, 0x12 // Serial number LE
    ]);
    const result = parser.parse(payload);
    expect(result).toEqual({
      type: "serialNumber",
      value: { serialNumber: 0x12345678 }
    });
  });

  it("should parse LAN GET_BROADCAST_FLAGS response", () => {
    // DataLen (2 bytes LE), Header (0x51, 0x00), Broadcast-Flags (4 bytes LE)
    // Exemple : flags = 0x07 (engine, accessory, feedback all true)
    const payload = Buffer.from([
      0x08, 0x00, // DataLen = 8
      0x51, 0x00, // Header
      0x07, 0x00, 0x00, 0x00 // Broadcast-Flags
    ]);
    const result = parser.parse(payload);
    expect(result).toEqual({
      type: "broadcastFlags",
      value: {
        raw: 0x07,
        engine: true,
        accessory: true,
        feedback: true,
      }
    });
  });

  it("should return error if payload length is less than 2", () => {
    const payload = Buffer.from([0x01]);
    const result = parser.parse(payload);
    expect(result).toEqual({
      type: "error",
      value: { code: "invalid-payload", message: "Invalid payload length" },
    });
  });

  it("should return error if payload is shorter than expected length in header", () => {
    // Header says length is 8, but only 6 bytes provided
    const payload = Buffer.from([
      0x08, 0x00, // DataLen = 8
      0x10, 0x00, // Header
      0x78, 0x56  // Only 2 bytes for serial number, should be 4
    ]);
    const result = parser.parse(payload);
    expect(result).toEqual({
      type: "error",
      value: { code: "invalid-payload", message: "Payload shorter than expected length" },
    });
  });

  it("should return null for unknown LAN opcode", () => {
    // DataLen (2 bytes LE), opcode (0x99), payload (4 bytes)
    const payload = Buffer.from([
      0x06, 0x00, // DataLen = 6
      0x99, 0x00, // Unknown opcode
      0x00, 0x00  // Payload (too short, but irrelevant here)
    ]);
    const result = parser.parse(payload);
    expect(result).toBeNull();
  });

  it("should return null for GET_BROADCAST_FLAGS if payload is too short", () => {
    // DataLen (2 bytes LE), opcode (0x51), payload (only 2 bytes, should be 4)
    const payload = Buffer.from([
      0x04, 0x00, // DataLen = 4
      0x51, 0x00, // GET_BROADCAST_FLAGS
      0x01, 0x00  // Only 2 bytes for flags
    ]);
    const result = parser.parse(payload);
    expect(result).toBeNull();
  });

  it("should return null for GET_SERIAL_NUMBER if payload is too short", () => {
    // DataLen (2 bytes LE), opcode (0x10), payload (only 2 bytes, should be 4)
    const payload = Buffer.from([
      0x04, 0x00, // DataLen = 4
      0x10, 0x00, // GET_SERIAL_NUMBER
      0x01, 0x00  // Only 2 bytes for serial number
    ]);
    const result = parser.parse(payload);
    expect(result).toBeNull();
  });

  it("should parse LAN_X_CV_RESULT (parseCV) correctly", () => {
    // DataLen (2 bytes LE), LAN_X header (0x40, 0x00), opcode (0x64, 0x14), CVAdr_MSB, CVAdr_LSB, Value, XOR
    // Example: CV = 0x0010 (16 + 1 = 17 for user), Value = 0xC0
    const payload = Buffer.from([
      0x0a, 0x00, // DataLen = 10
      0x40, 0x00, // LAN_X header
      0x64, 0x14, // LAN_X_CV_RESULT
      0x00, 0x10, // CVAdr_MSB, CVAdr_LSB (0x0010)
      0xc0,       // Value
      0xa0        // XOR (not checked here)
    ]);
    const result = parser.parse(payload);
    expect(result).toEqual({
      type: "cvResult",
      value: {
        cv: 17,    // 0x10 + 1
        value: 0xC0,
      }
    });
  });

  it("should parse LAN_X_CV_RESULT (parseCV) correctly even if payload is too long", () => {
    // DataLen (2 bytes LE), LAN_X header (0x40, 0x00), opcode (0x64, 0x14), CVAdr_MSB, CVAdr_LSB, Value, XOR, extra bytes
    // Example: CV = 0x0010 (16 + 1 = 17 for user), Value = 0xC0, plus extra bytes at the end
    const payload = Buffer.from([
      0x0a, 0x00, // DataLen = 10
      0x40, 0x00, // LAN_X header
      0x64, 0x14, // LAN_X_CV_RESULT
      0x00, 0x10, // CVAdr_MSB, CVAdr_LSB (0x0010)
      0xc0,       // Value
      0xa0,       // XOR
      0x99, 0x88  // Extra bytes (should be ignored)
    ]);
    const result = parser.parse(payload);
    expect(result).toEqual({
      type: "cvResult",
      value: {
        cv: 17,    // 0x10 + 1
        value: 0xc0
      }
    });
  });

  it("should parse turnout position P0", () => {
    const payload = Buffer.from([0x00, 0x00, 0x40, 0x00, 0x43, 0x00, 0x7a, 0x01, 0x38]);
    const result = parser.parse(payload);
    expect(result).toEqual({
      type: "accessoryInfo",
      value: { address: 123, position: "P0" }
    });
  });

  it("should parse turnout position P1", () => {
    // Structure : [0x00, 0x00, 0x40, 0x00, 0x43, adrMsb, adrLsb, turnoutStatus, ...]
    // Address 123 : adrMsb = 0x00, adrLsb = 0x7a, turnoutStatus = 0x02 (P1)
    const payload = Buffer.from([0x00, 0x00, 0x40, 0x00, 0x43, 0x00, 0x7a, 0x02, 0x38]);
    const result = parser.parse(payload);
    expect(result).toEqual({
      type: "accessoryInfo",
      value: { address: 123, position: "P1" }
    });
  });

  it("should parse turnout position not_switched", () => {
    const payload = Buffer.from([0x00, 0x00, 0x40, 0x00, 0x43, 0x00, 0x7a, 0x00]);
    const result = parser.parse(payload);
    expect(result).toEqual({
      type: "accessoryInfo",
      value: { address: 123, position: "not_switched" }
    });
  });

  it("should parse turnout position invalid", () => {
    const payload = Buffer.from([0x00, 0x00, 0x40, 0x00, 0x43, 0x00, 0x7a, 0x03]);
    const result = parser.parse(payload);
    expect(result).toEqual({
      type: "accessoryInfo",
      value: { address: 123, position: "invalid" }
    });
  });

});

