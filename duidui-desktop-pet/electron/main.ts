import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } from "electron";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type PetState =
  | "idle"
  | "coding"
  | "gc"
  | "success"
  | "error"
  | "sleep"
  | "happy"
  | "curious"
  | "shy"
  | "tired"
  | "worried"
  | "excited"
  | "lonely"
  | "anti_work"
  | "meeting"
  | "overtime"
  | "requirement_change"
  | "bug_fix"
  | "pet"
  | "eat"
  | "focus"
  | "celebrate"
  | "full_gc"
  | "dragging"
  | "thinking";

type ReminderFrequency = "quiet" | "normal" | "active";
type PetWindowMode = "normal" | "focus" | "chat";
type WindowBounds = { x?: number; y?: number; width: number; height: number };
type PetSettings = {
  scale: number;
  opacity: number;
  alwaysOnTop: boolean;
  defaultState: PetState;
  autoBubbles: boolean;
  autoEmotion: boolean;
  pomodoroReminders: boolean;
  keepChatHistory: boolean;
  reminderFrequency: ReminderFrequency;
};
type ChatMessage = { id: string; role: "user" | "duidui"; text: string; createdAt: number };

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const petStates: PetState[] = [
  "idle",
  "coding",
  "gc",
  "success",
  "error",
  "sleep",
  "happy",
  "curious",
  "shy",
  "tired",
  "worried",
  "excited",
  "lonely",
  "anti_work",
  "meeting",
  "overtime",
  "requirement_change",
  "bug_fix",
  "pet",
  "eat",
  "focus",
  "celebrate",
  "full_gc",
  "dragging",
  "thinking"
];
const menuCycleStates: PetState[] = ["idle", "coding", "gc", "meeting", "overtime", "requirement_change", "bug_fix", "sleep"];
const windowSizes: Record<PetWindowMode, { width: number; height: number }> = {
  normal: { width: 260, height: 300 },
  focus: { width: 150, height: 170 },
  chat: { width: 486, height: 300 }
};

const defaultSettings: PetSettings = {
  scale: 1,
  opacity: 0.96,
  alwaysOnTop: true,
  defaultState: "idle",
  autoBubbles: true,
  autoEmotion: true,
  pomodoroReminders: true,
  keepChatHistory: true,
  reminderFrequency: "normal"
};

let petWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let currentState: PetState = defaultSettings.defaultState;
let currentSettings: PetSettings = defaultSettings;
let isQuitting = false;
let dragStart: { cursorX: number; cursorY: number; windowX: number; windowY: number } | null = null;

const settingsPath = () => path.join(app.getPath("userData"), "settings.json");
const boundsPath = () => path.join(app.getPath("userData"), "window-bounds.json");
const chatPath = () => path.join(app.getPath("userData"), "chat-history.json");

function sanitizeState(value: unknown): PetState {
  return typeof value === "string" && petStates.includes(value as PetState) ? (value as PetState) : "idle";
}

function sanitizeFrequency(value: unknown): ReminderFrequency {
  return value === "quiet" || value === "active" ? value : "normal";
}

function readJson<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) return fallback;
  try {
    return { ...fallback, ...JSON.parse(readFileSync(filePath, "utf-8")) };
  } catch {
    return fallback;
  }
}

