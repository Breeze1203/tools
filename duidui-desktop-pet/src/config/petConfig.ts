import type { PetSettings, PetState } from "../types";

export const PET_NAME = "堆堆";

export const PET_STATES: Array<{ value: PetState; label: string; description: string }> = [
  { value: "idle", label: "待机", description: "抱着笔记本轻微呼吸、眨眼" },
  { value: "coding", label: "敲代码", description: "爪子快速敲键盘，屏幕滚动绿色代码" },
  { value: "gc", label: "JVM GC", description: "把漂浮对象收进背包" },
  { value: "success", label: "发布成功", description: "举起绿色小旗" },
  { value: "error", label: "错误", description: "头顶出现 500" },
  { value: "sleep", label: "休息", description: "躺着漂浮休息，冒出 Zzz" },
  { value: "happy", label: "开心", description: "眼睛弯起、尾巴轻摇、冒出小爱心" },
  { value: "curious", label: "好奇", description: "歪头看向鼠标方向" },
  { value: "shy", label: "害羞", description: "连续点击或摸头后脸红" },
  { value: "tired", label: "疲惫", description: "趴在笔记本上，动作变慢" },
  { value: "worried", label: "焦虑", description: "头顶出现内存不足或错误小图标" },
  { value: "excited", label: "兴奋", description: "部署成功或被表扬时触发" },
  { value: "lonely", label: "安静", description: "长时间未互动时独自写代码" },
  { value: "anti_work", label: "厌班", description: "趴在笔记本上，头顶出现 Monday" },
  { value: "meeting", label: "开会", description: "表面认真听讲，实际画小水獭" },
  { value: "overtime", label: "加班", description: "披着小毯子、抱咖啡" },
  { value: "requirement_change", label: "需求变更", description: "需求卡片反复横跳" },
  { value: "bug_fix", label: "修 Bug", description: "短暂崩溃后戴眼镜排查" },
  { value: "pet", label: "摸头", description: "被摸头后的开心反馈" },
  { value: "eat", label: "投喂", description: "拿起咖啡恢复能量" },
  { value: "focus", label: "专注", description: "戴耳机专注敲代码" },
  { value: "celebrate", label: "庆祝", description: "完成任务后撒彩纸" },
  { value: "full_gc", label: "Full GC", description: "连续点击彩蛋，吸走周围小对象" },
  { value: "dragging", label: "拖动", description: "被拖动时抱紧笔记本" },
  { value: "thinking", label: "思考", description: "显示正在思考气泡" }
];

export const CYCLE_STATES: PetState[] = ["idle", "coding", "gc"];

export const RANDOM_BUBBLES = [
  "堆内存还够吗？",
  "正在 GC，请稍候……",
  "Pod 一切正常！",
  "慢 SQL 已捕获。",
  "今天也要优雅发布。",
  "我不是不想上班，我只是不想打开需求文档。",
  "今天的目标：不让异常逃出 try-catch。",
  "周一的我，像刚经历 Full GC。",
  "需求又改了？先深呼吸，再改字段。",
  "加班可以，咖啡必须到位。",
  "再坚持一个番茄钟，就离下班更近一点。",
  "不想写代码没关系，先把 IDE 打开。",
  "今天先不追求完美，能推进一点就很厉害。",
  "慢 SQL 已捕获，堆堆正在分析。",
  "今日目标：优雅发布，拒绝半夜回滚。"
];

export const BUBBLE_TEXTS = RANDOM_BUBBLES;

export const COLORS = {
  fur: "#a9653b",
  furDark: "#7d4428",
  cream: "#f7e2bd",
  orange: "#e99841",
  warmBg: "#fff3df",
  laptop: "#3f5057",
  code: "#75e48a",
  error: "#db4b45",
  success: "#31b66c",
  text: "#3b2a21"
};

export const DEFAULT_SETTINGS: PetSettings = {
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
