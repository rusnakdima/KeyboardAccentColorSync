// extension.js
import GObject from "gi://GObject";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import St from "gi://St";
import Clutter from "gi://Clutter";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as QuickSettings from "resource:///org/gnome/shell/ui/quickSettings.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

const COLOR_MAP = {
  default: { hex: "#1c71d8", name: "Blue" },
  blue: { hex: "#1c71d8", name: "Blue" },
  teal: { hex: "#26a269", name: "Teal" },
  green: { hex: "#2ec27e", name: "Green" },
  yellow: { hex: "#f5c211", name: "Yellow" },
  orange: { hex: "#f6a30f", name: "Orange" },
  red: { hex: "#e62d2f", name: "Red" },
  purple: { hex: "#9141ac", name: "Purple" },
  brown: { hex: "#8f6b3b", name: "Brown" },
  pink: { hex: "#d06387", name: "Pink" },
  slate: { hex: "#606672", name: "Slate" },
  maia: { hex: "#16a085", name: "Maia" },
};

const DEVICE_ID = 0;
const DESIRED_BRIGHTNESS = 50;
const PROFILE_NAME = "accent_profile";

// Create a QuickMenuToggle for our keyboard functionality
const KeyboardQuickMenuToggle = GObject.registerClass(
  class KeyboardQuickMenuToggle extends QuickSettings.QuickMenuToggle {
    _init(ext) {
      super._init({
        title: "Keyboard", // Initial title
        iconName: "input-keyboard-symbolic",
        toggleMode: false,
      });

      this._ext = ext;

      // Set up the menu
      const { menu } = this;

      // Add header
      menu.setHeader(
        "input-keyboard-symbolic",
        "Keyboard RGB",
        "Keyboard RGB Color"
      );

      // Add color items to submenu
      Object.entries(COLOR_MAP).forEach(([key, value]) => {
        if (key === "default") return;

        const item = new PopupMenu.PopupBaseMenuItem();
        const box = new St.BoxLayout({ style: "spacing: 12px;" });

        const colorBox = new St.Widget({
          style: `background-color: ${value.hex}; border-radius: 99px; width: 24px; height: 24px;`,
        });

        const label = new St.Label({ text: value.name });

        box.add_child(colorBox);
        box.add_child(label);
        item.add_child(box);

        item.connect("activate", () => {
          ext.setKeyboardColorByKey(key); // This will update ext._lastSetColorKey
          menu.close();
        });

        menu.addMenuItem(item);
      });

      // Add separator
      menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

      // Add sync button
      const syncItem = new PopupMenu.PopupMenuItem("Sync with System Accent");
      syncItem.connect("activate", () => {
        ext.syncWithSystemAccent(); // This will update ext._lastSetColorKey
        menu.close();
      });
      menu.addMenuItem(syncItem);

      // Update title initially based on the extension's state
      this._updateTitle();
    }

    // Update the title based on the extension's internal state of the last set color
    _updateTitle() {
      const lastSetColorKey = this._ext.getLastSetColorKey(); // Get the last set color key from the extension
      this.title = COLOR_MAP[lastSetColorKey]?.name || "Keyboard";
    }
  }
);

// Create a SystemIndicator that contains our QuickMenuToggle
const KeyboardSystemIndicator = GObject.registerClass(
  class KeyboardSystemIndicator extends QuickSettings.SystemIndicator {
    _init(ext) {
      super._init();

      this._ext = ext;

      // Create the indicator icon
      this._indicator = this._addIndicator();
      this._indicator.icon_name = "input-keyboard-symbolic";
      // Hide from top status bar (tray)
      this._indicator.visible = false;

      // Create the toggle menu and associate it with the indicator
      const toggle = new KeyboardQuickMenuToggle(ext);
      this.quickSettingsItems.push(toggle);

      // Add the indicator to the panel and the toggle to the menu
      Main.panel.statusArea.quickSettings.addExternalIndicator(this);
    }

    destroy() {
      // Clean up
      this.quickSettingsItems.forEach((item) => item.destroy());
      this._indicator.destroy();
      super.destroy();
    }
  }
);

export default class KeyboardAccentSyncExtension {
  constructor() {
    this._indicator = null;
    this._settings = null;
    this._cid = null;
    this._manual = false;
    this._prev = null;
    this._lastSetColorKey = "blue"; // Initialize with a default color key
  }

  getCurrentAccent() {
    if (!this._settings) return "blue";
    const a = this._settings.get_string("accent-color");
    log(`[KeyboardAccentSync] Current system accent-color: ${a}`);
    return a === "default" ? "blue" : a;
  }

  // Method to get the last set color key
  getLastSetColorKey() {
    return this._lastSetColorKey;
  }

  setKeyboardColorByKey(k) {
    const c = COLOR_MAP[k];
    if (!c) {
      log(`[KeyboardAccentSync] Invalid color key: ${k}`);
      return;
    }
    log(
      `[KeyboardAccentSync] Setting keyboard color manually to: ${k} (${c.name}, ${c.hex})`
    );
    this._manual = true;
    this._lastSetColorKey = k; // Update the last set color key
    this._set(c.hex);
    this._updateUI(); // Update the button title
  }

  syncWithSystemAccent() {
    log(`[KeyboardAccentSync] Syncing with system accent...`);
    this._manual = false;
    const currentAccent = this.getCurrentAccent();
    const c = COLOR_MAP[currentAccent] || COLOR_MAP.blue;
    log(
      `[KeyboardAccentSync] Syncing - Current accent: ${currentAccent}, Color: ${c.name}, Hex: ${c.hex}`
    );
    this._lastSetColorKey = currentAccent; // Update the last set color key to the system accent
    this._set(c.hex);
    this._updateUI(); // Update the button title
  }

