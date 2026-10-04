import { useState, useEffect } from 'react';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed as desktop PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('[PWA] Captured beforeinstallprompt event');
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsInstalled(true);
      console.log('[PWA] Shan Poultry was installed as a desktop application.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) {
      alert(
        'To install Shan Poultry Protein on your desktop:\n\n' +
        '1. Look for the "Install App" icon (🖥️⬇️) in your browser address bar (top-right).\n' +
        '2. Or click your browser menu (⋮) -> "Install Shan Poultry Protein..."\n\n' +
        'This will create a desktop icon and start menu shortcut!'
      );
      return;
    }

    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted desktop installation');
        setIsInstalled(true);
      } else {
        console.log('[PWA] User dismissed desktop installation');
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (err) {
      console.error('[PWA] Error launching install prompt:', err);
    }
  };

  return { isInstallable, isInstalled, triggerInstall };
}
