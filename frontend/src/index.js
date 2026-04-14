import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Globale stijlreset
const style = document.createElement('style');
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; padding: 0; background: #f4f6fb; }
  button:disabled { opacity: 0.4; cursor: not-allowed; }
`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
