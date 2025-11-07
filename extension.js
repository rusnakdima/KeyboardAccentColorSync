import GObject from "gi://GObject";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import St from "gi://St";
import Clutter from "gi://Clutter";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as QuickSettings from "resource:///org/gnome/shell/ui/quickSettings.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

const COLOR_MAP = {
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
const PROFILE_NAME = "accent_profile";

const KeyboardQuickMenuToggle = GObject.registerClass(
  class KeyboardQuickMenuToggle extends QuickSettings.QuickMenuToggle {
    _init(ext) {
      super._init({
        title: "Keyboard RGB",
        iconName: "input-keyboard-symbolic",
        toggleMode: false,
      });

      this._ext = ext;
      const { menu } = this;

      menu.setHeader(
        "input-keyboard-symbolic",
        "Keyboard RGB",
        "Configure keyboard backlight color"
      );

      const colorSection = new PopupMenu.PopupMenuSection();

      Object.entries(COLOR_MAP).forEach(([key, value]) => {
        const item = new PopupMenu.PopupBaseMenuItem({
          style_class: "popup-menu-item",
        });

        const box = new St.BoxLayout({
          style: "spacing: 12px;",
          x_expand: true,
        });

        const colorCircle = new St.Widget({
          style: `background-color: ${value.hex}; 
                  border-radius: 12px; 
                  width: 24px; 
                  height: 24px;`,
        });

        const label = new St.Label({
          text: value.name,
          y_align: Clutter.ActorAlign.CENTER,
        });

        box.add_child(colorCircle);
        box.add_child(label);
        item.add_child(box);

        item.connect("activate", () => {
          this._ext.setKeyboardColorByKey(key);
          this._updateTitle();
        });

        colorSection.addMenuItem(item);
      });

      const scrollView = new St.ScrollView({
        style_class: "keyboard-accent-color-scrollbox",
        hscrollbar_policy: St.PolicyType.NEVER,
        vscrollbar_policy: St.PolicyType.AUTOMATIC,
        overlay_scrollbars: true,
        style: "max-height: 150px;",
      });

      scrollView.add_child(colorSection.actor);

      menu.box.add_child(scrollView);

      menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

      const syncItem = new PopupMenu.PopupMenuItem("Sync with System Accent");
      syncItem.connect("activate", () => {
        this._ext.syncWithSystemAccent();
        this._updateTitle();
      });
      menu.addMenuItem(syncItem);

      this._updateTitle();
    }

    _updateTitle() {
      const colorKey = this._ext.getLastSetColorKey();
      const colorInfo = COLOR_MAP[colorKey];
      this.title = colorInfo ? `Keyboard: ${colorInfo.name}` : "Keyboard RGB";
    }
  }
);

export default class KeyboardAccentSyncExtension {
  constructor() {
    this._toggle = null;
    this._settings = null;
    this._signalId = null;
    this._manualMode = false;
    this._lastSetColorKey = "blue";
    this._currentBrightness = null;
  }

  enable() {
    log("[KeyboardAccentSync] Enabling extension");

    this._settings = new Gio.Settings({
      schema: "org.gnome.desktop.interface",
    });

    this._readCurrentBrightness();

    const currentAccent = this._getCurrentAccent();
    this._lastSetColorKey = currentAccent;

    this._toggle = new KeyboardQuickMenuToggle(this);

    if (typeof Main.panel.statusArea.quickSettings.addMenuItem === "function") {
      Main.panel.statusArea.quickSettings.addMenuItem(this._toggle);
    } else {
      log("[KeyboardAccentSync] Fallback: adding to menu grid directly");
      Main.panel.statusArea.quickSettings.menu._grid.add_child(this._toggle);
    }

    this.syncWithSystemAccent();

    this._signalId = this._settings.connect("changed::accent-color", () => {
      this._onAccentColorChanged();
    });

    log("[KeyboardAccentSync] Extension enabled");
  }

  disable() {
    log("[KeyboardAccentSync] Disabling extension");

    if (this._signalId && this._settings) {
      this._settings.disconnect(this._signalId);
      this._signalId = null;
    }

    if (this._toggle) {
      if (
        typeof Main.panel.statusArea.quickSettings.removeMenuItem === "function"
      ) {
        Main.panel.statusArea.quickSettings.removeMenuItem(this._toggle);
      } else {
        this._toggle.get_parent()?.remove_child(this._toggle);
      }
      this._toggle.destroy();
      this._toggle = null;
    }

    this._settings = null;
    this._manualMode = false;
    this._lastSetColorKey = null;
    this._currentBrightness = null;

    log("[KeyboardAccentSync] Extension disabled");
  }

  getLastSetColorKey() {
    return this._lastSetColorKey;
  }

  setKeyboardColorByKey(key) {
    const colorInfo = COLOR_MAP[key];
    if (!colorInfo) {
      log(`[KeyboardAccentSync] Invalid color key: ${key}`);
      return;
    }

    log(
      `[KeyboardAccentSync] Manual color change to: ${key} (${colorInfo.name})`
    );
    this._manualMode = true;
    this._lastSetColorKey = key;
    this._applyColor(colorInfo.hex);
  }

  syncWithSystemAccent() {
    log("[KeyboardAccentSync] Syncing with system accent");
    this._manualMode = false;

    const accentKey = this._getCurrentAccent();
    const colorInfo = COLOR_MAP[accentKey] || COLOR_MAP.blue;

    this._lastSetColorKey = accentKey;
    this._applyColor(colorInfo.hex);
  }

  _getCurrentAccent() {
    if (!this._settings) return "blue";

    const accent = this._settings.get_string("accent-color");
    const normalized = accent === "default" ? "blue" : accent;

    log(`[KeyboardAccentSync] System accent: ${accent} -> ${normalized}`);
    return normalized;
  }

  _onAccentColorChanged() {
    if (this._manualMode) {
      log("[KeyboardAccentSync] Ignoring system change (manual mode active)");
      return;
    }

    const accentKey = this._getCurrentAccent();
    if (accentKey === this._lastSetColorKey) {
      log("[KeyboardAccentSync] Accent unchanged, skipping update");
      return;
    }

    const colorInfo = COLOR_MAP[accentKey];
    if (!colorInfo) {
      log(`[KeyboardAccentSync] Unknown accent color: ${accentKey}`);
      return;
    }

    log(`[KeyboardAccentSync] Accent changed to: ${accentKey}`);
    this._lastSetColorKey = accentKey;
    this._applyColor(colorInfo.hex);

    if (this._toggle) {
      this._toggle._updateTitle();
    }
  }

  _readCurrentBrightness() {
    try {
      const [ok, stdout] = GLib.spawn_command_line_sync(
        `openrgb --device ${DEVICE_ID} --list-devices`
      );

      if (ok && stdout) {
        const output = new TextDecoder().decode(stdout);

        const match = output.match(/brightness[:\s]+(\d+)/i);
        if (match) {
          this._currentBrightness = parseInt(match[1], 10);
          log(
            `[KeyboardAccentSync] Current brightness: ${this._currentBrightness}`
          );
        }
      }
    } catch (e) {
      log(`[KeyboardAccentSync] Could not read brightness: ${e}`);
    }

    if (this._currentBrightness === null) {
      this._currentBrightness = 50;
      log("[KeyboardAccentSync] Using default brightness: 50");
    }
  }

  _applyColor(hexColor) {
    const hex = hexColor.replace("#", "");

    log(
      `[KeyboardAccentSync] Applying color: ${hexColor} with brightness: ${this._currentBrightness}`
    );

    const [cmdExists] = GLib.spawn_command_line_sync("which openrgb");
    if (!cmdExists) {
      log("[KeyboardAccentSync] ERROR: openrgb not found in PATH");
      this._showNotification("OpenRGB not found", "Please install OpenRGB");
      return;
    }

    try {
      const [success, , , exitCode] = GLib.spawn_command_line_sync(
        `openrgb --profile ${PROFILE_NAME} --color ${hex}`
      );

      if (success && exitCode === 0) {
        log("[KeyboardAccentSync] Color applied via profile");
        return;
      }
    } catch (e) {
      log(`[KeyboardAccentSync] Profile method failed: ${e}`);
    }

    const [spawned] = GLib.spawn_async(
      null,
      [
        "openrgb",
        "--device",
        DEVICE_ID.toString(),
        "--mode",
        "static",
        "--color",
        hex,
        "--brightness",
        this._currentBrightness.toString(),
      ],
      null,
      GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
      null
    );

    if (spawned) {
      log("[KeyboardAccentSync] Color command executed");
    } else {
      log("[KeyboardAccentSync] ERROR: Failed to execute openrgb");
      this._showNotification(
        "Failed to set color",
        "Check OpenRGB configuration"
      );
    }
  }

  _showNotification(title, message) {
    try {
      Main.notify(title, message);
    } catch (e) {
      log(`[KeyboardAccentSync] Notification failed: ${e}`);
    }
  }
}
