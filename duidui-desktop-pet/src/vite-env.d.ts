/// <reference types="vite/client" />

import type { ChatExchange, ChatMessage, PetSettings, PetState, PetWindowMode, WindowBounds } from "./types";

declare global {
  interface Window {
    duidui: {
      getSettings: () => Promise<PetSettings>;
      saveSettings: (settings: PetSettings) => Promise<PetSettings>;
      getWindowBounds: () => Promise<WindowBounds>;
      beginDrag: (point: { screenX: number; screenY: number }) => Promise<void>;
      moveDrag: (point: { screenX: number; screenY: number }) => Promise<void>;
      endDrag: () => Promise<void>;
      showContextMenu: () => Promise<void>;
      resizePet: (focused: boolean) => Promise<void>;
      setWindowMode: (mode: PetWindowMode) => Promise<void>;
      setAlwaysOnTop: (enabled: boolean) => Promise<void>;
      setPetState: (state: PetState) => Promise<void>;
      getChatHistory: () => Promise<ChatMessage[]>;
      addChatExchange: (input: { text: string; reply: string; state?: PetState; keepHistory: boolean }) => Promise<ChatExchange>;
      clearChatHistory: () => Promise<ChatMessage[]>;
      onPetState: (callback: (state: PetState) => void) => () => void;
      onSettings: (callback: (settings: PetSettings) => void) => () => void;
      onChatHistory: (callback: (messages: ChatMessage[]) => void) => () => void;
    };
  }
}
