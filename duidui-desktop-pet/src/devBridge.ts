import { DEFAULT_SETTINGS } from "./config/petConfig";
import type { ChatExchange, ChatMessage, PetSettings, PetState } from "./types";

const settingsKey = "duidui-dev-settings";
const chatKey = "duidui-dev-chat";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function readArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function installDevBridge() {
  if (window.duidui) return;

  let state: PetState = DEFAULT_SETTINGS.defaultState;
  const stateListeners = new Set<(state: PetState) => void>();
  const settingsListeners = new Set<(settings: PetSettings) => void>();
  const chatListeners = new Set<(messages: ChatMessage[]) => void>();

  window.duidui = {
    getSettings: async () => readJson<PetSettings>(settingsKey, DEFAULT_SETTINGS),
    saveSettings: async (settings) => {
      localStorage.setItem(settingsKey, JSON.stringify(settings));
      settingsListeners.forEach((listener) => listener(settings));
      return settings;
    },
    getWindowBounds: async () => ({ width: 220, height: 260 }),
    beginDrag: async () => undefined,
    moveDrag: async () => undefined,
    endDrag: async () => undefined,
    showContextMenu: async () => undefined,
    resizePet: async () => undefined,
    setWindowMode: async () => undefined,
    setAlwaysOnTop: async () => undefined,
    setPetState: async (next) => {
      state = next;
      stateListeners.forEach((listener) => listener(state));
    },
    getChatHistory: async () => readArray<ChatMessage>(chatKey).slice(-20),
    addChatExchange: async ({ text, reply, state: nextState, keepHistory }) => {
      const now = Date.now();
      const exchange: ChatExchange = {
        user: { id: `${now}-user`, role: "user", text, createdAt: now },
        reply: { id: `${now}-duidui`, role: "duidui", text: reply, createdAt: now + 1 },
        state: nextState
      };
      if (keepHistory) {
        const messages = [...readArray<ChatMessage>(chatKey), exchange.user, exchange.reply].slice(-20);
        localStorage.setItem(chatKey, JSON.stringify(messages));
        chatListeners.forEach((listener) => listener(messages));
      }
      if (nextState) {
        state = nextState;
        stateListeners.forEach((listener) => listener(state));
      }
      return exchange;
    },
    clearChatHistory: async () => {
      localStorage.setItem(chatKey, JSON.stringify([]));
      chatListeners.forEach((listener) => listener([]));
      return [];
    },
    onPetState: (callback) => {
      stateListeners.add(callback);
      return () => stateListeners.delete(callback);
    },
    onSettings: (callback) => {
      settingsListeners.add(callback);
      return () => settingsListeners.delete(callback);
    },
    onChatHistory: (callback) => {
      chatListeners.add(callback);
      return () => chatListeners.delete(callback);
    }
  };
}
