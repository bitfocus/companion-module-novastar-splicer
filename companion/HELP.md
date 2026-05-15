## Novastar H Series Splicer

Control module for Novastar H Series video wall splicers (H2, H5, H9, H15, H20). Communicates via UDP on port 6000 using the Novastar H Series Control Protocol V1.0.19.

## Configuration

| Field | Notes |
|---|---|
| IP Address | The splicer's IP. |
| Port | Default 6000. |
| Poll Interval (ms) | How often the module polls the device, 500-30000 ms, default 1000. Lower = more responsive feedback, higher = less UDP traffic. |
| Enable Offline Programming Mode | Synthesize a virtual device so the full action / feedback / variable / preset surface works without hardware. |
| Number of Screens | Used in offline mode to populate the synthetic screen list (1-40). Overridden by the device when connected. |
| Number of Input Cards | Used in offline mode to populate input source entries (1-40, each card has 4 connectors). |
| Enable Input Signal Polling | Optional. Polls R0102 once per slot per tick and exposes per-connector signal-state variables and feedback. Default off. |

## Actions

| Action | Description |
|---|---|
| Select Screen | Select / deselect a screen for the legacy select-then-act actions. |
| Select Layer | Select a layer on a screen. |
| Preset | Recall a preset on a specific screen. |
| Preset Group | Play a preset collection. |
| **Brightness + (Direct)** | Per-screen +1% brightness on the chosen screen, no select required. |
| **Brightness - (Direct)** | Per-screen -1% brightness on the chosen screen, no select required. |
| **Set Brightness** | Set absolute brightness 0-100 on a specific screen. Supports variables. |
| **Save Brightness** | Save current brightness on a specific screen to the LED receiving card so it survives a reboot. |
| Screen Brightness Add | Legacy: increase brightness by 1% on every selected screen. |
| Screen Brightness Minus | Legacy: decrease brightness by 1% on every selected screen. |
| **Freeze (Direct)** | Enable / disable freeze on a specific screen. |
| Screen FRZ | Legacy: freeze / unfreeze every selected screen. |
| Layer FRZ | Freeze / unfreeze the active layer. |
| **FTB (Direct)** | Enable / disable fade-to-black on a specific screen. |
| FTB | Legacy: FTB across selected screens. |
| **BKG (Direct)** | Toggle background on a specific screen. |
| BKG | Legacy: BKG on selected screens. |
| **OSD (Direct)** | Toggle OSD text or OSD image on a specific screen. |
| OSD | Legacy: OSD on selected screens. |
| **Test Pattern (Direct)** | Toggle test pattern on a specific screen. |
| Test Pattern | Legacy: test pattern across selected outputs. |
| PGM/PVW | Switch between PGM and PVW mode for selected screens. |
| Take | Take from PVW to PGM. |
| Source Switch | Switch input source on the selected layer. |
| Volume Switch | Enable / disable volume. |
| Screen Volume Add / Minus | Increase / decrease volume. |
| Apply Screen Volume | Set an absolute volume value. |
| **Blackout (Global)** | Blackout every screen at once via the W0700 global command. Distinct from per-screen FTB. |
| Send Command | Send a raw protocol command, for debugging or commands the module doesn't expose. |

Actions in **bold** are the new per-screen / direct variants. They target one specific screen without touching the selected-screens set, so a forgotten deselect can't redirect the next press to the wrong screen.

## Feedbacks

| Feedback | Description |
|---|---|
| Select Screen | True when the screen is selected. |
| Select Layer | True when the layer is selected. |
| Preset Loaded | True when a preset is loaded on a screen. |
| Preset Group Selection Detection | True when a preset group is selected. |
| PGM/PVW Status Detection | True for the active PGM / PVW mode. |
| Take Status Detection | True while a take is active. |
| FTB Status Detection | Legacy: true when FTB is on (any screen). |
| **FTB State (Direct)** | Per-screen: true when FTB is on for the chosen screen. |
| Freeze Screen | Legacy: true when any selected screen is frozen. |
| **Freeze State (Direct)** | Per-screen: true when the chosen screen is frozen. |
| Freeze Layer | True when the selected layer is frozen. |
| **Brightness Matches Value (Direct)** | True when a chosen screen's brightness equals the configured value. Used to highlight the active brightness preset. |
| Input Source Selection Detection | True when the input source matches. |
| Volume On/Off Status Detection | Volume state. |
| Test Pattern On/Off Status Detection | Legacy: test pattern state. |
| **Test Pattern State (Direct)** | Per-screen test pattern state. |
| BKG Status Detection | Legacy: BKG state. |
| **BKG State (Direct)** | Per-screen BKG state. |
| OSD Status Detection | Legacy: OSD state. |
| **OSD Text State (Direct)** | Per-screen OSD text state. |
| **OSD Image State (Direct)** | Per-screen OSD image state. |
| **Input Signal Active** | True when the selected input connector has signal (R0102 iSignal=1). Only registered when input signal polling is enabled in config. |

