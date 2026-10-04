import React from 'react';
import ReactDOM from 'react-dom/client';
import { MobileApp } from './MobileApp';
import '../index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MobileApp />
  </React.StrictMode>
);

if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[PWA SW] Mobile terminal registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA SW] Mobile registration failed:', err);
      });
  });
}
