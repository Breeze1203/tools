import type { PetState, ReminderFrequency } from "../types";

export type EmotionRule = {
  trigger: string;
  states: PetState[];
  description: string;
};

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
export const HOVER_CURIOUS_DELAY_MS = 1000;
export const THINKING_DELAY_MS = 1100;
export const CLICK_COMBO_WINDOW_MS = 1600;

export const REMINDER_INTERVALS: Record<ReminderFrequency, number> = {
  quiet: 45 * 60 * 1000,
  normal: 25 * 60 * 1000,
  active: 15 * 60 * 1000
};

export const EMOTION_RULES: EmotionRule[] = [
  { trigger: "single_pet", states: ["happy", "shy", "pet"], description: "单击头部或身体触发摸头反馈" },
  { trigger: "combo_click", states: ["full_gc"], description: "连续点击 3 到 5 次触发 Full GC 彩蛋" },
  { trigger: "hover", states: ["curious"], description: "鼠标停留超过 1 秒进入好奇状态" },
  { trigger: "idle_30_min", states: ["coding", "tired", "lonely", "sleep"], description: "长时间未互动时低频切换" },
  { trigger: "weekday_morning", states: ["anti_work"], description: "工作日早上有概率厌班，周一优先" },
  { trigger: "error", states: ["worried", "bug_fix"], description: "错误状态转为焦虑或修 Bug" },
  { trigger: "success", states: ["excited", "celebrate"], description: "成功状态转为兴奋或庆祝" },
  { trigger: "focus_command", states: ["focus"], description: "开工或番茄钟触发专注" },
  { trigger: "meeting_command", states: ["meeting"], description: "开会关键词触发开会状态" },
  { trigger: "requirement_command", states: ["requirement_change"], description: "需求变更关键词触发" },
  { trigger: "overtime_command", states: ["overtime"], description: "加班关键词触发" },
  { trigger: "incident_command", states: ["bug_fix", "worried"], description: "线上故障关键词触发排查" },
  { trigger: "off_work_command", states: ["happy", "celebrate"], description: "下班或完成任务触发开心庆祝" }
];

export const INTEGRATION_PORTS = {
  llmReply: "dialogConfig.getLocalReply 之后可替换为真实 LLM provider",
  localHttpCommand: "petStateMachine.nextStateForCommand 可接入本地 HTTP 指令",
  gitBuildDeployEvent: "外部事件可映射 success/error/bug_fix/celebrate/focus 等状态"
};
