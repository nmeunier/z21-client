# Release v1.1.1

Date: 2026-02-08

## Changes

- Added a 30-second timeout to `cvRead` and `cvWrite` to prevent event listener leaks and reject stalled operations.
- Implemented cleanup of transport event listeners after resolve/reject for CV operations.

## Files changed

- `src/controllers/EngineController.ts`: added timeouts and listener cleanup for `cvRead` and `cvWrite`.
