/**
 * Commands payloads (no length)
 */
export const commands = {
  LAN_LOGOFF: [0x40, 0x00, 0x30, 0x00],
  LAN_GET_SERIAL_NUMBER: [0x10, 0x00],
  LAN_GET_BROADCAST_FLAGS: [0x51, 0x00],
  LAN_SET_BROADCAST_FLAGS: [0x50, 0x00],

  LAN_X_GET_STATUS: [0x40, 0x00, 0x21, 0x24, 0x05],
  LAN_X_GET_VERSION: [0x40, 0x00, 0x21, 0x21, 0x00],
  LAN_X_TRACK_POWER_OFF: [0x40, 0x00, 0x21, 0x80, 0xa1],
  LAN_X_TRACK_POWER_ON: [0x40, 0x00, 0x21, 0x81, 0xa0],
  LAN_X_SET_STOP: [0x40, 0x00, 0x80, 0x80],

  LAN_RMBUS_GETDATA: [0x81, 0x00],
  LAN_LOCONET_DETECTOR: [0xa4, 0x00],
  LAN_CAN_DETECTOR: [0xc4, 0x00],
};

/** Bit values for LAN_SET_BROADCASTFLAGS (Z21 §2.16), 32-bit little endian on the wire. */
export const BroadcastFlag = {
  DRIVING:          0x00000001, // loco info, turnout info, power broadcasts
  RBUS:             0x00000002, // LAN_RMBUS_DATACHANGED
  RAILCOM:          0x00000004, // RailCom for subscribed locos
  SYSTEM_STATE:     0x00000100, // LAN_SYSTEMSTATE_DATACHANGED
  RAILCOM_ALL:      0x00040000, // RailCom for all locos (FW >= 1.29)
  CAN_BOOSTER:      0x00020000, // CAN booster status (FW >= 1.41)
  CAN_DETECTOR:     0x00080000, // LAN_CAN_DETECTOR (FW >= 1.30)
  LOCONET_DETECTOR: 0x08000000, // LAN_LOCONET_DETECTOR (FW >= 1.22)
} as const;
