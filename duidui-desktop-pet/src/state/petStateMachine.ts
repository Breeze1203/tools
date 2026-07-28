import {
  CLICK_COMBO_WINDOW_MS,
  HOVER_CURIOUS_DELAY_MS,
  IDLE_TIMEOUT_MS
} from "../config/emotionConfig";
import type { PetSettings, PetState } from "../types";

export type MachineContext = {
  state: PetState;
  clickCount: number;
  lastClickAt: number;
  lastInteractionAt: number;
  settings: PetSettings;
};

export const TRANSIENT_STATES: PetState[] = ["happy", "shy", "pet", "eat", "excited", "celebrate", "full_gc", "thinking", "dragging"];
export const AUTO_IDLE_STATES: PetState[] = ["coding", "tired", "lonely", "sleep"];

export function createMachine(settings: PetSettings, initialState: PetState): MachineContext {
  return {
    state: getMorningState(new Date()) ?? initialState,
    clickCount: 0,
    lastClickAt: 0,
    lastInteractionAt: Date.now(),
    settings
  };
}

export function getMorningState(date: Date): PetState | null {
  const day = date.getDay();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const minutes = hour * 60 + minute;
  const isWorkdayMorning = day >= 1 && day <= 5 && minutes >= 8 * 60 + 30 && minutes <= 10 * 60;
  if (!isWorkdayMorning) return null;
  if (day === 1) return "anti_work";
  return Math.random() < 0.35 ? "anti_work" : null;
}

export function nextStateForPetClick(context: MachineContext, now = Date.now()): MachineContext {
  const withinWindow = now - context.lastClickAt < CLICK_COMBO_WINDOW_MS;
  const clickCount = withinWindow ? context.clickCount + 1 : 1;
  const state: PetState = clickCount >= 3 && clickCount <= 5 ? "full_gc" : clickCount >= 2 ? "shy" : "pet";
  return { ...context, state, clickCount, lastClickAt: now, lastInteractionAt: now };
}

export function nextStateForHover(context: MachineContext, hoverMs: number, now = Date.now()): MachineContext {
  if (!context.settings.autoEmotion || hoverMs < HOVER_CURIOUS_DELAY_MS) return context;
  return { ...context, state: "curious", lastInteractionAt: now };
}

export function nextStateForIdle(context: MachineContext, now = Date.now()): MachineContext {
  if (!context.settings.autoEmotion || now - context.lastInteractionAt < IDLE_TIMEOUT_MS) return context;
  return {
    ...context,
    state: AUTO_IDLE_STATES[Math.floor(Math.random() * AUTO_IDLE_STATES.length)],
    lastInteractionAt: now
  };
}

export function nextStateForMenuState(state: PetState): PetState {
  if (state === "error") return Math.random() > 0.5 ? "worried" : "bug_fix";
  if (state === "success") return Math.random() > 0.5 ? "excited" : "celebrate";
  return state;
}

export function nextStateForCommand(text: string): PetState | null {
  if (/开会/.test(text)) return "meeting";
  if (/需求变更|需求又改|改需求/.test(text)) return "requirement_change";
  if (/加班/.test(text)) return "overtime";
  if (/线上故障|线上有\s*bug|线上有\s*Bug|线上/.test(text)) return "bug_fix";
  if (/上班|开工|开始干活|番茄钟/.test(text)) return "focus";
  if (/下班|部署成功|完成/.test(text)) return "celebrate";
  return null;
}
