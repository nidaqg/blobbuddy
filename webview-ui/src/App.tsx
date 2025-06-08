import React, { useEffect, useState } from 'react';
import flame from './assets/flame.png';
import './styles/blob.scss';

declare global { interface Window { acquireVsCodeApi(): any; } }
const vscode = window.acquireVsCodeApi();

const App = () => {
  const [quip, setQuip] = useState("Hi there! I'm your Wisp ✨");

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.type === 'init' || msg.type === 'quip') {
        setQuip(msg.quip);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <div className="blob-container">
      <img src={flame} className="blob-flame" alt="Wisp" />
      <p className="blob-message">{quip}</p>
    </div>
  );
};

export default App;
