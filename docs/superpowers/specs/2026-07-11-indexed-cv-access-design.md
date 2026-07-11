# Indexed CV Access (CV31/CV32 Page Registers) — Design

## Context

Issue: [#3 - feat: Support indexed CV access (CV31/CV32 page registers)](https://github.com/nmeunier/z21-client/issues/3)

`EngineController` currently exposes `cvRead(cv)` / `cvWrite(cv, value)` for direct-mode CV access
(CV 1-1024). Modern decoders (e.g. ESU LokSound 5) additionally implement the NMRA indexed CV
addressing scheme (S-9.2.2 Appendix B) to expose configuration beyond the direct-mode range:

1. Write the index high byte to CV31
2. Write the index low byte to CV32
3. Read/write the target CV in the window 257-512 (1-based, user-facing); the actual value
   accessed depends on the CV31/CV32 index currently set

For ESU LokSound 5 specifically, CV31 is fixed at `16` and CV32 selects a page (`0`-`4`) exposing
sound/config CVs in the 257-511 window (confirmed against the LokSound 5 manual, section 12.2.1).

## API

Two new async methods on `EngineController`, alongside `cvRead`/`cvWrite`:

```ts
public async cvReadIndexed(indexHigh: number, indexLow: number, cv: number): Promise<CvResultData>
public async cvWriteIndexed(indexHigh: number, indexLow: number, cv: number, value: number): Promise<CvResultData>
```

## Behavior

Both methods perform the same 3-step sequence, reusing the existing `cvWrite`/`cvRead` methods
rather than duplicating XpressNet frame-building logic (the Z21 LAN_X protocol only supports one
CV operation per frame, so there is no lower-level "batched" alternative):

```ts
await this.cvWrite(31, indexHigh);
await this.cvWrite(32, indexLow);
return this.cvRead(cv);        // cvReadIndexed
return this.cvWrite(cv, value); // cvWriteIndexed
```

### Validation

- `indexHigh`, `indexLow`: must be in `[0, 255]`, else throw `Error` (mirrors existing
  `functionNumber` validation style in `setEngineFunctions`).
- `cv`: must be in `[257, 512]` (1-based, user-facing NMRA indexed window), else throw `Error`.
  This is stricter than `cvRead`/`cvWrite` (which don't validate range) to prevent silent
  confusion between direct-mode and indexed-mode CV numbers.

Validation happens before any network I/O.

### Error propagation

If writing CV31 or CV32 fails (NACK or timeout), the `await` rejects and the sequence aborts
immediately — the target CV read/write is never attempted. This avoids sending a CV operation
against an index that may not have been set correctly.

## Testing

Unit tests added to `tests/Z21ClientProg.test.ts`, following the existing mocked-UDP-socket
pattern used for `cvRead`/`cvWrite`:

- `cvReadIndexed` resolves with the target CV's value after all 3 steps succeed
- `cvWriteIndexed` resolves with the target CV's value after all 3 steps succeed
- NACK on the CV31 write rejects immediately without attempting CV32 or the target CV
- Range validation errors for `indexHigh`/`indexLow` outside `[0, 255]` and `cv` outside `[257, 512]`

### Real hardware validation

A real Z21 command station (192.168.0.215) with an ESU LokSound 5 decoder on the programming
track is available for manual validation. After unit tests pass, run
`cvReadIndexed(16, 0, 257)` against it to confirm the 3-step sequence works against real hardware
(read-only — no write validation against the physical decoder, to avoid altering its
configuration).

## Documentation

README.md, Engine Controller section: document `cvReadIndexed` and `cvWriteIndexed`, referencing
the NMRA indexed CV mechanism and the ESU LokSound use case (decoder identification / extended
configuration).
