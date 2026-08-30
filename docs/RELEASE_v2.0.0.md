# Release v2.0.0

Date: 2026-08-30

Unified feedback-bus support (R-BUS, LocoNet, CAN) plus initial-state poll
commands. Implements [#14](https://github.com/nmeunier/z21-client/issues/14).
Decoding `LAN_SYSTEMSTATE_DATACHANGED` / `LAN_RAILCOM_DATACHANGED` is tracked
separately in [#16](https://github.com/nmeunier/z21-client/issues/16).

## Breaking changes

- The `feedback` event is replaced by `occupancy`. Payload is now
  `{ bus: "rbus" | "loconet" | "can", channels: { address, channel, occupied, nid? }[] }`.
  R-BUS emits a full 80-channel snapshot per group (free channels included);
  LocoNet and CAN emit one channel per detector message. Diff against the
  previous snapshot yourself if you need transitions.
- `setBroadcastFlags(engine, accessory, feedback)` becomes
  `setBroadcastFlags(options?: BroadcastFlagsOptions)` — an options object
  applied over the historical default `0x07` (`driving | rbus | railcom`):
  `true` adds a flag, `false` removes it, an omitted field leaves it. The
  no-argument call still emits `0x07`. Map the old positional booleans by
  name: `engine` → `driving`, `accessory` → `rbus`, `feedback` → `railcom`
  (the 1.x names were misleading — `accessory` actually toggled R-BUS and
  `feedback` toggled RailCom). `(true, true, true)` → `setBroadcastFlags()`.
- `getBroadcastFlags()` result fields renamed: `engine/accessory/feedback` →
  `driving/rbus/railcom`, plus new `systemState`, `loconetDetector`,
  `canDetector` (`raw` unchanged). The `broadcastFlags` **event** value
  carries the same renamed shape.
- Removed types `FeedbackModuleStatus`, `FeedbackResult`.

## Behavior changes

- A datagram that does not decode to any known message now emits an `error`
  event (`{ code: "invalid-payload", ... }`) instead of being silently
  dropped. Two cases: a detector frame (`LAN_RMBUS_DATACHANGED` /
  `LAN_LOCONET_DETECTOR` / `LAN_CAN_DETECTOR`) that is too short for its
  type, and any wholly-unparseable first datagram in a UDP packet (this
  restores the pre-`parseAll` behavior). **Attach an `"error"` listener** —
  Node's `EventEmitter` throws on an `error` event with no listener, so an
  app that previously ignored malformed traffic could now crash on upgrade.

## New features

- `occupancy` event for all three feedback buses (R-BUS, LocoNet, CAN).
- `transponder` event (**experimental, not tested on real hardware**) for
  LocoNet transponder / LISSY loco reports and CAN RailCom loco lists.
- Poll commands: `getRmbusData(groupIndex)`, `getLoconetDetector(type, reportAddress?)`
  (experimental), `getCanDetector(nid?)` (experimental). Each resolves
  `void`; the response arrives as an `occupancy` / `transponder` event.
- `FeedbackParser` now parses every dataset in a concatenated UDP datagram,
  not just the first.
- Exported `BroadcastFlag` bit constants (a reference for the
  `getBroadcastFlags()` `raw` field) and the `BroadcastFlagsOptions` type.
- New exported types: `OccupancyResult`, `OccupancyChannel`,
  `TransponderResult`, `TransponderChannel`, `FeedbackBus`, `TransponderBus`,
  `Direction`.

## Notes

- LocoNet (`LAN_LOCONET_DETECTOR`) and CAN (`LAN_CAN_DETECTOR`) decoding is
  implemented from the Z21 LAN protocol spec and covered by unit tests, but
  has not been validated against real hardware. R-BUS decoding is validated
  against a live Z21 (2-channel occupancy detector, DCC loco crossing both
  sections) and locked with a capture fixture.
- `nid` (CAN channels only) is the detector's fixed hardware CAN network id.
  `address` is its user-configurable module address; use `nid` to
  disambiguate if two modules share an `address`.
- `setBroadcastFlags({ systemState: true })` / `{ railcom: true }` enable the
  `LAN_SYSTEMSTATE_DATACHANGED` / `LAN_RAILCOM_DATACHANGED` broadcasts on the
  wire, but the library does not decode those frames yet — they are visible
  only on the raw `debug` event. See
  [#16](https://github.com/nmeunier/z21-client/issues/16).
- No change to the Node requirement: still `"engines": { "node": ">=22" }`.

## Files changed

- `src/parsers/detectorParser.ts`: **new** — decodes `LAN_RMBUS_DATACHANGED`
  (`0x80`), `LAN_LOCONET_DETECTOR` (`0xA4`), `LAN_CAN_DETECTOR` (`0xC4`) into
  `occupancy` / `transponder` results; exports `decodeLoconetDirection`,
  `decodeCanDirection`.
- `src/parsers/feedbackParser.ts`: route `0x80`/`0xA4`/`0xC4` to
  `DetectorParser`; add `parseAll` (split concatenated datasets, re-emit the
  parse error for a wholly-malformed datagram).
- `src/parsers/lanParser.ts`: drop the `0x80` case; reshape the `0x51`
  (`GET_BROADCAST_FLAGS`) result.
- `src/parsers/parserResult.ts`: add the occupancy/transponder result types
  and `FeedbackBus`/`TransponderBus`/`Direction`; reshape
  `BroadcastFlagsResultData`; remove `FeedbackModuleStatus`/`FeedbackResult`.
- `src/transport/Z21UdpTransport.ts`: emit one event per dataset via
  `parseAll`.
- `src/controllers/SystemController.ts`: options-object `setBroadcastFlags`;
  new `getRmbusData` / `getLoconetDetector` / `getCanDetector` with
  `RangeError` argument validation.
- `src/Z21Commands.ts`: `LAN_RMBUS_GETDATA` / `LAN_LOCONET_DETECTOR` /
  `LAN_CAN_DETECTOR` payloads; exported `BroadcastFlag`.
- `src/Z21Client.ts`: forward `occupancy` and `transponder` instead of
  `feedback`.
- `src/index.ts`: export the new public types, `BroadcastFlag`,
  `BroadcastFlagsOptions`.
- `tests/detectorParser.test.ts`: **new** — R-BUS / LocoNet / CAN decoding,
  direction helpers, and a real-hardware R-BUS capture fixture.
- `tests/feedbackParser.test.ts`, `tests/Z21Client.test.ts`,
  `tests/Z21ClientAccessory.test.ts`, `tests/Z21ClientProg.test.ts`: updated
  for the new event shapes, `parseAll`, `setBroadcastFlags`, and the poll
  commands.
- `exemples/*.ts`: `setBroadcastFlags()` (no args); `index.ts` listens on
  `occupancy` / `transponder`.
- `README.md`: rewritten intro (client / command-station framing), events
  table, poll methods, migration section, "Disclaimer & trademarks".
- `package.json`: `version` `2.0.0`; clearer `description`; keyword list
  trimmed 14 → 7.
- `.gitignore`: ignore `References/`.
