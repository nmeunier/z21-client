export const CS_STATUS = {
  CS_EMERGENCY_STOP: 0x01,           // The emergency stop is switched on
  CS_TRACK_VOLTAGE_OFF: 0x02,        // The track voltage is switched off
  CS_SHORT_CIRCUIT: 0x04,            // Short-circuit
  CS_PROGRAMMING_MODE_ACTIVE: 0x20   // The programming mode is active
} as const;

export type CommandStationStatusFlag = typeof CS_STATUS[keyof typeof CS_STATUS];