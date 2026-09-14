# Verification

Run `node --test tests/speech.test.cjs` for data and speech-input regression tests.

With a local static server on port 8000 and Playwright installed, run `node tests/browser.cjs`.
Set `PLAYWRIGHT_MODULE` to an existing Playwright installation if needed; `QUIZ_URL` can target a preview.
The browser suite checks familiar first questions, wrong/correct answer restoration after reload,
completion, collected-vehicle playback, mute restoration, all 63 question/replay inputs,
invalid saved data, narrow layouts and keyboard focus. Screenshots go to `/tmp/`.

These tests intercept speech synthesis. They verify text sent to the engine, **not the audible
pronunciation or accent**. Kana avoids ambiguous kanji readings but cannot guarantee identical
pronunciation across system voices. The previously reported mispronunciation still needs the
specific vehicle, device and voice to reproduce and confirm aurally. Do not label it fully resolved
based on passing these tests. No preschool child usability sessions or iPhone audio tests have been run.

Progress and mute preferences use sessionStorage (same browser tab). Storage failures do not prevent
play, but progress then remains in memory only. Nothing is sent to a server.
