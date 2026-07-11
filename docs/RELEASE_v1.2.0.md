# Release v1.2.0

Date: 2026-07-11

## Changes

- Added `engines.cvReadIndexed(indexHigh, indexLow, cv)` and `engines.cvWriteIndexed(indexHigh, indexLow, cv, value)` to `EngineController`, implementing NMRA indexed CV access (CV31/CV32 page registers, per NMRA S-9.2.2). This lets callers read/write CVs beyond the direct-mode range (257-512 window) by first writing the index registers CV31/CV32, then reading/writing the target CV. Closes [#3](https://github.com/nmeunier/z21-client/issues/3).
- Validated end-to-end against a real Z21 command station with an ESU LokSound 5 micro DCC decoder: reading CV261-264 with `indexHigh=0, indexLow=255` (RailCom manufacturer page) correctly returned the decoder's ESU Product ID (0x010000BD / 16777405), matching the decoder's known reference value.
- Added `exemples/indexedCv.ts`, demonstrating indexed CV access by reading and decoding an ESU decoder's Product ID.

## Files changed

- `src/controllers/EngineController.ts`: added `validateIndexedCvParams`, `cvReadIndexed`, `cvWriteIndexed`.
- `tests/Z21ClientProg.test.ts`: added unit tests for indexed CV access (success, validation, NACK abort).
- `README.md`: documented the two new methods.
- `exemples/indexedCv.ts`: new example script.
