import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // 👉 Import indispensable
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {/* 👉 On englobe toute l'application dans le routeur */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);