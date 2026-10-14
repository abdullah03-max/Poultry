import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { MobileApp } from './MobileApp';
import { ChickenWorkerApp } from '../chicken-shop/worker/ChickenWorkerApp';
import { ChickenShopApp } from '../chicken-shop/ChickenShopApp';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import '../index.css';

const MobileRoot: React.FC = () => {
  const [appMode, setAppMode] = useState<'chicken' | 'waste' | 'chicken-admin'>(() => {
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    const path = window.location.pathname.toLowerCase();

    if (hash.includes('chicken-management') || search.includes('chicken-management') || path.includes('chicken-management')) {
      return 'chicken-admin';
    }
    if (hash.includes('waste') || search.includes('waste') || path.includes('waste')) {
      return 'waste';
    }
    if (hash.includes('chicken') || search.includes('chicken') || path.includes('chicken')) {
      return 'chicken';
    }

    const saved = localStorage.getItem('mobile_active_app');
    if (saved === 'chicken-admin') return 'chicken-admin';
    if (saved === 'waste') return 'waste';
    // Default to Chicken Shop for Chicken App
    return 'chicken';
  });

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('chicken-management')) {
        setAppMode('chicken-admin');
      } else if (hash.includes('chicken')) {
        setAppMode('chicken');
      } else if (hash.includes('waste')) {
        setAppMode('waste');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  if (appMode === 'chicken-admin') {
    return (
      <ChickenShopApp
        standalone={true}
        onBackToWaste={() => {
          window.location.hash = '#chicken-worker';
          setAppMode('chicken');
        }}
      />
    );
  }

  if (appMode === 'chicken') {
    return <ChickenWorkerApp />;
  }

  return <MobileApp />;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <MobileRoot />
    </ErrorBoundary>
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

