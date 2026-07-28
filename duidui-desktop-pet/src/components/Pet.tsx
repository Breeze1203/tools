import { useEffect, useMemo, useRef, useState } from "react";
import puppyImage from "../assets/duidui-puppy.png";
import { THINKING_DELAY_MS } from "../config/emotionConfig";
import { getLocalReply } from "../config/dialogConfig";
import { BUBBLE_TEXTS, PET_NAME } from "../config/petConfig";
import {
  createMachine,
  nextStateForCommand,
  nextStateForHover,
  nextStateForIdle,
  nextStateForMenuState,
  nextStateForPetClick,
  TRANSIENT_STATES
} from "../state/petStateMachine";
import type { ChatMessage, PetSettings, PetState } from "../types";

type PetProps = {
  settings: PetSettings;
  state: PetState;
  chatHistory: ChatMessage[];
  onState: (state: PetState) => void;
  onChatHistory: (messages: ChatMessage[]) => void;
};

export function Pet({ settings, state, chatHistory, onState, onChatHistory }: PetProps) {
  const [bubble, setBubble] = useState(BUBBLE_TEXTS[0]);
  const [focused, setFocused] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(chatHistory);
  const [thinking, setThinking] = useState(false);
  const drag = useRef({ active: false, moved: false, startX: 0, startY: 0 });
  const hoverStartedAt = useRef(0);
  const hoverTimer = useRef<number | null>(null);
  const restoreTimer = useRef<number | null>(null);
  const machine = useRef(createMachine(settings, state));
  const visibleState = thinking ? "thinking" : state;

  const statusText = useMemo(() => {
    const map: Partial<Record<PetState, string>> = {
      error: "500",
      worried: "MEM?",
      bug_fix: "查日志",
      anti_work: "Monday",
      meeting: "会议中",
      overtime: "再坚持一下下",
      requirement_change: "需求 +1",
      success: "Deploy Success",
      excited: "Deploy Success",
      celebrate: "下班成功",
      full_gc: "Full GC Complete",
      focus: "专注中",
      eat: "咖啡 +1"
    };
    return map[visibleState];
  }, [visibleState]);

  useEffect(() => setLocalMessages(chatHistory), [chatHistory]);
  useEffect(() => {
    machine.current.settings = settings;
  }, [settings]);

  useEffect(() => {
    const mapped = nextStateForMenuState(state);
    machine.current.state = mapped;
    if (mapped !== state) triggerState(mapped, 4200);
  }, [state]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = nextStateForIdle(machine.current);
      if (next.state !== machine.current.state) {
        machine.current = next;
        triggerState(next.state, 8000);
      }
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  async function triggerState(next: PetState, restoreAfter = 0) {
    machine.current = { ...machine.current, state: next, lastInteractionAt: Date.now() };
    onState(next);
    await window.duidui.setPetState(next);
    if (restoreTimer.current) window.clearTimeout(restoreTimer.current);
    if (restoreAfter > 0 && TRANSIENT_STATES.includes(next)) {
      restoreTimer.current = window.setTimeout(() => {
        triggerState(settings.defaultState);
      }, restoreAfter);
    }
  }

  function pickBubble() {
    if (!settings.autoBubbles) return;
    setBubble(BUBBLE_TEXTS[Math.floor(Math.random() * BUBBLE_TEXTS.length)]);
  }

  async function handlePetClick() {
    const next = nextStateForPetClick(machine.current);
    machine.current = next;
    setBubble(next.state === "full_gc" ? "Full GC Complete" : next.state === "shy" ? "别一直点啦，脸要红了。" : "摸头收到，能量 +1。");
    await triggerState(next.state, next.state === "full_gc" ? 5200 : 3200);
  }

  async function pointerDown(event: React.PointerEvent) {
    if (event.button === 2) return;
    drag.current = { active: true, moved: false, startX: event.screenX, startY: event.screenY };
    event.currentTarget.setPointerCapture(event.pointerId);
    await window.duidui.beginDrag({ screenX: event.screenX, screenY: event.screenY });
  }

  async function pointerMove(event: React.PointerEvent) {
    if (!drag.current.active) return;
    const distance = Math.abs(event.screenX - drag.current.startX) + Math.abs(event.screenY - drag.current.startY);
    if (distance > 4) drag.current.moved = true;
    await window.duidui.moveDrag({ screenX: event.screenX, screenY: event.screenY });
  }

  async function pointerUp() {
    if (!drag.current.active) return;
    const shouldClick = !drag.current.moved;
    drag.current.active = false;
    await window.duidui.endDrag();
    if (shouldClick) await handlePetClick();
  }

  async function toggleFocus() {
    const next = !focused;
    setFocused(next);
    setChatOpen(false);
    await window.duidui.setWindowMode(next ? "focus" : "normal");
    if (next) {
      setBubble("行吧，先专注一个小任务。");
      await triggerState("focus");
    }
  }

  async function openChat(event?: React.MouseEvent) {
    event?.stopPropagation();
    setFocused(false);
    setChatOpen(true);
    await window.duidui.setWindowMode("chat");
    setBubble("说吧，我先把吐槽线程挂起。");
  }

  async function closeChat() {
    setChatOpen(false);
    await window.duidui.setWindowMode("normal");
  }

  async function submitChat(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    setThinking(true);
    onState("thinking");
    await window.duidui.setPetState("thinking");
    window.setTimeout(async () => {
      const commandState = nextStateForCommand(text);
      const local = getLocalReply(text);
      const nextState = commandState ?? local.state ?? "happy";
      const exchange = await window.duidui.addChatExchange({
        text,
        reply: local.reply,
        state: nextState,
        keepHistory: settings.keepChatHistory
      });
      const nextMessages = settings.keepChatHistory ? [...localMessages, exchange.user, exchange.reply].slice(-20) : [exchange.user, exchange.reply];
      setLocalMessages(nextMessages);
      onChatHistory(nextMessages);
      setBubble(local.reply);
      setThinking(false);
      await triggerState(nextState, nextState === "focus" ? 0 : 5000);
    }, THINKING_DELAY_MS);
  }

  function onMouseEnter() {
    pickBubble();
    hoverStartedAt.current = Date.now();
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      const next = nextStateForHover(machine.current, Date.now() - hoverStartedAt.current);
      if (next.state !== machine.current.state) {
        machine.current = next;
        triggerState("curious", 2600);
      }
    }, 1000);
  }

  function onMouseLeave() {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
  }

  return (
    <main
      className={`pet-shell image-pet state-${visibleState} ${focused ? "focus-mode" : ""} ${chatOpen ? "chat-mode" : ""}`}
      style={{ opacity: settings.opacity, transform: focused ? undefined : `scale(${settings.scale})` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onContextMenu={(event) => {
        event.preventDefault();
        window.duidui.showContextMenu();
      }}
    >
      <section className="pet-stage">
        <div className="speech-bubble compact-bubble" onClick={openChat} role="button" tabIndex={0}>
          {thinking ? "正在思考" : bubble}
          {thinking && <span className="typing-dots">...</span>}
        </div>

        <button
          className="pet-button"
          aria-label={PET_NAME}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onDoubleClick={toggleFocus}
        >
          <span className="pet-title">{PET_NAME}</span>
          <img className="puppy-art" src={puppyImage} alt={PET_NAME} draggable={false} />
          <span className="pet-shadow" />
          {statusText && <span className="status-badge">{statusText}</span>}
          <span className="state-aura" />
          <span className="heart heart-a" />
          <span className="heart heart-b" />
          <span className="jvm-halo" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="heap-meter" aria-hidden="true">
            <i />
            <i />
            <i />
            <b>heap</b>
          </span>
          <span className="tail-signal" aria-hidden="true">
            <i />
            <i />
          </span>
          <span className="log-scan" aria-hidden="true">日志扫描</span>
          <span className="code-spark spark-a" />
          <span className="code-spark spark-b" />
          <span className="coffee-prop">咖啡</span>
          <span className="headphone-prop" />
          <span className="blanket-prop" />
          <span className="flag-prop">✓</span>
          <span className="zzz-prop">Zzz</span>
          <span className="thinking-prop">...</span>
          <span className="gc-chip chip-a" />
          <span className="gc-chip chip-b" />
          <span className="gc-chip chip-c" />
          <span className="req-card-prop">需求又改</span>
          <span className="paw-wave wave-one" />
          <span className="paw-wave wave-two" />
        </button>

        <button className="laptop-hotspot" type="button" aria-label="点击笔记本对话" onClick={openChat} />
      </section>

      {chatOpen && (
        <section className="chat-panel sidecar-chat" aria-label="堆堆对话框">
          <header>
            <strong>{PET_NAME}</strong>
            <button type="button" onClick={closeChat} aria-label="关闭对话">
              ×
            </button>
          </header>
          <div className="chat-list">
            {localMessages.length === 0 ? (
              <p className="empty-chat">输入一句话，堆堆会用本地规则回复。</p>
            ) : (
              localMessages.slice(-4).map((message) => (
                <p key={message.id} className={`chat-message ${message.role}`}>
                  {message.text}
                </p>
              ))
            )}
          </div>
          <form onSubmit={submitChat}>
            <input value={input} onChange={(event) => setInput(event.target.value)} maxLength={80} placeholder="和堆堆说一句..." />
            <button type="submit">发送</button>
          </form>
        </section>
      )}
    </main>
  );
}
