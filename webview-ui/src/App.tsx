import React, { useEffect, useState } from 'react';
import flame from './assets/flame.png';
import './styles/blob.scss';

declare global {
  interface Window { acquireVsCodeApi: any; }
}
const vscode = window.acquireVsCodeApi();

const App = () => {
  const [userName, setUserName] = useState('Friend');
  const [quip, setQuip] = useState('Hello, I am your Wisp 🫧');

  useEffect(() => {
    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'init') {
        setUserName(msg.userName);
        setQuip(msg.quip);
      }
    });
  }, []);

  return (
    <div className="blob-container">
      <img src={flame} className="blob-flame" alt={userName} />
      <p className="blob-message">{quip}</p>
    </div>
  );
};

export default App;