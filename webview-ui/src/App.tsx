import React from 'react';
import './styles/blob.scss';
import flame from './assets/flame.png';

const App = () => {
  return (
    <div className="blob-container">
      <img src={flame} className="blob-flame" alt="Your Wisp" />
      <p className="blob-message">Hello, I am your Wisp 🫧</p>
    </div>
  );
};

export default App;