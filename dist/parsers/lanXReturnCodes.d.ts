export declare const LAN_X_BC_CODES: {
    readonly LAN_X_BC_TRACK_POWER_OFF: 0;
    readonly LAN_X_BC_TRACK_POWER_ON: 1;
    readonly LAN_X_BC_PROGRAMMING_MODE: 2;
    readonly LAN_X_BC_TRACK_SHORT_CIRCUIT: 8;
    readonly LAN_X_CV_NACK_SC: 18;
    readonly LAN_X_CV_NACK: 19;
};
export type LanXBCCode = typeof LAN_X_BC_CODES[keyof typeof LAN_X_BC_CODES];
