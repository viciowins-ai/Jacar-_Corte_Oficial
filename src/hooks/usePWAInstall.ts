import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    deferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => (typeof window !== 'undefined' ? window.deferredInstallPrompt || null : null)
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect mobile vs desktop
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isMobileDevice = /android|iphone|ipad|ipod|windows phone|mobile/.test(userAgent);
    
    setIsIOS(isIOSDevice);
    setIsMobile(isMobileDevice);

    if (window.deferredInstallPrompt) {
      setDeferredPrompt(window.deferredInstallPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.deferredInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);

      // Auto-trigger if opened in standalone tab
      if (sessionStorage.getItem('auto_trigger_pwa_install') === 'true') {
        sessionStorage.removeItem('auto_trigger_pwa_install');
        setTimeout(() => {
          promptEvent.prompt().catch(() => {});
        }, 200);
      }
    };

    const handleCustomPrompt = (e: Event) => {
      const customEvt = e as CustomEvent<BeforeInstallPromptEvent>;
      if (customEvt.detail) {
        setDeferredPrompt(customEvt.detail);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.deferredInstallPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-available', handleCustomPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-available', handleCustomPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    const promptToUse = deferredPrompt || window.deferredInstallPrompt;

    if (promptToUse) {
      try {
        await promptToUse.prompt();
        const { outcome } = await promptToUse.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          window.deferredInstallPrompt = null;
          return true;
        }
      } catch (err) {
        console.error('PWA install error:', err);
      }
      return false;
    }

    // When running inside an iframe (such as the Studio preview), Chrome prohibits
    // installing the iframe as a PWA. Open the application directly in its own tab
    // where the browser enables the native PWA install prompt.
    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      sessionStorage.setItem('auto_trigger_pwa_install', 'true');
      window.open(window.location.href, '_blank');
      return true;
    }

    return false;
  }, [deferredPrompt]);

  return {
    isInstallable: !!(deferredPrompt || window.deferredInstallPrompt),
    isInstalled,
    isIOS,
    isMobile,
    install,
  };
}
