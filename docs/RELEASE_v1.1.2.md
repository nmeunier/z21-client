# Release v1.1.2

Date: 2026-04-05

## Changes

- Fixed incorrect function byte encoding in `setEngineFunctions`. The DB3 byte was using a bitmask (`1 << (functionNumber - 1)`) instead of the raw function index, causing wrong function mapping for F3–F28. Now correctly encodes bits 7–6 as the switch type and bits 5–0 as the function index, per Z21 LAN Protocol v1.13 §4.2.

## Files changed

- `src/controllers/EngineController.ts`: corrected function byte encoding in `setEngineFunctions`.