Feedbacks in **bold** are direct per-screen variants. They read the per-screen state directly from `enhancedState`, so a button for screen 2 reports screen 2's state regardless of what is selected.

## Variables

Per-screen (`X` is the 1-based screen number):

| Variable | Value |
|---|---|
| `screenId_X` | Screen name (note: this one uses 0-based screen ID, e.g. `screenId_0` for screen 1, kept for backward compat). |
| `screen_X_brightness` | Current brightness 0-100. |
| `screen_X_frozen` | `On` / `Off`. |
| `screen_X_ftb` | `On` / `Off`. |
| `screen_X_bkg` | `On` / `Off`. |
| `screen_X_osd_text` | `On` / `Off`. |
| `screen_X_osd_image` | `On` / `Off`. |
| `screen_X_test_pattern` | `On` / `Off`. |
| `screen_X_layer_Y` | Layer name for layer `Y` on screen `X`. |
| `screen_X_preset_Y` | Preset name for preset `Y` on screen `X`. |

Other:

| Variable | Value |
|---|---|
| `connection_state` | `Online` / `Offline Programming` / `Disconnected`. |
| `presetCollectionId_X` | Preset group name. |
| `source_{inputId}_{cropId}` | Input source name. |
| `input_N_M_signal` | `Active` or `No Signal` for the connector on slot N, connector M (1-based). Only emitted when input signal polling is enabled. |

## Presets

Categories visible in the preset picker:

| Category | Contents |
|---|---|
| Screen | Select-Screen toggles (one per screen). |
| Layer | Select-Layer toggles (per layer per screen). |
| Preset | Preset recall (per preset per screen). |
| Preset Group | Preset Group recall. |
| Source List | Source-switch buttons (per input). |
| Display | Global PGM/PVW, Take, FTB, Volume Switch, Screen FRZ, Layer FRZ, Volume +/-, Brightness +/- (legacy), Test Pattern, BKG, OSD Text, OSD Image, **Blackout (W0700 global)**. |
| **Brightness** | Per-screen Bright + / Bright -, plus per-screen fixed levels in 5% steps (100 / 95 / 90 / ... / 5 / 0 — 21 levels per screen). Each level button runs **Set Brightness then Save Brightness with a 50 ms delay** so the device has time to apply the new value before persisting it. Highlighted by the `brightness_match` feedback when the current level matches. |
| **Per-Screen Direct** | Per-screen Freeze / FTB / BKG / OSD Text / OSD Image / Test Pattern / PGM/PVW / Take, each with the matching direct feedback for live state highlighting. |

## Offline Programming Mode

Flip the toggle when the splicer isn't on the network. The module reports `Ok / Offline Programming Mode`, synthesizes a virtual screen / layer / preset / source tree from the configured screen and input-card counts, and exposes the full action / feedback / variable surface. Build buttons against it before the show, then turn the toggle off and connect to the real device.

Toggling offline mode off while a host is configured restores the live device data within one poll cycle. No restart required.

## Input Signal Polling

Off by default. When enabled, the module sends an R0102 (`Get Slot Information`) per installed slot on each poll tick. Each response returns `iSignal` for all four connectors on that slot, so one call covers four inputs. The set of slots is derived from the existing source list, so only installed slots are polled. Per the protocol, `iSignal = 1` means an active signal source; values 0 and 2 are treated as no signal.

This surfaces:

- A new variable per connector: `input_N_M_signal` with value `Active` or `No Signal`.
- A new boolean feedback **Input Signal Active** with a per-connector dropdown.

Leave the toggle off if you don't need cable-state feedback on a button — the feature is dead code (no extra UDP packets, no variables, no feedback) when disabled.
