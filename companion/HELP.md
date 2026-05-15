## Novastar H Series Splicer

Control module for Novastar H Series video wall splicers (H2, H5, H9, H15, H20). Communicates via UDP on port 6000 using the Novastar H Series Control Protocol V1.0.19.

## Configuration

| Field | Notes |
|---|---|
| IP Address | The splicer's IP. |
| Port | Default 6000. |
| Poll Interval (ms) | How often state is polled, 500-30000 ms, default 1000. Lower is more responsive, higher reduces UDP load. |
| Enable Offline Programming Mode | Synthesize a virtual device for pre-show button building without hardware on the network. |
| Number of Screens | Used in offline mode to populate the synthetic screen list (1-40). Overridden by the device when connected. |
| Number of Input Cards | Used in offline mode to populate input source entries (1-40, each card has 4 connectors). |
| Enable Input Signal Polling | Optional. Polls R0102 once per slot on each tick and exposes per-connector signal-state variables and feedback. Default off. |

## Actions

### Selection
- **Select Screen** — add a screen to the selected set (legacy select-then-act workflow).
- **Select Layer** — set the active layer within a screen.

### Per-screen direct (no select required)
- **Brightness + (Direct)** / **Brightness - (Direct)** — adjust a chosen screen's brightness by 1%.
- **Set Brightness** — set a chosen screen's brightness to an absolute value (0-100). Supports variables.
- **Save Brightness** — write the chosen screen's current brightness to the LED receiving card so it survives a reboot.
- **Freeze (Direct)** — freeze / unfreeze a chosen screen.
- **FTB (Direct)** — fade-to-black a chosen screen.
- **BKG (Direct)** — toggle the background on a chosen screen.
- **OSD (Direct)** — toggle OSD text or OSD image on a chosen screen.
- **Test Pattern (Direct)** — toggle the test pattern on a chosen screen.

### Per-selection actions (legacy, operate on Selected screens)
- **Screen Brightness Add / Minus** — +/- 1% on every selected screen.
- **Screen FRZ** — freeze / unfreeze all selected screens.
- **Layer FRZ** — freeze / unfreeze the selected layer.
- **Screen Volume +/-**, **Apply Screen Volume**, **Volume Switch** — audio controls.
- **PGM/PVW**, **Take** — apply program/preview mode and take across selected screens.
- **BKG**, **OSD**, **Test Pattern** — toggle on selected screens.
- **FTB**, **Source Switch**.

### Other
- **Load Preset** — recall a preset on a specific screen.
- **Play Preset Group** — recall a preset group.
- **Blackout (Global)** — blackout every screen on the device at once (W0700).
- **Send Command** — send a raw protocol command for testing.

## Feedbacks

### Per-screen direct (read live per-screen state)
- **Brightness Matches Value (Direct)** — boolean when the screen's brightness equals a value.
- **Freeze State (Direct)** / **FTB State (Direct)** / **BKG State (Direct)** — boolean per-screen state.
- **OSD Text State / OSD Image State / Test Pattern State (Direct)** — boolean per-screen state.

### Selection-based
- **Select Screen** / **Select Layer** — true when matched.
- **Screen FRZ / Layer FRZ** (legacy).
- **PGM/PVW Status Detection** — true on the active mode.
- **Take Status Detection**, **Preset Group Selection Detection**, **Source Switch Detection**, **Preset Loaded**.
- **FTB / Volume / Test Pattern / BKG / OSD** legacy state detection.

### Input
- **Input Signal Active** — boolean true when the selected input connector has signal (R0102 iSignal=1). Only registered when input signal polling is enabled.

## Variables

- `screenId_N` — name of screen N (0-indexed).
- `screen_N_brightness` / `_frozen` / `_ftb` / `_bkg` / `_osd_text` / `_osd_image` / `_test_pattern` — per-screen state (1-indexed).
- `source_{inputId}_{cropId}` — input source labels for source-switch feedback / preset display.
- `input_N_M_signal` — `Active` or `No Signal` per connector (1-indexed slot N, connector M). Only emitted when input signal polling is enabled.
- `connection_state` — `Online`, `Offline Programming`, or `Disconnected`.

## Presets

Available preset categories in the picker:

- **Screen** — Select-Screen toggles, one per screen.
- **Layer** — Select-Layer toggles per layer per screen.
- **Preset** — Preset recall per screen.
- **Preset Group** — Preset Group recall.
- **Source List** — Source-switch per input.
- **Display** — global PGM/PVW, Take, FTB, Volume, Volume +/-, Brightness +/- (legacy globals), Test Pattern, BKG, OSD, **Blackout**.
- **Brightness** — per-screen Bright + / Bright - / 100% / 95% / 90% / ... / 5% / 0% (21 levels per screen). The fixed-level presets also call Save Brightness so the value survives a reboot. Highlighted by the `brightness_match` feedback when the level matches the live screen brightness.
- **Per-Screen Direct** — per-screen Freeze / FTB / BKG / OSD Text / OSD Image / Test Pattern / PGM/PVW / Take buttons with matching direct feedbacks.

## Offline Programming Mode

Toggle on when the splicer isn't on the network. The module reports `Ok / Offline Programming Mode`, synthesizes a virtual screen / layer / preset / source tree from the configured screen and input-card counts, and exposes the full action / feedback / variable surface. Build buttons against it before the show, then turn the toggle off and connect to the real device.

Toggling off while connected restores the live device data within one poll cycle.

## Input Signal Polling

Off by default. When enabled, the module sends an R0102 (`Get Slot Information`) per installed slot on each poll tick. Each response returns `iSignal` for all four connectors on that slot, so one call covers four inputs. The set of slots is derived from the existing source list, so only installed slots are polled. Per the protocol, `iSignal = 1` means an active signal source; values 0 and 2 are treated as no signal.

This surfaces:

- A new variable per connector: `input_N_M_signal` with value `Active` or `No Signal`.
- A new boolean feedback `Input Signal Active` with a per-connector dropdown.

Leave the toggle off if you don't need cable-state feedback on a button — the feature is dead code (no extra packets, no variables, no feedback) when disabled.
