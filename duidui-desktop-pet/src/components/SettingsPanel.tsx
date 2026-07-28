import { useEffect, useState } from "react";
import { PET_NAME, PET_STATES } from "../config/petConfig";
import type { ChatMessage, PetSettings, PetState } from "../types";

type SettingsPanelProps = {
  settings: PetSettings;
  state: PetState;
  chatHistory: ChatMessage[];
  onSettings: (settings: PetSettings) => void;
  onChatHistory: (messages: ChatMessage[]) => void;
};

export function SettingsPanel({ settings, state, chatHistory, onSettings, onChatHistory }: SettingsPanelProps) {
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const save = async (next: PetSettings) => {
    setDraft(next);
    const savedSettings = await window.duidui.saveSettings(next);
    onSettings(savedSettings);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  };

  const clearChat = async () => {
    const empty = await window.duidui.clearChatHistory();
    onChatHistory(empty);
  };

  return (
    <main className="settings-page">
      <header>
        <span>设置</span>
        <h1>{PET_NAME}</h1>
        <p>当前状态：{PET_STATES.find((item) => item.value === state)?.label}</p>
      </header>

      <section className="settings-section">
        <label>
          <span>缩放比例</span>
          <strong>{Math.round(draft.scale * 100)}%</strong>
          <input
            type="range"
            min="0.55"
            max="1.6"
            step="0.05"
            value={draft.scale}
            onChange={(event) => save({ ...draft, scale: Number(event.target.value) })}
          />
        </label>

        <label>
          <span>透明度</span>
          <strong>{Math.round(draft.opacity * 100)}%</strong>
          <input
            type="range"
            min="0.35"
            max="1"
            step="0.05"
            value={draft.opacity}
            onChange={(event) => save({ ...draft, opacity: Number(event.target.value) })}
          />
        </label>

        <label className="switch-row">
          <span>始终置顶</span>
          <input
            type="checkbox"
            checked={draft.alwaysOnTop}
            onChange={(event) => save({ ...draft, alwaysOnTop: event.target.checked })}
          />
        </label>

        <label>
          <span>默认动画状态</span>
          <select
            value={draft.defaultState}
            onChange={(event) => save({ ...draft, defaultState: event.target.value as PetState })}
          >
            {PET_STATES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label} - {item.description}
              </option>
            ))}
          </select>
        </label>

        <label className="switch-row">
          <span>开启自动气泡</span>
          <input
            type="checkbox"
            checked={draft.autoBubbles}
            onChange={(event) => save({ ...draft, autoBubbles: event.target.checked })}
          />
        </label>

        <label className="switch-row">
          <span>开启情绪状态自动变化</span>
          <input
            type="checkbox"
            checked={draft.autoEmotion}
            onChange={(event) => save({ ...draft, autoEmotion: event.target.checked })}
          />
        </label>

        <label className="switch-row">
          <span>开启番茄钟提醒</span>
          <input
            type="checkbox"
            checked={draft.pomodoroReminders}
            onChange={(event) => save({ ...draft, pomodoroReminders: event.target.checked })}
          />
        </label>

        <label className="switch-row">
          <span>保留本地对话记录</span>
          <input
            type="checkbox"
            checked={draft.keepChatHistory}
            onChange={(event) => save({ ...draft, keepChatHistory: event.target.checked })}
          />
        </label>

        <label>
          <span>提醒频率</span>
          <select
            value={draft.reminderFrequency}
            onChange={(event) => save({ ...draft, reminderFrequency: event.target.value as PetSettings["reminderFrequency"] })}
          >
            <option value="quiet">安静</option>
            <option value="normal">普通</option>
            <option value="active">活跃</option>
          </select>
        </label>
      </section>

      <section className="history-section">
        <header>
          <strong>最近本地对话</strong>
          <button type="button" onClick={clearChat}>
            清空
          </button>
        </header>
        <div className="history-list">
          {chatHistory.length === 0 ? (
            <p>还没有保存的对话。</p>
          ) : (
            chatHistory.slice(-20).map((message) => (
              <p key={message.id} className={message.role}>
                <span>{message.role === "user" ? "你" : "堆堆"}</span>
                {message.text}
              </p>
            ))
          )}
        </div>
      </section>

      <footer>{saved ? "已保存到本地" : "调整后自动保存，重启后仍生效"}</footer>
    </main>
  );
}
