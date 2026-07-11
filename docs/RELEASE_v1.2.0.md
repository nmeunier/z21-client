# Release v1.2.0

Date: 2026-07-11

## Changes

- Added `engines.cvReadIndexed(indexHigh, indexLow, cv)` and `engines.cvWriteIndexed(indexHigh, indexLow, cv, value)` to `EngineController`, implementing NMRA indexed CV access (CV31/CV32 page registers, per NMRA S-9.2.2). This lets callers read/write CVs beyond the direct-mode range (257-512 window) by first writing the index registers CV31/CV32, then reading/writing the target CV. Closes [#3](https://github.com/nmeunier/z21-client/issues/3).
- Validated end-to-end against a real Z21 command station with an ESU LokSound 5 micro DCC decoder: reading CV261-264 with `indexHigh=0, indexLow=255` (RailCom manufacturer page) correctly returned the decoder's ESU Product ID (0x010000BD / 16777405), matching the decoder's known reference value.
- Added `exemples/indexedCv.ts`, demonstrating indexed CV access by reading and decoding an ESU decoder's Product ID.
- `cvRead`/`cvWrite` (and, by extension, each internal step of `cvReadIndexed`/`cvWriteIndexed`) are now serialized through an internal queue, so at most one CV operation is ever in flight at a time. Previously, concurrent calls could cross-resolve each other's listeners (since responses are correlated only by CV number on a shared transport event emitter), silently returning data for the wrong CV, or have an unrelated NACK wrongly reject an unrelated in-flight call. `cvReadIndexed`/`cvWriteIndexed` now run their whole 3-step sequence as a single atomic unit, so no other queued CV operation can interleave with their page selection.
- `cvReadIndexed`/`cvWriteIndexed` now validate that `indexHigh`, `indexLow`, and `cv` are integers (previously `NaN` or fractional values silently bypassed range validation, causing either silent CV corruption or an indefinite hang until timeout). `cvWriteIndexed`'s `value` parameter is now validated to `0-255` as well (previously unchecked and silently truncated modulo 256 on the wire with no error).
- `cvRead`/`cvWrite`'s declared return type is narrowed to `Promise<CvResultData>` (they only ever resolve on success and always reject otherwise; the `ErrorResultData` half of the previous union type was unreachable). No runtime behavior change.
- The README's top-level usage example now includes `try/catch` and a `z21.on("error", ...)` listener; previously it would crash the Node process on the first CV NACK.
- No breaking changes versus v1.1.2: all changes are additive (`cvReadIndexed`/`cvWriteIndexed` are new) or behavior-preserving for correctly-`await`ed callers (the CV operation serialization only changes the behavior of code that was already firing concurrent, un-awaited `cvRead`/`cvWrite` calls with undefined results).

## Files changed

- `src/controllers/EngineController.ts`: added `validateIndexedCvParams`, `selectIndexPage`, `cvReadIndexed`, `cvWriteIndexed`, and the `cvQueue`/`enqueueCv` serialization mechanism used by `cvRead`/`cvWrite` and the new indexed methods.
- `tests/Z21ClientProg.test.ts`: added unit tests for indexed CV access (success, validation, NACK abort) and for CV operation serialization.
- `README.md`: documented the two new methods and added error handling to the usage example.
- `exemples/indexedCv.ts`: new example script.
