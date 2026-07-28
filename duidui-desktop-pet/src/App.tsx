import { useEffect, useMemo, useState } from "react";
import { Pet } from "./components/Pet";
import { SettingsPanel } from "./components/SettingsPanel";
import { DEFAULT_SETTINGS } from "./config/petConfig";
import type { ChatMessage, PetSettings, PetState } from "./types";

export function App() {
  const isSettings = useMemo(() => new URLSearchParams(window.location.search).get("view") === "settings", []);
  const [settings, setSettings] = useState<PetSettings>(DEFAULT_SETTINGS);
  const [state, setState] = useState<PetState>(DEFAULT_SETTINGS.defaultState);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  useEffect(() => {
    window.duidui.getSettings().then((next) => {
      setSettings(next);
      setState(next.defaultState);
    });
    window.duidui.getChatHistory().then(setChatHistory);

    const offState = window.duidui.onPetState(setState);
    const offSettings = window.duidui.onSettings(setSettings);
    const offChat = window.duidui.onChatHistory(setChatHistory);
    return () => {
      offState();
      offSettings();
      offChat();
    };
  }, []);

  if (isSettings) {
    return (
      <SettingsPanel
        settings={settings}
        state={state}
        chatHistory={chatHistory}
        onSettings={setSettings}
        onChatHistory={setChatHistory}
      />
    );
  }

  return <Pet settings={settings} state={state} chatHistory={chatHistory} onState={setState} onChatHistory={setChatHistory} />;
}