  _onChanged() {
    log(
      `[KeyboardAccentSync] System accent-color changed. Manual mode: ${this._manual}`
    );
    if (this._manual) {
      log(
        `[KeyboardAccentSync] Skipping update because manual mode is active.`
      );
      return; // Only update if not in manual mode
    }
    const cur = this.getCurrentAccent();
    log(
      `[KeyboardAccentSync] Previous accent: ${this._prev}, New accent: ${cur}`
    );
    if (cur === this._prev) {
      log(`[KeyboardAccentSync] Accent didn't actually change, skipping.`);
      return;
    }
    this._prev = cur;
    const c = COLOR_MAP[cur];
    if (c) {
      log(
        `[KeyboardAccentSync] Updating keyboard color to: ${cur} (${c.name}, ${c.hex})`
      );
      this._lastSetColorKey = cur; // Update the last set color key to the new system accent
      this._set(c.hex);
      this._updateUI(); // Update the button title
    } else {
      log(
        `[KeyboardAccentSync] Could not find color definition for accent: ${cur}`
      );
    }
  }

  _updateUI() {
    if (this._indicator && this._indicator.quickSettingsItems.length > 0) {
      const toggle = this._indicator.quickSettingsItems[0];
      toggle._updateTitle(); // Call the toggle's update method which gets the color from the extension
      log(
        `[KeyboardAccentSync] Updated UI title based on lastSetColorKey: ${this._lastSetColorKey}`
      );
    }
  }

  _set(hex) {
    log(`[KeyboardAccentSync] Attempting to set keyboard color to: ${hex}`);
    const h = hex.replace("#", "");
    const [ok, , , status] = GLib.spawn_command_line_sync("which openrgb");
    if (!ok || status !== 0) {
      log(
        `[KeyboardAccentSync] ERROR: openrgb command not found or failed. OK: ${ok}, Status: ${status}`
      );
      return;
    }
    log(`[KeyboardAccentSync] openrgb command found.`);

    // Try profile first
    try {
      log(
        `[KeyboardAccentSync] Trying profile command: openrgb --profile ${PROFILE_NAME} --color ${h}`
      );
      const [success, stdout, stderr, exit] = GLib.spawn_command_line_sync(
        `openrgb --profile ${PROFILE_NAME} --color ${h}`
      );
      log(
        `[KeyboardAccentSync] Profile command result - Success: ${success}, Exit: ${exit}, Stdout: ${
          stdout ? ByteArray.toString(stdout) : "N/A"
        }, Stderr: ${stderr ? ByteArray.toString(stderr) : "N/A"}`
      );
      if (success && exit === 0) {
        log(`[KeyboardAccentSync] Successfully set color using profile.`);
        return;
      } else {
        log(
          `[KeyboardAccentSync] Profile command failed or exited with non-zero code.`
        );
      }
    } catch (e) {
      log(`[KeyboardAccentSync] Exception during profile command: ${e}`);
    }

    // Fallback to direct command
    log(
      `[KeyboardAccentSync] Trying direct command: openrgb --device ${DEVICE_ID} --mode static --color ${h} --brightness ${DESIRED_BRIGHTNESS}`
    );
    const [async_success, async_pid] = GLib.spawn_async(
      null, // working directory
      [
        "openrgb",
        "--device",
        DEVICE_ID.toString(),
        "--mode",
        "static",
        "--color",
        h,
        "--brightness",
        DESIRED_BRIGHTNESS.toString(),
      ],
      null, // environment
      GLib.SpawnFlags.SEARCH_PATH,
      null // child setup function
    );

    if (async_success) {
      log(
        `[KeyboardAccentSync] Direct command spawned successfully with PID: ${async_pid}`
      );
    } else {
      log(`[KeyboardAccentSync] ERROR: Failed to spawn direct command.`);
    }
  }

  enable() {
    log(`[KeyboardAccentSync] Enabling extension...`);
    this._settings = new Gio.Settings({
      schema: "org.gnome.desktop.interface",
    });
    this._prev = this.getCurrentAccent();
    // Initialize _lastSetColorKey based on the current system accent when the extension is enabled
    this._lastSetColorKey = this.getCurrentAccent();
    log(
      `[KeyboardAccentSync] Initialized _prev: ${this._prev}, _lastSetColorKey: ${this._lastSetColorKey}`
    );

    // Create the system indicator
    this._indicator = new KeyboardSystemIndicator(this);

    this.syncWithSystemAccent(); // This will also update _lastSetColorKey and UI
    this._cid = this._settings.connect("changed::accent-color", () =>
      this._onChanged()
    );
    log(
      `[KeyboardAccentSync] Connected to accent-color changed signal with ID: ${this._cid}`
    );
  }

  disable() {
    log(`[KeyboardAccentSync] Disabling extension...`);
    if (this._cid && this._settings) {
      this._settings.disconnect(this._cid);
      log(
        `[KeyboardAccentSync] Disconnected from accent-color changed signal.`
      );
    }

    // Clean up
    if (this._indicator) {
      this._indicator.destroy();
      log(`[KeyboardAccentSync] Destroyed indicator.`);
    }

    this._indicator = null;
    this._settings = null;
    this._cid = null;
    this._prev = null;
    this._manual = false;
    this._lastSetColorKey = null;
    log(`[KeyboardAccentSync] Extension disabled.`);
  }
}
