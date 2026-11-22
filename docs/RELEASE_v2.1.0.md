# Release v2.1.0

Date: 2026-11-22

## Changes

- `engines.setDriveEngine()` now returns the promise of its send (`Promise<void>` instead of `void`). Closes [#17](https://github.com/nmeunier/z21-client/issues/17).
  - It resolves as soon as the UDP datagram has left the machine. It does **not** wait for any answer from the Z21: the engine state still comes back through the broadcasts, so fire-and-forget speed commands stay as fast as before.
  - It rejects only on a local send failure (socket closed, no network route). Over UDP, a resolved promise does **not** mean the Z21 received or applied the command: that is only known from the broadcasts, as before.
  - Fire-and-forget is safe: the library observes the promise itself, so a failure nobody awaits never surfaces as an unhandled rejection. Before, a single failed speed send could end a Node process (Node's default `unhandledRejection` behaviour).
- The other commands were checked: they already await their send or handle its failure.
- No breaking change: code that ignored the (void) return value keeps compiling and behaving the same, minus the crash.

## Files changed

- `src/controllers/EngineController.ts`: `setDriveEngine` returns the send promise, observed internally.
- `tests/Z21ClientDrive.test.ts`: resolve on send, reject with the send error, no unhandled rejection when ignored.
- `README.md`: `setDriveEngine` return value documented.
- `package.json`, `package-lock.json`: version `2.1.0`.
