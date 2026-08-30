# Release v2.0.0

## Breaking changes

- The `feedback` event is replaced by `occupancy`. Payload is now
  `{ bus: "rbus" | "loconet" | "can", channels: { address, channel, occupied, nid? }[] }`.
  R-BUS emits a full 80-channel snapshot per group (free channels included);
  diff against the previous snapshot yourself if you need transitions.
- `setBroadcastFlags(engine, accessory, feedback)` becomes
  `setBroadcastFlags(flags?: number | BroadcastFlagsOptions)`. The no-argument
  call still emits `0x07`. Pass `BroadcastFlag.*` bits for full control.
- `getBroadcastFlags()` result fields renamed:
  `engine/accessory/feedback` → `driving/rbus/railcom`, plus new
  `systemState`, `loconetDetector`, `canDetector`.
- Removed types `FeedbackModuleStatus`, `FeedbackResult`.

## New features

- `occupancy` event for all three feedback buses (R-BUS, LocoNet, CAN).
- `transponder` event (**experimental, not tested on real hardware**) for
  LocoNet transponder / LISSY loco reports and CAN RailCom loco lists.
- Poll commands: `getRmbusData(groupIndex)`, `getLoconetDetector(type, reportAddress?)`
  (experimental), `getCanDetector(nid?)` (experimental).
- `FeedbackParser` now parses every dataset in a concatenated UDP datagram.
- Exported `BroadcastFlag` bit constants.

## Notes

- LocoNet (`LAN_LOCONET_DETECTOR`) and CAN (`LAN_CAN_DETECTOR`) decoding is
  implemented from the Z21 LAN protocol spec and covered by unit tests, but
  has not been validated against real hardware.
