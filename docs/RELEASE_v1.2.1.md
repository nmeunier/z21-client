# Release v1.2.1

Date: 2026-07-26

## Changes

- Fixed `system.emergencyStop()`: `LAN_X_SET_STOP` was missing the `[0x40, 0x00]` LAN_X header present on every other XpressNet command in this library, so the Z21 silently ignored the malformed packet and emergency stop had no effect on the track. Closes [#5](https://github.com/nmeunier/z21-client/issues/5).
- Added support for `LAN_X_BC_STOPPED` (opcode `0x81`): the Z21 broadcasts this immediately after a global emergency stop, distinct from track power state (track voltage stays present on the rail). It now surfaces as a dedicated `"stopped"` event instead of being dropped as an unknown broadcast. Closes [#6](https://github.com/nmeunier/z21-client/issues/6).
- Validated end-to-end against a real Z21 command station: `emergencyStop()` now triggers a `"Emergency Stop Activated"` status update and a `"stopped"` event, with `"trackPower"` correctly staying `"on"` throughout.
- Added `exemples/emergencyStop.ts`, demonstrating the emergency stop flow and the new `"stopped"` event.
- No breaking changes versus v1.2.0.

## Files changed

- `src/Z21Commands.ts`: corrected the `LAN_X_SET_STOP` payload.
- `src/parsers/parserResult.ts`: added the `StoppedResult` type.
- `src/parsers/lanXParser.ts`: parse `LAN_X_BC_STOPPED` (opcode `0x81`).
- `src/transport/Z21UdpTransport.ts`: guard against parser results with no `value` field.
- `src/Z21Client.ts`: forward the `"stopped"` transport event.
- `tests/Z21Client.test.ts`, `tests/feedbackParser.test.ts`: added/updated coverage.
- `README.md`: documented the `"stopped"` event.
- `exemples/emergencyStop.ts`: new example script.
