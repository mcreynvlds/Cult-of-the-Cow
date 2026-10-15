'use strict';
// Bridges to native features when running as the installed Android/iOS app (Capacitor).
// In a plain browser every call degrades gracefully.

const Native = {
  isNative: !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()),
  vibrate: true,
  _last: 0,

  plugin(name) {
    return this.isNative && window.Capacitor.Plugins ? window.Capacitor.Plugins[name] : null;
  },

  init() {
    try { this.vibrate = localStorage.getItem('cotc_vibrate') !== '0'; } catch (e) { /* ignore */ }
    if (!this.isNative) return;
    document.body.classList.add('native');
    const App = this.plugin('App');
    if (!App) return;
    // Android hardware back button: close dialogs/menus, otherwise open the pause menu.
    App.addListener('backButton', () => {
      if (UI.dialogOpen) UI.advance();
      else if (UI.menuOpen) UI.closeMenu();
      else if (Game.scene === TitleScene) App.exitApp();
      else Game.pauseMenu();
    });
    // Going to the background: save, pause the action, silence audio.
    App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        if (S && S.started) saveGame();
        if (Game.scene === Crusade && !UI.blocking() && !Crusade.over) Game.pauseMenu();
        if (Sfx.ctx) Sfx.ctx.suspend();
        Input.reset();
      } else if (Sfx.ctx && !Sfx.muted) {
        Sfx.ctx.resume();
      }
    });
  },

  setVibrate(on) {
    this.vibrate = on;
    try { localStorage.setItem('cotc_vibrate', on ? '1' : '0'); } catch (e) { /* ignore */ }
    if (on) this.haptic('medium');
  },

  // kind: 'light' | 'medium' | 'heavy'
  haptic(kind = 'light') {
    if (!this.vibrate) return;
    const now = performance.now();
    if (kind === 'light' && now - this._last < 60) return; // don't buzz on every frame of a flurry
    this._last = now;
    const H = this.plugin('Haptics');
    if (H) {
      H.impact({ style: kind === 'heavy' ? 'HEAVY' : kind === 'medium' ? 'MEDIUM' : 'LIGHT' }).catch(() => {});
    } else if (navigator.vibrate) {
      try { navigator.vibrate(kind === 'heavy' ? 45 : kind === 'medium' ? 25 : 10); } catch (e) { /* ignore */ }
    }
  },
};
