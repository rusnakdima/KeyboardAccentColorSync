// extension.js
import GObject from "gi://GObject";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import St from "gi://St";
import Clutter from "gi://Clutter";

import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as QuickSettings from "resource:///org/gnome/shell/ui/quickSettings.js";
import * as ModalDialog from "resource:///org/gnome/shell/ui/modalDialog.js";

import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

// ————————————————————————————————————
// Color & Animation definitions
// ————————————————————————————————————
const COLORS = [
  { id: "system", name: _("System Accent"), color: null },
  { id: "blue", name: _("Blue"), color: "#3584e4" },
  { id: "teal", name: _("Teal"), color: "#2ecc71" },
  { id: "green", name: _("Green"), color: "#26a269" },
  { id: "yellow", name: _("Yellow"), color: "#e5a50a" },
  { id: "orange", name: _("Orange"), color: "#e67e22" },
  { id: "red", name: _("Red"), color: "#c01c28" },
  { id: "pink", name: _("Pink"), color: "#e23689" },
  { id: "purple", name: _("Purple"), color: "#a51d8a" },
  { id: "custom", name: _("Custom…"), color: null },
];

const SYSTEM_COLOR_MAP = {
  blue: "#3584e4",
  teal: "#2ecc71",
  green: "#26a269",
  yellow: "#e5a50a",
  orange: "#e67e22",
  red: "#c01c28",
  purple: "#a51d8a",
  pink: "#e23689",
  maia: "#5885a2",
  asphalt: "#232629",
  graphite: "#777777",
  silver: "#c0c0c0",
  plum: "#7c154d",
  berry: "#722258",
  ocean: "#006e96",
  sand: "#dac5a3",
  sage: "#718862",
  slate: "#5f6e7d",
};

const ANIMATIONS = [
  { id: "none", name: _("None") },
  { id: "breathing", name: _("Breathing") },
  { id: "wave", name: _("Wave") },
  { id: "rainbow", name: _("Rainbow") },
  { id: "static", name: _("Static") },
  { id: "gradient", name: _("Gradient") },
  { id: "marquee", name: _("Marquee") },
  { id: "cover-marquee", name: _("Cover Marquee") },
  { id: "alternating", name: _("Alternating") },
  { id: "shifting", name: _("Shifting") },
  { id: "reactive", name: _("Reactive") },
  { id: "ripples", name: _("Ripples") },
  { id: "blobs", name: _("Blobs") },
];

