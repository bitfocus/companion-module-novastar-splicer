## Splicer

This module will allow you to control the splicer of Novastar.

### Configuration

- Enter the IP address of the device in the configuration settings.

**Available actions:**

<<<<<<< Updated upstream
- Play Preset
- Play Preset Group
- Select Screen
- Select Layer
- Switch Source
- Freeze Screen
- Unfreeze Screen
- Freeze Layer
- Unfreeze Layer
- FTB Screen
- Cancel FTB
- Custom Command
- Turn on/off the Volume
- Increase/Decrease the Volume
- Increase/Decrease the Brightness
- Switch PGM/PVW Mode
- Take
- Turn on/off the OSD Text
- Turn on/off the OSD Image
- Turn on/off the BKG
=======
| Action | Description |
|--------|-------------|
| Select Screen | Select/deselect a screen for operations |
| Select Layer | Select a layer on a screen |
| Preset | Recall a preset for a screen |
| Preset Group | Play a preset collection |
| Set Brightness | Set absolute brightness (0-100) for a screen |
| Save Brightness | Save current brightness to LED receiving card hardware |
| Screen Brightness Add | Increase brightness by 1% |
| Screen Brightness Minus | Decrease brightness by 1% |
| Freeze | Enable/disable screen freeze |
| Layer FRZ | Enable/disable layer freeze |
| FTB | Enable/disable Fade to Black |
| PGM/PVW | Switch between Program and Preview mode |
| Take | Auto take with fade time |
| Source | Switch input source on a layer |
| Volume Switch | Enable/disable volume |
| Screen Volume Add | Increase volume |
| Screen Volume Minus | Decrease volume |
| Test Pattern | Enable/disable test pattern on an output |
| BKG | Enable/disable background |
| OSD | Enable/disable OSD (text or image) |
| Blackout | Enable/disable blackout on all screens |
| Send Command | Send a custom UDP command |

### Feedbacks

| Feedback | Description |
|----------|-------------|
| Select Screen | Active when screen is selected |
| Select Layer | Active when layer is selected |
| Load Preset | Active when preset is loaded on a screen |
| Preset Group Selection | Active when preset collection is selected |
| PGM/PVW Status | Shows current PGM/PVW mode |
| Take Status | Shows take state |
| FTB Status | Active when FTB is enabled |
| FTB (Direct) | Direct state check for FTB |
| Freeze Screen | Active when screen is frozen |
| Screen Frozen (Direct) | Direct state check for freeze |
| Freeze Layer | Active when layer is frozen |
| Brightness Match (Direct) | Active when screen brightness matches target value |
| Input Source Selection | Active when input source matches |
| Volume On/Off Status | Active when volume is enabled/disabled |
| Test Pattern On/Off Status | Active when test pattern is active |
| Test Pattern (Direct) | Direct state check for test pattern |
| BKG Status | Active when background is enabled |
| BKG (Direct) | Direct state check for BKG |
| OSD Status | Active when OSD is enabled |
| OSD Text (Direct) | Direct state check for OSD text |
| OSD Image (Direct) | Direct state check for OSD image |

### Variables

**Per-screen variables** (where X is screen number, 1-based):

| Variable | Description |
|----------|-------------|
| `screen_X` | Screen name |
| `screen_X_brightness` | Current brightness (0-100) |
| `screen_X_frozen` | Freeze state (On/Off) |
| `screen_X_ftb` | FTB state (On/Off) |
| `screen_X_bkg` | Background state (On/Off) |
| `screen_X_osd_text` | OSD text state (On/Off) |
| `screen_X_osd_image` | OSD image state (On/Off) |
| `screen_X_test_pattern` | Test pattern state (On/Off) |
| `screen_X_layer_Y` | Layer name |
| `screen_X_preset_Y` | Preset name |

**Other variables:**

| Variable | Description |
|----------|-------------|
| `connection_state` | Online / Offline Programming / Disconnected |
| `presetCollectionId_X` | Preset group name |
| `source_X_Y` | Input source name |

### Preset Templates

Brightness level presets are generated using Companion 4.3's template system. Each screen gets a set of brightness buttons (100% down to 0% in 5% steps) that automatically set brightness and save to hardware with a 100ms delay. Feedback highlights the button matching current brightness.

### Upgrading from v3.0.2

All existing action and feedback configurations are compatible. **Variable names have changed** from 0-based to 1-based numbering. If you manually typed variable references in button text (not from presets), you will need to update them:

| Old (v3.0.2) | New (v3.2) |
|---|---|
| `$(novastar-splicer:screenId_0)` | `$(novastar-splicer:screen_1)` |
| `$(novastar-splicer:screenId_0_layerId_0)` | `$(novastar-splicer:screen_1_layer_1)` |
| `$(novastar-splicer:screenId_0_presetId_0)` | `$(novastar-splicer:screen_1_preset_1)` |
| `$(novastar-splicer:presetCollectionId_0)` | `$(novastar-splicer:presetCollectionId_1)` |
| `$(novastar-splicer:source_0_255)` | `$(novastar-splicer:source_1_255)` |

All numbering is now **1-based** (Screen 1, Layer 1, Preset 1). Buttons created from presets will update automatically — only manually-typed variable references need to be changed.
>>>>>>> Stashed changes
