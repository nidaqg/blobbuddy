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
  const [userName, setUserName] = useState("Friend");
  const [quip, setQuip] = useState("Hi there! I'm your Wisp ✨");
  const [mood, setMood] = useState<"happy" | "focused" | "worried">("happy");
  const [reminderToday, setReminderToday] = useState("");
  const [reminderTomorrow, setReminderTomorrow] = useState("");

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const { type, quip, mood, text, userName } = event.data;

      switch (type) {
        case "init":
          if (userName) {
            setUserName(userName);
          }
          setQuip(quip);
          setMood(mood);
          break;
        case "quip":
          setQuip(quip);
          break;
        case "mood":
          setMood(mood);
          break;
        case "reminderToday":
          setReminderToday(text);
          break;
        case "reminderTomorrow":
          setReminderTomorrow(text);
          break;
        default:
          break;
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