function readArrayJson<T>(filePath: string): T[] {
  if (!existsSync(filePath)) return [];
  try {
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveJson(filePath: string, data: unknown) {
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function normalizeSettings(settings: Partial<PetSettings>): PetSettings {
  return {
    scale: Math.min(1.6, Math.max(0.55, Number(settings.scale) || defaultSettings.scale)),
    opacity: Math.min(1, Math.max(0.35, Number(settings.opacity) || defaultSettings.opacity)),
    alwaysOnTop: settings.alwaysOnTop ?? defaultSettings.alwaysOnTop,
    defaultState: sanitizeState(settings.defaultState),
    autoBubbles: settings.autoBubbles ?? defaultSettings.autoBubbles,
    autoEmotion: settings.autoEmotion ?? defaultSettings.autoEmotion,
    pomodoroReminders: settings.pomodoroReminders ?? defaultSettings.pomodoroReminders,
    keepChatHistory: settings.keepChatHistory ?? defaultSettings.keepChatHistory,
    reminderFrequency: sanitizeFrequency(settings.reminderFrequency)
  };
}

function loadSettings(): PetSettings {
  return normalizeSettings(readJson<PetSettings>(settingsPath(), defaultSettings));
}

function loadBounds(): WindowBounds {
  return readJson<WindowBounds>(boundsPath(), windowSizes.normal);
}

function saveBounds() {
  if (!petWindow || petWindow.isDestroyed()) return;
  saveJson(boundsPath(), petWindow.getBounds());
}

function loadChatHistory(): ChatMessage[] {
  return readArrayJson<ChatMessage>(chatPath()).slice(-20);
}

function saveChatHistory(messages: ChatMessage[]) {
  saveJson(chatPath(), messages.slice(-20));
  petWindow?.webContents.send("chat:history", messages.slice(-20));
  settingsWindow?.webContents.send("chat:history", messages.slice(-20));
}

function petIcon() {
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="16" fill="#f6d2a0"/>
      <path d="M18 15 C7 18, 8 39, 20 42 C29 34, 29 21, 18 15Z" fill="#7d4428"/>
      <path d="M46 15 C57 18, 56 39, 44 42 C35 34, 35 21, 46 15Z" fill="#7d4428"/>
      <ellipse cx="32" cy="32" rx="20" ry="19" fill="#a86438"/>
      <path d="M26 15 C30 25, 34 25, 38 15 C37 29, 35 34, 32 36 C29 34, 27 29, 26 15Z" fill="#7d4428" opacity="0.55"/>
      <ellipse cx="32" cy="39" rx="15" ry="10" fill="#f7e6c7"/>
      <ellipse cx="32" cy="36" rx="8" ry="6" fill="#f0c99c"/>
      <circle cx="25" cy="31" r="2.5" fill="#2d1f17"/>
      <circle cx="39" cy="31" r="2.5" fill="#2d1f17"/>
      <path d="M29 37 q3 3 6 0" stroke="#2d1f17" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M20 49 q12 7 24 0" stroke="#31b66c" stroke-width="4" fill="none" stroke-linecap="round"/>
      <rect x="19" y="44" width="26" height="10" rx="2" fill="#42535a"/>
      <path d="M23 47h7M34 47h7M27 50h10" stroke="#78e08f" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `);
  return nativeImage.createFromDataURL(`data:image/svg+xml;charset=UTF-8,${svg}`);
}

function sendState(state: PetState) {
  currentState = state;
  petWindow?.webContents.send("pet:state", state);
  settingsWindow?.webContents.send("pet:state", state);
  rebuildTrayMenu();
}

function cycleState() {
  const index = menuCycleStates.indexOf(currentState);
  sendState(menuCycleStates[(index + 1) % menuCycleStates.length]);
}

function createPetWindow() {
  const bounds = loadBounds();
  petWindow = new BrowserWindow({
    width: bounds.width || windowSizes.normal.width,
    height: bounds.height || windowSizes.normal.height,
    x: bounds.x,
    y: bounds.y,
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: currentSettings.alwaysOnTop,
    show: false,
    backgroundColor: "#00000000",
    icon: petIcon(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  petWindow.setOpacity(currentSettings.opacity);
  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (isDev) petWindow.loadURL(process.env.VITE_DEV_SERVER_URL!);
  else petWindow.loadFile(path.join(__dirname, "../dist/index.html"));

  petWindow.once("ready-to-show", () => {
    petWindow?.showInactive();
    sendState(currentSettings.defaultState);
  });

  petWindow.on("move", saveBounds);
  petWindow.on("close", (event) => {
    saveBounds();
    if (!isQuitting) {
      event.preventDefault();
      petWindow?.hide();
      rebuildTrayMenu();
    }
  });
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 470,
    height: 640,
    title: "\u5806\u5806\u8bbe\u7f6e",
    resizable: true,
    minimizable: false,
    icon: petIcon(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (isDev) settingsWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL!}?view=settings`);
  else settingsWindow.loadFile(path.join(__dirname, "../dist/index.html"), { query: { view: "settings" } });

  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
}

function showContextMenu() {
  const visible = Boolean(petWindow?.isVisible());
  const menu = Menu.buildFromTemplate([
    { label: "\u5207\u6362\u72b6\u6001", click: cycleState },
    { label: "\u6295\u5582\u5496\u5561\u8c46", click: () => sendState("eat") },
    { label: "\u8fdb\u5165\u4e13\u6ce8", click: () => sendState("focus") },
    { label: "\u4fee Bug", click: () => sendState("bug_fix") },
    { label: "\u6253\u5f00\u8bbe\u7f6e", click: createSettingsWindow },
    {
      label: currentSettings.alwaysOnTop ? "\u5173\u95ed\u7f6e\u9876" : "\u5f00\u542f\u7f6e\u9876",
      click: () => applySettings({ ...currentSettings, alwaysOnTop: !currentSettings.alwaysOnTop })
    },
    {
      label: visible ? "\u9690\u85cf" : "\u663e\u793a",
      click: () => {
        if (!petWindow) return;
        if (petWindow.isVisible()) petWindow.hide();
        else petWindow.showInactive();
        rebuildTrayMenu();
      }
    },
    { type: "separator" },
    { label: "\u9000\u51fa", click: quitApp }
  ]);
  menu.popup({ window: petWindow ?? undefined });
}

function rebuildTrayMenu() {
  if (!tray) return;
  tray.setToolTip("\u5806\u5806");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "\u663e\u793a\u684c\u5ba0", click: () => petWindow?.showInactive() },
      { label: "\u5207\u6362\u52a8\u753b\u72b6\u6001", click: cycleState },
      { label: "\u6295\u5582\u5496\u5561\u8c46", click: () => sendState("eat") },
      { label: "\u8bbe\u7f6e", click: createSettingsWindow },
      { type: "separator" },
      { label: "\u9000\u51fa\u7a0b\u5e8f", click: quitApp }
    ])
  );
}

