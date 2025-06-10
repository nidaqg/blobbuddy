import React, { useEffect, useState } from "react";
import flame from "./assets/flame.png";
import "./styles/blob.scss";

declare global {
  interface Window {
    acquireVsCodeApi(): any;
  }
}
const vscode = window.acquireVsCodeApi();

const App = () => {
  const [quip, setQuip] = useState("Hi there! I'm your Wisp ✨");
  const [mood, setMood] = useState<"happy" | "focused" | "worried">("happy");
  const [reminderToday, setReminderToday] = useState("");
  const [reminderTomorrow, setReminderTomorrow] = useState("");

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.type === "init") {
        setQuip(msg.quip);
        setMood(msg.mood);
      } else if (msg.type === "quip") {
        setQuip(msg.quip);
      } else if (msg.type === "mood") {
        setMood(msg.mood);
      }
      if (msg.type === "reminderToday") {
        setReminderToday(msg.text);
      }
      if (msg.type === "reminderTomorrow") {
        setReminderTomorrow(msg.text);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <div className={`blob-container mood-${mood}`}>
      <img src={flame} className="blob-flame" alt="Wisp" />
      <p className="blob-message">{quip}</p>
      <div className="reminder-section">
        {reminderToday && (
          <div className="reminder-today">
            <h4>🔔 Reminder for Today:</h4>
            <p>{reminderToday}</p>
          </div>
        )}
        {reminderTomorrow && (
          <div className="reminder-tomorrow">
            <h4>🔔 Reminder for Tomorrow:</h4>
            <p>{reminderTomorrow}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
