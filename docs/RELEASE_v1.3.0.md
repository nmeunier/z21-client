# Release v1.3.0

Date: 2026-08-09

## Changes

- Added `accessories.setExtAccessory(address, aspect)`, implementing `LAN_X_SET_EXT_ACCESSORY` to drive extended accessory decoders (e.g. multi-aspect signals) per RCN-213 / Z21 LAN Protocol v1.13 §5.4. `address` is the user-facing address (1 = first extended accessory decoder), converted internally to the RCN-213 RawAddress (`address + 3`). Rejects address `2044` (RawAddress 2047), which RCN-213 reserves for the "emergency stop for extended accessory decoders" broadcast rather than addressing a single decoder. Closes [#8](https://github.com/nmeunier/z21-client/issues/8).
- Renamed `accessories.switchTurnout()` to `accessories.setBasicAccessory()` (it drives `LAN_X_SET_TURNOUT`, used for any basic accessory decoder - turnouts, decouplers, lights - not just turnouts). `switchTurnout` is kept as a deprecated alias for backward compatibility.
- Added parsing of `LAN_X_EXT_ACCESSORY_INFO` and a new `"extAccessoryInfo"` event, distinct from the existing `"accessoryInfo"` event used by basic turnouts, so no existing consumer's event shape changes.
- The request/reply opcodes (`0x54`/`0x44`) and the full-byte aspect (0-255) were verified against the official Z21 LAN Protocol spec v1.13 / RCN-213 and validated end-to-end against a real Z21 station - the opcodes and aspect width originally proposed in the issue (`0xA3`/`0xA4`, 5-bit aspect) were incorrect.
- Added `exemples/extAccessory.ts`, demonstrating `setBasicAccessory` and `setExtAccessory` together with the `accessoryInfo`/`extAccessoryInfo` events.
- Upgraded TypeScript from 5.9 to 6.0.3 (`tsconfig.json`: `moduleResolution` `"node"` -> `"bundler"`, explicit `"types": ["node", "jest"]`). TypeScript 7.x was investigated but isn't adoptable yet - see [#13](https://github.com/nmeunier/z21-client/issues/13).
- CI now runs on Node.js 22.x/24.x instead of 18.x/20.x, and `package.json` declares `"engines": { "node": ">=22" }`. GitHub Actions (`actions/checkout`, `actions/setup-node`, `codecov/codecov-action`, `softprops/action-gh-release`) bumped to versions that don't rely on the deprecated Node 20 Actions runtime.
- No breaking changes versus v1.2.1 for the library's public API: all changes are additive (`setExtAccessory`, `setBasicAccessory`, `extAccessoryInfo` are new; `switchTurnout` keeps working). Consumers running Node < 22 should stay on the previous release.

## Files changed

- `src/controllers/AccessoryController.ts`: added `setExtAccessory`, renamed `switchTurnout` to `setBasicAccessory` (with `switchTurnout` kept as an alias).
- `src/parsers/parserResult.ts`, `src/parsers/lanXParser.ts`: added `ExtAccessoryInfoResult` and `LAN_X_EXT_ACCESSORY_INFO` (opcode `0x44`) parsing.
- `src/Z21Client.ts`: forward the new `"extAccessoryInfo"` event.
- `tests/Z21ClientAccessory.test.ts`, `tests/feedbackParser.test.ts`: added coverage for `setExtAccessory`, `setBasicAccessory`/`switchTurnout`, and `extAccessoryInfo` parsing, including all validation failure branches.
- `exemples/extAccessory.ts`: new example script.
- `tsconfig.json`, `package.json`, `package-lock.json`: TypeScript 6.0.3, `@typescript-eslint/*` 8.66.0, `engines.node`.
- `.github/workflows/tests.yml`, `.github/workflows/publish.yml`: Node 22.x/24.x matrix, GitHub Actions version bumps.
- `README.md`: documented the new methods, events, and updated TypeScript/Node.js badges.