function createTray() {
  tray = new Tray(petIcon());
  tray.on("click", () => petWindow?.showInactive());
  rebuildTrayMenu();
}

function applySettings(settings: PetSettings) {
  currentSettings = normalizeSettings(settings);
  saveJson(settingsPath(), currentSettings);
  petWindow?.setAlwaysOnTop(currentSettings.alwaysOnTop);
  petWindow?.setOpacity(currentSettings.opacity);
  petWindow?.webContents.send("settings:changed", currentSettings);
  settingsWindow?.webContents.send("settings:changed", currentSettings);
  rebuildTrayMenu();
}

function quitApp() {
  isQuitting = true;
  saveBounds();
  app.quit();
}

app.whenReady().then(() => {
  currentSettings = loadSettings();
  currentState = currentSettings.defaultState;
  createPetWindow();
  createTray();
  if (process.platform === "darwin") app.dock?.hide();
});

app.on("before-quit", () => {
  isQuitting = true;
  saveBounds();
});

app.on("window-all-closed", () => undefined);

ipcMain.handle("settings:get", () => currentSettings);
ipcMain.handle("settings:save", (_event, settings: PetSettings) => {
  const next = normalizeSettings(settings);
  applySettings(next);
  sendState(next.defaultState);
  return next;
});
ipcMain.handle("window:get-bounds", () => petWindow?.getBounds() ?? loadBounds());
ipcMain.handle("window:drag-begin", (_event, point: { screenX: number; screenY: number }) => {
  if (!petWindow) return;
  const [windowX, windowY] = petWindow.getPosition();
  dragStart = { cursorX: point.screenX, cursorY: point.screenY, windowX, windowY };
  sendState("dragging");
});
ipcMain.handle("window:drag-move", (_event, point: { screenX: number; screenY: number }) => {
  if (!petWindow || !dragStart) return;
  const x = Math.round(dragStart.windowX + point.screenX - dragStart.cursorX);
  const y = Math.round(dragStart.windowY + point.screenY - dragStart.cursorY);
  petWindow.setPosition(x, y, false);
});
ipcMain.handle("window:drag-end", () => {
  dragStart = null;
  saveBounds();
  sendState("idle");
});
ipcMain.handle("menu:context", showContextMenu);
ipcMain.handle("window:resize-pet", (_event, focused: boolean) => {
  const size = focused ? windowSizes.focus : windowSizes.normal;
  petWindow?.setSize(size.width, size.height, true);
  saveBounds();
});
ipcMain.handle("window:set-mode", (_event, mode: PetWindowMode) => {
  const size = windowSizes[mode] ?? windowSizes.normal;
  petWindow?.setSize(size.width, size.height, true);
  saveBounds();
});
ipcMain.handle("window:always-on-top", (_event, enabled: boolean) => {
  applySettings({ ...currentSettings, alwaysOnTop: Boolean(enabled) });
});
ipcMain.handle("pet:set-state", (_event, state: PetState) => {
  sendState(sanitizeState(state));
});
ipcMain.handle("chat:get-history", () => loadChatHistory());
ipcMain.handle(
  "chat:add-exchange",
  (_event, input: { text: string; reply: string; state?: PetState; keepHistory: boolean }) => {
    const now = Date.now();
    const user: ChatMessage = { id: `${now}-user`, role: "user", text: String(input.text).slice(0, 200), createdAt: now };
    const reply: ChatMessage = {
      id: `${now}-duidui`,
      role: "duidui",
      text: String(input.reply).slice(0, 240),
      createdAt: now + 1
    };
    if (input.keepHistory) saveChatHistory([...loadChatHistory(), user, reply]);
    if (input.state) sendState(sanitizeState(input.state));
    return { user, reply, state: input.state };
  }
);
ipcMain.handle("chat:clear", () => {
  saveChatHistory([]);
  return [];
});
