import React, { useEffect, useState } from 'react';
import flame from './assets/flame.png';
import './styles/blob.scss';

declare global { interface Window { acquireVsCodeApi(): any; } }
const vscode = window.acquireVsCodeApi();

const App = () => {
  const [quip, setQuip] = useState("Hi there! I'm your Wisp ✨");
  const [mood, setMood] = useState<'happy'|'focused'|'worried'>('happy');

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.type === 'init') {
        setQuip(msg.quip);
        setMood(msg.mood);
      } else if (msg.type === 'quip') {
        setQuip(msg.quip);
      } else if (msg.type === 'mood') {
        setMood(msg.mood);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <div className={`blob-container mood-${mood}`}>
      <img src={flame} className="blob-flame" alt="Wisp" />
      <p className="blob-message">{quip}</p>
    </div>
  );
};

export default App;