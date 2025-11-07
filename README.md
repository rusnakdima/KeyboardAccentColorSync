# Keyboard Accent Color Sync Extension

Synchronizes your keyboard RGB color with GNOME's accent color using OpenRGB. The extension automatically updates your keyboard's backlight color when you change the system accent color in GNOME Settings.

## Features

- Automatically syncs keyboard RGB color with GNOME accent color changes
- Manual color selection from the Quick Settings panel
- "Sync with System Accent" option to re-enable automatic synchronization
- Maintains manual control when needed
- Uses OpenRGB for hardware control

## Prerequisites

### OpenRGB Installation

This extension requires OpenRGB to control your keyboard's RGB lighting.

**On Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install openrgb
```

**On Fedora:**

```bash
sudo dnf install openrgb
```

**On Arch Linux:**

```bash
yay -S openrgb
# or if in official repos:
sudo pacman -S openrgb
```

**Alternative Installation:** Download from [OpenRGB's official website](https://openrgb.org/)

### Hardware Requirements

- RGB keyboard with OpenRGB support (most common brands like Corsair, Logitech, Razer, etc.)
- Proper OpenRGB hardware configuration

## Installation

1. Install OpenRGB (see above)
2. Ensure OpenRGB daemon is running:
   ```bash
   sudo openrgb --server
   ```
   Or add it to your startup applications to run automatically
3. Install the extension from [GNOME Extensions](https://extensions.gnome.org/)
4. Enable the extension through the Extensions app or GNOME Settings

## Configuration

1. Once installed, click on the Keyboard RGB icon in the top panel's Quick Settings
2. Select from the available color options to manually set your keyboard color
3. Click "Sync with System Accent" to enable automatic synchronization with GNOME accent color
4. To temporarily disable automatic sync, manually select a color (this enters "manual mode")
5. To re-enable synchronization, click "Sync with System Accent" again

## Troubleshooting

### Keyboard Not Responding

- Ensure OpenRGB recognizes your keyboard: `openrgb --list-devices`
- Check that your keyboard model is supported by OpenRGB
- Verify the OpenRGB daemon is running

### Color Not Changing on System Accent Change

- Make sure you've clicked "Sync with System Accent" to enable synchronization
- Check that your system accent color is one of the supported GNOME accent colors
- Look at the system logs for any extension errors: `journalctl -f | grep KeyboardAccentSync`

### OpenRGB Command Not Found

- Ensure OpenRGB is installed and in your system PATH
- Check that OpenRGB is properly installed: `which openrgb`

### Permission Issues

- OpenRGB may require proper udev rules or running as root for some hardware
- Consider setting up udev rules for OpenRGB according to the OpenRGB documentation

## How It Works

The extension listens for changes to GNOME's `org.gnome.desktop.interface accent-color` setting and automatically updates your keyboard's RGB color via OpenRGB commands when the system accent color changes. The extension maintains a mapping between GNOME accent colors and RGB values to provide accurate color matching.

Manual color selection disables automatic synchronization until you re-enable it with the "Sync with System Accent" option.

## Supported GNOME Accent Colors

The extension maps the following GNOME accent colors:

- Blue (#1c71d8)
- Teal (#26a269)
- Green (#2ec27e)
- Yellow (#f5c211)
- Orange (#f6a30f)
- Red (#e62d2f)
- Purple (#9141ac)
- Pink (#d06387)
- Slate (#606672)
- Maia (#16a085)

## Development

To install from source:

1. Clone the extension repository
2. Navigate to the extension directory
3. Create the extension bundle: `gnome-extensions pack --force --install`
4. Reload GNOME Shell (Alt+F2, type 'r', press Enter)
5. Enable the extension

## Support

If you encounter issues, please:

1. Check the troubleshooting section above
2. Verify your hardware is compatible with OpenRGB
3. Make sure all prerequisites are properly installed
4. File an issue on the project repository with detailed error information
