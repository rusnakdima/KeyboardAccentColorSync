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

      const label = new St.Label({
        text: colorDef.name,
        x_expand: true,
        x_align: Clutter.ActorAlign.START,
        style_class: "color-item-label",
      });
      this.add_child(label);

      this.connect("activate", () => {
        if (colorDef.id === "system") {
          if (this._settings) {
            this._settings.set_string("sync-mode", "system");
          }
        } else if (colorDef.id === "custom") {
          if (this._settings) {
            this._settings.set_string("sync-mode", "custom");
          }

          this._showCustomColorDialog();
          return;
        } else {
          if (this._settings) {
            this._settings.set_string("sync-mode", "custom");
            this._settings.set_string("custom-color", colorDef.color);
          }
        }
        this._updateCallback();
        this._extensionObj._updateOpenRGB();
      });
    }

    _showCustomColorDialog() {
      const colorDialog = new ModalDialog.ModalDialog({
        styleClass: "prompt-dialog",
      });

      const title = new St.Label({
        text: _("Enter Custom Color"),
        style_class: "prompt-dialog-headline",
      });

      const colorEntry = new St.Entry({
        text: this._settings
          ? this._settings.get_string("custom-color")
          : "#3584e4",
        style_class: "prompt-dialog-entry",
        can_focus: true,
      });

      const colorPreview = new St.Bin({
        style: `background-color: ${colorEntry.text}; border: 1px solid #fff; border-radius: 4px;`,
        width: 50,
        height: 30,
        x_align: Clutter.ActorAlign.CENTER,
        y_align: Clutter.ActorAlign.CENTER,
      });

      colorEntry.clutter_text.connect("text-changed", () => {
        const colorValue = colorEntry.text;
        if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorValue)) {
          colorPreview.set_style(
            `background-color: ${colorValue}; border: 1px solid #fff; border-radius: 4px;`
          );
        }
      });

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

      const buttonsLayout = new St.BoxLayout({
        vertical: false,
        style: "spacing: 10px; margin-top: 15px;",
      });

      const okButton = new St.Button({
        label: _("OK"),
        style_class: "button modal-dialog-button",
        x_expand: true,
      });

      okButton.connect("clicked", () => {
        let colorValue = colorEntry.text.trim();

        if (
          colorValue &&
          /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorValue)
        ) {
          if (!colorValue.startsWith("#")) {
            colorValue = "#" + colorValue;
          }

          if (colorValue.length === 4) {
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

          this._updateCallback();
          this._extensionObj._updateOpenRGB();
          colorDialog.close();
        } else {
          colorEntry.set_style("border: 2px solid red;");
        }
      });

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

      this.connect("activate", () => {
        if (this._settings) {
          this._settings.set_string("animation", animDef.id);
        }
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
    _init(extensionObject, settings) {
      super._init({
        title: _("Backlight Keyboard"),
        iconName: "keyboard-brightness-symbolic",
        toggleMode: false,
      });

      this._extension = extensionObject;
      this._settings = settings;

      this.menu.setHeader(
        "keyboard-brightness-symbolic",
        _("Keyboard Color Selection")
      );

      this._colorScrollView = new St.ScrollView({
        style_class: "keyboard-accent-color-menu-scroll",
        hscrollbar_policy: St.PolicyType.NEVER,
        vscrollbar_policy: St.PolicyType.AUTOMATIC,
        overlay_scrollbars: true,
      });

      this._colorSection = new PopupMenu.PopupMenuSection();

      COLORS.forEach((colorDef) => {
        const item = new ColorItem(
          colorDef,
          this._settings,
          () => this._updateSubtitle(),
          this._extension
        );
        this._colorSection.addMenuItem(item);
      });

      this._colorScrollView.child = this._colorSection.actor;

      this._colorScrollView.set_style("max-height: 300px;");

      this.menu.box.add_child(this._colorScrollView);

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
    _init(extensionObject, settings) {
      super._init({
        title: _("Animations Keyboard"),
        iconName: "preferences-system-symbolic",
        toggleMode: false,
      });

      this._extension = extensionObject;
      this._settings = settings;

      this.menu.setHeader(
        "preferences-system-symbolic",
        _("Keyboard Animation Selection")
      );

      this._animationScrollView = new St.ScrollView({
        style_class: "keyboard-accent-animation-menu-scroll",
        hscrollbar_policy: St.PolicyType.NEVER,
        vscrollbar_policy: St.PolicyType.AUTOMATIC,
        overlay_scrollbars: true,
      });

      this._animationSection = new PopupMenu.PopupMenuSection();

      ANIMATIONS.forEach((animDef) => {
        const item = new AnimationItem(
          animDef,
          this._settings,
          () => this._updateSubtitle(),
          this._extension
        );
        this._animationSection.addMenuItem(item);
      });

      this._animationScrollView.child = this._animationSection.actor;

      this._animationScrollView.set_style("max-height: 300px;");

      this.menu.box.add_child(this._animationScrollView);

      this._updateSubtitle();
      if (this._settings) {
        this._settings.connect("changed::animation", () =>
          this._updateSubtitle()
        );
      }
    }

    _updateSubtitle() {
      if (!this._settings) {
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
    _init(extensionObject, settings) {
      super._init();

      this.quickSettingsItems.push(
        new ColorSelectionToggle(extensionObject, settings)
      );
      this.quickSettingsItems.push(
        new AnimationSelectionToggle(extensionObject, settings)
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
    this._settings = this.getSettings();

    this._indicator = new ColorSyncIndicator(this, this._settings);
    Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);

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

    this._updateOpenRGB();

    this._setupSystemAccentColorListener();
  }

  _setupSystemAccentColorListener() {
    this._interfaceSettings = new Gio.Settings({
      schema_id: "org.gnome.desktop.interface",
    });

    this._accentColorChangedId = this._interfaceSettings.connect(
      "changed::accent-color",
      () => {
        const syncMode = this._settings.get_string("sync-mode");
        if (syncMode === "system") {
          this._updateOpenRGB();
        }
      }
    );
  }

  disable() {
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

    if (this._interfaceSettings && this._accentColorChangedId) {
      this._interfaceSettings.disconnect(this._accentColorChangedId);
      this._accentColorChangedId = null;
    }
    this._interfaceSettings = null;

    this._indicator?.destroy();
    this._indicator = null;

    this._settings = null;
  }

  _updateOpenRGB() {
    const enabled = this._settings.get_boolean("enabled");
    const syncMode = this._settings.get_string("sync-mode");
    const animation = this._settings.get_string("animation");

    if (!enabled) {
      return;
    }

    let colorToUse;
    if (syncMode === "system") {
      colorToUse = this._getSystemAccentColor();
    } else {
      colorToUse = this._settings.get_string("custom-color");
    }

    this._setOpenRGBColor(colorToUse, animation);
  }

  _getSystemAccentColor() {
    const interfaceSettings = new Gio.Settings({
      schema_id: "org.gnome.desktop.interface",
    });

    const accentColorValue = interfaceSettings.get_value("accent-color");

    if (
      accentColorValue &&
      !accentColorValue.get_type_string().includes("()")
    ) {
      const colorName = accentColorValue.deep_unpack();

      const colorMap = SYSTEM_COLOR_MAP;

      if (colorMap[colorName]) {
        return colorMap[colorName];
      } else {
        return "#3584e4";
      }
    } else {
      return "#3584e4";
    }
  }

  _setOpenRGBColor(color, animation) {
    const hexColor = color.replace("#", "");

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

    const [_success, _pid] = GLib.spawn_async(
      null,
      args,
      null,
      GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
      null
    );
  }
}
