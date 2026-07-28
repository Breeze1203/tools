export type PetState =
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

export type ReminderFrequency = "quiet" | "normal" | "active";

export type WindowBounds = {
  x?: number;
  y?: number;
  width: number;
  height: number;
};

export type PetSettings = {
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

export type ChatMessage = {
  id: string;
  role: "user" | "duidui";
  text: string;
  createdAt: number;
};

export type ChatExchange = {
  user: ChatMessage;
  reply: ChatMessage;
  state?: PetState;
};

export type PetWindowMode = "normal" | "focus" | "chat";