// ————————————————————————————————————
// Color Item (Styled MenuItem)
// ————————————————————————————————————
const ColorItem = GObject.registerClass(
  class ColorItem extends PopupMenu.PopupBaseMenuItem {
    _init(colorDef, settings, updateCallback, extensionObj) {
      super._init({
        style_class: "color-item",
        reactive: true,
        can_focus: true,
      });

      this._settings = settings;
      this._updateCallback = updateCallback;
      this._extensionObj = extensionObj;
      this._colorDef = colorDef;

      // Icon/Swatch
      if (colorDef.color) {
        const swatch = new St.Bin({
          style: `background-color: ${colorDef.color}; border-radius: 4px;`,
          width: 20,
          height: 20,
          x_align: Clutter.ActorAlign.CENTER,
          y_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(swatch);
      } else {
        // For "System Accent" or "Custom"
        const icon = new St.Icon({
          icon_name:
            colorDef.id === "system"
              ? "preferences-system-symbolic"
              : "document-edit-symbolic",
          style_class: "color-item-icon",
          icon_size: 16,
          x_align: Clutter.ActorAlign.CENTER,
          y_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(icon);
      }

      // Label
      const label = new St.Label({
        text: colorDef.name,
        x_expand: true,
        x_align: Clutter.ActorAlign.START,
        style_class: "color-item-label",
      });
      this.add_child(label);

      // Activate
      this.connect("activate", () => {
        if (colorDef.id === "system") {
          if (this._settings) {
            this._settings.set_string("sync-mode", "system");
          }
          log(`Selected color: ${colorDef.id} (${colorDef.name})`);
        } else if (colorDef.id === "custom") {
          if (this._settings) {
            this._settings.set_string("sync-mode", "custom");
          }
          log(`Selected color: ${colorDef.id} (${colorDef.name})`);

          // Create a simple color picker dialog for custom color selection
          this._showCustomColorDialog();
          return;
        } else {
          if (this._settings) {
            this._settings.set_string("sync-mode", "custom");
            this._settings.set_string("custom-color", colorDef.color);
          }
          log(
            `Selected color: ${colorDef.id} (${colorDef.name}), Hex: ${colorDef.color}`
          );
        }
        this._updateCallback();
        this._extensionObj._updateOpenRGB();
      });
    }

    _showCustomColorDialog() {
      // Create a simple dialog for entering custom hex color
      const colorDialog = new ModalDialog.ModalDialog({
        styleClass: "prompt-dialog",
      });

      // Title
      const title = new St.Label({
        text: _("Enter Custom Color"),
        style_class: "prompt-dialog-headline",
      });

      // Color input entry
      const colorEntry = new St.Entry({
        text: this._settings
          ? this._settings.get_string("custom-color")
          : "#3584e4",
        style_class: "prompt-dialog-entry",
        can_focus: true,
      });

      // Color preview
      const colorPreview = new St.Bin({
        style: `background-color: ${colorEntry.text}; border: 1px solid #fff; border-radius: 4px;`,
        width: 50,
        height: 30,
        x_align: Clutter.ActorAlign.CENTER,
        y_align: Clutter.ActorAlign.CENTER,
      });

      // Update preview when text changes
      colorEntry.clutter_text.connect("text-changed", () => {
        const colorValue = colorEntry.text;
        // Validate hex color
        if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorValue)) {
          colorPreview.set_style(
            `background-color: ${colorValue}; border: 1px solid #fff; border-radius: 4px;`
          );
        }
      });

      // Content layout
      const contentLayout = new St.BoxLayout({
        vertical: true,
        style: "padding: 20px;",
      });

      contentLayout.add_child(title);

      const entryLayout = new St.BoxLayout({
        vertical: false,
        style: "spacing: 10px; margin-top: 10px;",
      });

      entryLayout.add_child(colorEntry);
      entryLayout.add_child(colorPreview);

      contentLayout.add_child(entryLayout);

      // Buttons layout
      const buttonsLayout = new St.BoxLayout({
        vertical: false,
        style: "spacing: 10px; margin-top: 15px;",
      });

      // OK button
      const okButton = new St.Button({
        label: _("OK"),
        style_class: "button modal-dialog-button",
        x_expand: true,
      });

      okButton.connect("clicked", () => {
        let colorValue = colorEntry.text.trim();

        // Validate and normalize hex color
        if (
          colorValue &&
          /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorValue)
        ) {
          // Ensure it starts with #
          if (!colorValue.startsWith("#")) {
            colorValue = "#" + colorValue;
          }

          // Expand 3-digit hex to 6-digit if needed
          if (colorValue.length === 4) {
            // #RGB format
            colorValue =
              "#" +
              colorValue[1] +
              colorValue[1] +
              colorValue[2] +
              colorValue[2] +
              colorValue[3] +
              colorValue[3];
          }

          if (this._settings) {
            this._settings.set_string("custom-color", colorValue);
          }

          log(`Custom color set to: ${colorValue}`);
          this._updateCallback();
          this._extensionObj._updateOpenRGB();
          colorDialog.close();
        } else {
          // Show error or keep dialog open
          colorEntry.set_style("border: 2px solid red;");
        }
      });

      // Cancel button
      const cancelButton = new St.Button({
        label: _("Cancel"),
        style_class: "button modal-dialog-button",
        x_expand: true,
      });

      cancelButton.connect("clicked", () => {
        colorDialog.close();
      });

      buttonsLayout.add_child(cancelButton);
      buttonsLayout.add_child(okButton);
      contentLayout.add_child(buttonsLayout);

      colorDialog.contentLayout.add_child(contentLayout);
      colorDialog.open();
    }
  }
);

// ————————————————————————————————————
// Animation Item (Styled MenuItem)
// ————————————————————————————————————
const AnimationItem = GObject.registerClass(
  class AnimationItem extends PopupMenu.PopupBaseMenuItem {
    _init(animDef, settings, updateCallback, extensionObj) {
      super._init({
        style_class: "animation-item",
        reactive: true,
        can_focus: true,
      });

      this._settings = settings;
      this._updateCallback = updateCallback;
      this._extensionObj = extensionObj;
      this._animDef = animDef;

      const label = new St.Label({
        text: animDef.name,
        x_expand: true,
        x_align: Clutter.ActorAlign.START,
        style_class: "animation-item-label",
      });
      this.add_child(label);

      // Activate
      this.connect("activate", () => {
        if (this._settings) {
          this._settings.set_string("animation", animDef.id);
        }
        log(`Selected animation: ${animDef.id} (${animDef.name})`);
        this._updateCallback();
        this._extensionObj._updateOpenRGB();
      });
    }
  }
);

// ————————————————————————————————————
// Color Selection QuickMenuToggle (Simplified)
// ————————————————————————————————————
const ColorSelectionToggle = GObject.registerClass(
  class ColorSelectionToggle extends QuickSettings.QuickMenuToggle {
    _init(extensionObject) {
      super._init({
        title: _("Backlight Keyboard"),
        iconName: "keyboard-brightness-symbolic",
        toggleMode: false,
      });

      this._extension = extensionObject;
      this._settings = extensionObject.getSettings(
        "org.gnome.shell.extensions.keyboard-accent-color-sync"
      );

      // Header
      this.menu.setHeader(
        "keyboard-brightness-symbolic",
        _("Keyboard Color Selection")
      );

      // Create a scrollable container for color items
      this._colorScrollView = new St.ScrollView({
        style_class: "keyboard-accent-color-menu-scroll",
        hscrollbar_policy: St.PolicyType.NEVER,
        vscrollbar_policy: St.PolicyType.AUTOMATIC,
        overlay_scrollbars: true,
      });

      // Create a section to hold the color items
      this._colorSection = new PopupMenu.PopupMenuSection();

      // Add color items to the section
      COLORS.forEach((colorDef) => {
        const item = new ColorItem(
          colorDef,
          this._settings,
          () => this._updateSubtitle(),
          this._extension
        );
        this._colorSection.addMenuItem(item);
      });

      // Add the section to the scroll view
      this._colorScrollView.child = this._colorSection.actor;

      // Set max height to make scrolling visible
      this._colorScrollView.set_style("max-height: 300px;");

      // Add the scrollable view to the menu
      this.menu.box.add_child(this._colorScrollView);

      // Initial state
      this._updateSubtitle();
      this._settings.connect("changed::sync-mode", () =>
        this._updateSubtitle()
      );
      this._settings.connect("changed::custom-color", () =>
        this._updateSubtitle()
      );
    }

    _updateSubtitle() {
      if (!this._settings) {
        // Use fallback values if settings are not available
        this.subtitle = _("System Accent (fallback)");
        return;
      }

      const syncMode = this._settings.get_string("sync-mode");

      if (syncMode === "system") {
        this.subtitle = _("System Accent");
      } else {
        const colorStr = this._settings.get_string("custom-color");
        const match = COLORS.find((c) => c.color === colorStr);
        this.subtitle = match ? match.name : colorStr;
      }
    }

    destroy() {
      if (this._colorScrollView) {
        this._colorScrollView.destroy();
        this._colorScrollView = null;
      }
      if (this._colorSection) {
        this._colorSection.destroy();
        this._colorSection = null;
      }
      super.destroy();
    }
  }
);

// ————————————————————————————————————
// Animation Selection QuickMenuToggle
// ————————————————————————————————————
const AnimationSelectionToggle = GObject.registerClass(
  class AnimationSelectionToggle extends QuickSettings.QuickMenuToggle {
    _init(extensionObject) {
      super._init({
        title: _("Animations Keyboard"),
        iconName: "preferences-system-symbolic",
        toggleMode: false,
      });

      this._extension = extensionObject;
      try {
        this._settings = extensionObject.getSettings(
          "org.gnome.shell.extensions.keyboard-accent-color-sync"
        );
      } catch (e) {
        // Fallback if settings schema is not available
        log("Warning: Could not load settings schema, using fallback");
        this._settings = null;
      }

      // Header
      this.menu.setHeader(
        "preferences-system-symbolic",
        _("Keyboard Animation Selection")
      );

      // Create a scrollable container for animation items
      this._animationScrollView = new St.ScrollView({
        style_class: "keyboard-accent-animation-menu-scroll",
        hscrollbar_policy: St.PolicyType.NEVER,
        vscrollbar_policy: St.PolicyType.AUTOMATIC,
        overlay_scrollbars: true,
      });

      // Create a section to hold the animation items
      this._animationSection = new PopupMenu.PopupMenuSection();

      // Add animation items to the section
      ANIMATIONS.forEach((animDef) => {
        const item = new AnimationItem(
          animDef,
          this._settings || this._createFallbackSettings(),
          () => this._updateSubtitle(),
          this._extension
        );
        this._animationSection.addMenuItem(item);
      });

      // Add the section to the scroll view
      this._animationScrollView.child = this._animationSection.actor;

      // Set max height to make scrolling visible
      this._animationScrollView.set_style("max-height: 300px;");

      // Add the scrollable view to the menu
      this.menu.box.add_child(this._animationScrollView);

      // Initial state
      this._updateSubtitle();
      if (this._settings) {
        this._settings.connect("changed::animation", () =>
          this._updateSubtitle()
        );
      }
    }

    _createFallbackSettings() {
      // Create a simple fallback settings object
      const fallbackSettings = {
        get_boolean: (key) => {
          if (key === "enabled") return true; // Default enabled
          return false;
        },
        get_string: (key) => {
          if (key === "sync-mode") return "system";
          if (key === "custom-color") return "#3584e4";
          if (key === "animation") return "none";
          return "";
        },
        set_boolean: (key, value) => {
          log(`[Fallback] Setting ${key} to ${value}`);
        },
        set_string: (key, value) => {
          log(`[Fallback] Setting ${key} to ${value}`);
        },
        connect: (signal, callback) => {
          // No-op for fallback
          return null;
        },
      };
      return fallbackSettings;
    }

    _updateSubtitle() {
      if (!this._settings) {
        // Use fallback value if settings are not available
        this.subtitle = _("None (fallback)");
        return;
      }

      const anim = this._settings.get_string("animation");

      const animMatch = ANIMATIONS.find((a) => a.id === anim);
      this.subtitle = animMatch?.name || anim;
    }

    destroy() {
      if (this._animationScrollView) {
        this._animationScrollView.destroy();
        this._animationScrollView = null;
      }
      if (this._animationSection) {
        this._animationSection.destroy();
        this._animationSection = null;
      }
      super.destroy();
    }
  }
);

// ————————————————————————————————————
// System Indicator
// ————————————————————————————————————
const ColorSyncIndicator = GObject.registerClass(
  class ColorSyncIndicator extends QuickSettings.SystemIndicator {
    _init(extensionObject) {
      super._init();

      // Add both menu items to quick settings items
      this.quickSettingsItems.push(new ColorSelectionToggle(extensionObject));
      this.quickSettingsItems.push(
        new AnimationSelectionToggle(extensionObject)
      );
    }

    destroy() {
      this.quickSettingsItems.forEach((item) => item?.destroy?.());
      super.destroy();
    }
  }
);

// ————————————————————————————————————
// Extension entry point
// ————————————————————————————————————
export default class KeyboardAccentColorSyncExtension extends Extension {
  enable() {
    try {
      this._settings = this.getSettings();
    } catch (e) {
      // Fallback if settings schema is not available
      log(
        "Warning: Could not load settings schema, using fallback in main extension"
      );
      this._settings = null;
    }

    this._indicator = new ColorSyncIndicator(this);
    Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);

    // Listen to specific settings changes that affect OpenRGB
    if (this._settings) {
      this._settingsChangedId = this._settings.connect(
        "changed::sync-mode",
        () => {
          this._updateOpenRGB();
        }
      );

      this._settingsCustomColorId = this._settings.connect(
        "changed::custom-color",
        () => {
          this._updateOpenRGB();
        }
      );

      this._settingsAnimationId = this._settings.connect(
        "changed::animation",
        () => {
          this._updateOpenRGB();
        }
      );
    }

    // Initial update
    this._updateOpenRGB();

    // Listen for system accent color changes
    this._setupSystemAccentColorListener();
  }

  // Setup listener for system accent color changes
  _setupSystemAccentColorListener() {
    try {
      const Gio = imports.gi.Gio;

      // Create a GSettings object for the desktop interface schema
      this._interfaceSettings = new Gio.Settings({
        schema_id: "org.gnome.desktop.interface",
      });

      // Connect to changes in the accent-color key
      this._accentColorChangedId = this._interfaceSettings.connect(
        "changed::accent-color",
        () => {
          // Only update if we're in system sync mode
          if (this._settings) {
            const syncMode = this._settings.get_string("sync-mode");
            if (syncMode === "system") {
              log("System accent color changed, updating keyboard");
              this._updateOpenRGB();
            }
          } else {
            // In fallback mode, always update since we can't check the sync mode
            log("System accent color changed (fallback), updating keyboard");
            this._updateOpenRGB();
          }
        }
      );

      log("System accent color listener set up successfully");
    } catch (e) {
      log(`Error setting up system accent color listener: ${e.message}`);
    }
  }

  disable() {
    // Disconnect settings change listeners
    if (this._settings && this._settingsChangedId) {
      this._settings.disconnect(this._settingsChangedId);
      this._settingsChangedId = null;
    }

    if (this._settings && this._settingsCustomColorId) {
      this._settings.disconnect(this._settingsCustomColorId);
      this._settingsCustomColorId = null;
    }

    if (this._settings && this._settingsAnimationId) {
      this._settings.disconnect(this._settingsAnimationId);
      this._settingsAnimationId = null;
    }

    // Disconnect system accent color listener
    if (this._interfaceSettings && this._accentColorChangedId) {
      this._interfaceSettings.disconnect(this._accentColorChangedId);
      this._accentColorChangedId = null;
    }
    this._interfaceSettings = null;

    this._indicator?.destroy();
    this._indicator = null;
  }

  // Method to update OpenRGB with current settings
  _updateOpenRGB() {
    let settings;
    if (this._settings) {
      settings = this._settings;
    } else {
      // Use fallback settings if schema not available
      settings = this._createFallbackSettings();
    }

    let enabled, syncMode, animation;
    try {
      enabled = settings.get_boolean("enabled");
      syncMode = settings.get_string("sync-mode");
      animation = settings.get_string("animation");
    } catch (e) {
      // Use fallback values
      enabled = true;
      syncMode = "system";
      animation = "none";
    }

    log(
      `_updateOpenRGB called - enabled: ${enabled}, syncMode: ${syncMode}, animation: ${animation}`
    );

    if (!enabled) {
      log("OpenRGB update skipped - extension disabled");
      return; // Don't update if disabled
    }

    let colorToUse;
    if (syncMode === "system") {
      // Get the actual system accent color
      colorToUse = this._getSystemAccentColor();
    } else {
      try {
        colorToUse = settings.get_string("custom-color");
      } catch (e) {
        colorToUse = "#3584e4"; // fallback
      }
    }

    log(
      `About to execute OpenRGB with color: ${colorToUse}, animation: ${animation}`
    );

    // Execute OpenRGB command to set color
    this._setOpenRGBColor(colorToUse, animation);
  }

  _createFallbackSettings() {
    // Create a simple fallback settings object
    const fallbackSettings = {
      get_boolean: (key) => {
        if (key === "enabled") return true; // Default enabled
        return false;
      },
      get_string: (key) => {
        if (key === "sync-mode") return "system";
        if (key === "custom-color") return "#3584e4";
        if (key === "animation") return "none";
        return "";
      },
      set_boolean: (key, value) => {
        log(`[Fallback] Setting ${key} to ${value}`);
      },
      set_string: (key, value) => {
        log(`[Fallback] Setting ${key} to ${value}`);
      },
      connect: (signal, callback) => {
        // No-op for fallback
        return null;
      },
    };
    return fallbackSettings;
  }

  // Method to get the system accent color
  _getSystemAccentColor() {
    try {
      // Import Gio to access GSettings
      const Gio = imports.gi.Gio;

      // Create a GSettings object for the desktop interface schema
      const interfaceSettings = new Gio.Settings({
        schema_id: "org.gnome.desktop.interface",
      });

      // Get the accent color value
      const accentColorValue = interfaceSettings.get_value("accent-color");

      log(
        `Raw accent color value: ${accentColorValue} (type: ${accentColorValue.get_type_string()})`
      );

      if (
        accentColorValue &&
        !accentColorValue.get_type_string().includes("()")
      ) {
        const colorName = accentColorValue.deep_unpack();
        log(`Unpacked color name: ${colorName} (type: ${typeof colorName})`);

        // Use the global color map for system accent colors
        const colorMap = SYSTEM_COLOR_MAP;

        if (colorMap[colorName]) {
          log(
            `Mapped color name '${colorName}' to hex: ${colorMap[colorName]}`
          );
          return colorMap[colorName];
        } else {
          log(`Unknown color name '${colorName}', using default blue`);
          return "#3584e4"; // Default blue accent
        }
      } else {
        log("System accent color not set or is empty, using default blue");
        return "#3584e4"; // Default blue accent
      }
    } catch (e) {
      log(`Error getting system accent color: ${e.message}, using default`);
      return "#3584e4"; // Default fallback
    }
  }

  // Method to set OpenRGB color
  _setOpenRGBColor(color, animation) {
    // Remove the '#' symbol from hex color if present
    const hexColor = color.replace("#", "");

    // Build OpenRGB command based on animation type
    let command;
    let args = [];

    switch (animation) {
      case "breathing":
        command = `openrgb --mode breathing --color ${hexColor}`;
        args = ["openrgb", "--mode", "breathing", "--color", hexColor];
        break;
      case "wave":
        command = `openrgb --mode wave --color ${hexColor}`;
        args = ["openrgb", "--mode", "wave", "--color", hexColor];
        break;
      case "rainbow":
        command = `openrgb --mode rainbow`;
        args = ["openrgb", "--mode", "rainbow"];
        break;
      case "marquee":
        command = `openrgb --mode marquee --color ${hexColor}`;
        args = ["openrgb", "--mode", "marquee", "--color", hexColor];
        break;
      case "cover-marquee":
        command = `openrgb --mode cover-marquee --color ${hexColor}`;
        args = ["openrgb", "--mode", "cover-marquee", "--color", hexColor];
        break;
      case "alternating":
        command = `openrgb --mode alternating --color ${hexColor}`;
        args = ["openrgb", "--mode", "alternating", "--color", hexColor];
        break;
      case "shifting":
        command = `openrgb --mode shifting --color ${hexColor}`;
        args = ["openrgb", "--mode", "shifting", "--color", hexColor];
        break;
      case "reactive":
        command = `openrgb --mode reactive --color ${hexColor}`;
        args = ["openrgb", "--mode", "reactive", "--color", hexColor];
        break;
      case "ripples":
        command = `openrgb --mode ripples --color ${hexColor}`;
        args = ["openrgb", "--mode", "ripples", "--color", hexColor];
        break;
      case "blobs":
        command = `openrgb --mode blobs --color ${hexColor}`;
        args = ["openrgb", "--mode", "blobs", "--color", hexColor];
        break;
      case "gradient":
        command = `openrgb --mode gradient --color ${hexColor}`;
        args = ["openrgb", "--mode", "gradient", "--color", hexColor];
        break;
      case "none":
      case "static":
      default:
        command = `openrgb --mode static --color ${hexColor}`;
        args = ["openrgb", "--mode", "static", "--color", hexColor];
        break;
    }

    // Log the command for debugging
    log(`Executing OpenRGB command: ${command} at maximum brightness`);

    // Execute the OpenRGB command in a subprocess
    try {
      const [success, pid] = GLib.spawn_async(
        null,
        args,
        null,
        GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
        null
      );

      if (!success) {
        log("Failed to execute OpenRGB command: " + command);
      } else {
        log("OpenRGB command executed successfully: PID = " + pid);
      }
    } catch (e) {
      log("Error executing OpenRGB command: " + e.message);
    }
  }
}
