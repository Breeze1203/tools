import type { PetState } from "../types";

export type ReplyRule = {
  keywords: string[];
  replies: string[];
  state?: PetState;
};

export const DIALOG_PERSONA =
  "堆堆是 JVM 程序员伙伴，外形是原创小狗，但保留一点小水獭式的治愈气质：有点厌班、偶尔嘴碎，关键时刻靠谱。";

export const REPLY_RULES: ReplyRule[] = [
  { keywords: ["累", "疲惫"], replies: ["先喝口水吧，线程也需要短暂休眠。"], state: "tired" },
  { keywords: ["SQL", "慢"], replies: ["别急，先看看执行计划和扫描行数。"], state: "bug_fix" },
  { keywords: ["部署成功", "成功了"], replies: ["太棒了！Pod 一切正常，绿旗举起来！"], state: "celebrate" },
  { keywords: ["写不出来", "不会写"], replies: ["把问题拆小一点，我们先写第一个方法。"], state: "focus" },
  { keywords: ["晚安"], replies: ["晚安，今天的对象就让 GC 慢慢回收吧。"], state: "sleep" },
  { keywords: ["你在干嘛"], replies: ["在整理堆内存，也在等你回来。"], state: "lonely" },
  { keywords: ["不想上班", "不想干"], replies: ["我懂。先别想一整天，陪我完成眼前这一个小任务。"], state: "anti_work" },
  { keywords: ["好累", "摸鱼"], replies: ["可以摸会儿鱼，但记得回来，我帮你盯着进度。"], state: "tired" },
  { keywords: ["开会"], replies: ["会议开始了，我负责点头，你负责听重点。"], state: "meeting" },
  { keywords: ["需求又改", "需求变更"], replies: ["先深呼吸，再改字段。至少这次我们知道从哪改。"], state: "requirement_change" },
  { keywords: ["线上", "Bug", "bug", "故障"], replies: ["别慌，先看日志，不要先改代码。"], state: "bug_fix" },
  { keywords: ["下班"], replies: ["下班成功！今日线程全部优雅停机。"], state: "celebrate" },
  { keywords: ["上班", "开工", "开始干活", "番茄钟"], replies: ["唉，需求文档又亮了。行吧，先开一个小任务。"], state: "focus" },
  { keywords: ["加班"], replies: ["再坚持一下下，咖啡我抱着，日志你看着。"], state: "overtime" }
];

export const FALLBACK_REPLIES = [
  "收到。我们先把问题拆成一个能提交的小步骤。",
  "听起来有点难，但不是不能打。先看输入、日志和边界。",
  "我在。你写第一行，我负责摇尾巴和盯异常。",
  "这事像内存泄漏，先别慌，慢慢定位引用链。"
];

export function getLocalReply(input: string): { reply: string; state?: PetState } {
  const normalized = input.trim();
  const matched = REPLY_RULES.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword)));
  const replies = matched?.replies ?? FALLBACK_REPLIES;
  return {
    reply: replies[Math.floor(Math.random() * replies.length)],
    state: matched?.state
  };
}
