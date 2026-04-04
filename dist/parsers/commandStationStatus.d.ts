export declare const CS_STATUS: {
    readonly CS_EMERGENCY_STOP: 1;
    readonly CS_TRACK_VOLTAGE_OFF: 2;
    readonly CS_SHORT_CIRCUIT: 4;
    readonly CS_PROGRAMMING_MODE_ACTIVE: 32;
};
export type CommandStationStatusFlag = typeof CS_STATUS[keyof typeof CS_STATUS];
