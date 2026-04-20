# companion-module-novastar-splicer

<<<<<<< Updated upstream
=======
Control module for Novastar H Series video wall processors (H2, H5, H9, H15, H20) via Bitfocus Companion.

## Requirements

- **Companion 4.3 or later** (uses preset template system and `@companion-module/base` 2.0.0)

## Features

- **22 actions** covering full H Series control: presets, brightness, freeze, FTB, PGM/PVW, take, source switching, test patterns, BKG, OSD, volume, blackout
- **21 feedbacks** with both state-tracking and direct per-screen feedback types
- **Real-time variables** for all screen states (brightness, freeze, FTB, BKG, OSD, test pattern)
- **Offline programming mode** with configurable screen count (1-40) and input card count (1-40, 4 connectors each)
- **Brightness template presets** using Companion 4.3's template system — 21 levels per screen (0-100% in 5% steps) with auto-save to hardware
- **Optimistic state updates** — feedbacks and variables update immediately on action, with live state from processor when connected

## Protocol

Communicates via UDP on port 6000 using the Novastar H Series Control Protocol (V1.0.18/1.0.19).

## Installation

Install as a custom module in Companion 4.3+.

## Upgrading from v3.0.2

All existing action and feedback configurations are compatible. **Variable names have changed** from 0-based to 1-based numbering (e.g. `screenId_0` → `screen_1`). If you manually typed variable references in button text, you'll need to update them. See [HELP.md](./companion/HELP.md) for the full mapping.

## Version History

### 3.2.0
- Add Set Brightness action (W0410) with absolute value 0-100
- Add Save Brightness action (W0417) to save to LED hardware
- Brightness template presets with feedback and 100ms save delay
- Fix checkFeedbacks to specify feedback types
- Fix updateEnhancedFromAction to push variable values immediately
- Rename Screen FRZ to Freeze
- Replace deprecated `required` with `requiredExpression`
- Companion 4.3 minimum requirement

### 3.1.0
- Offline programming mode
- Enhanced per-screen variables and direct feedbacks
- Template preset system for presets and layers

>>>>>>> Stashed changes
See [HELP.md](./companion/HELP.md) and [LICENSE](./LICENSE)