import { contextBridge, ipcRenderer } from "electron";

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

contextBridge.exposeInMainWorld("duidui", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (settings: PetSettings) => ipcRenderer.invoke("settings:save", settings),
  getWindowBounds: () => ipcRenderer.invoke("window:get-bounds"),
  beginDrag: (point: { screenX: number; screenY: number }) => ipcRenderer.invoke("window:drag-begin", point),
  moveDrag: (point: { screenX: number; screenY: number }) => ipcRenderer.invoke("window:drag-move", point),
  endDrag: () => ipcRenderer.invoke("window:drag-end"),
  showContextMenu: () => ipcRenderer.invoke("menu:context"),
  resizePet: (focused: boolean) => ipcRenderer.invoke("window:resize-pet", focused),
  setWindowMode: (mode: PetWindowMode) => ipcRenderer.invoke("window:set-mode", mode),
  setAlwaysOnTop: (enabled: boolean) => ipcRenderer.invoke("window:always-on-top", enabled),
  setPetState: (state: PetState) => ipcRenderer.invoke("pet:set-state", state),
  getChatHistory: () => ipcRenderer.invoke("chat:get-history"),
  addChatExchange: (input: { text: string; reply: string; state?: PetState; keepHistory: boolean }) =>
    ipcRenderer.invoke("chat:add-exchange", input),
  clearChatHistory: () => ipcRenderer.invoke("chat:clear"),
  onPetState: (callback: (state: PetState) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: PetState) => callback(state);
    ipcRenderer.on("pet:state", listener);
    return () => ipcRenderer.removeListener("pet:state", listener);
  },
  onSettings: (callback: (settings: PetSettings) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, settings: PetSettings) => callback(settings);
    ipcRenderer.on("settings:changed", listener);
    return () => ipcRenderer.removeListener("settings:changed", listener);
  },
  onChatHistory: (callback: (messages: unknown[]) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, messages: unknown[]) => callback(messages);
    ipcRenderer.on("chat:history", listener);
    return () => ipcRenderer.removeListener("chat:history", listener);
  }
});
