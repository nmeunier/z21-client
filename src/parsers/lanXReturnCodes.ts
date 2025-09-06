export const LAN_X_BC_CODES = {
  LAN_X_BC_TRACK_POWER_OFF: 0x00, // Track power off
  LAN_X_BC_TRACK_POWER_ON: 0x01,  // Track power on
  LAN_X_BC_PROGRAMMING_MODE: 0x02, // Programming mode active
  LAN_X_BC_TRACK_SHORT_CIRCUIT: 0x08, // Track short-circuit
  LAN_X_CV_NACK_SC: 0x12, // CV Read Write NACK short-circuit
  LAN_X_CV_NACK: 0x13, // CV Read Write NACK
} as const;

export type LanXBCCode = typeof LAN_X_BC_CODES[keyof typeof LAN_X_BC_CODES];