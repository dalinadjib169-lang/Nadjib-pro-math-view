import React, { useEffect, useState } from "react";
import { Download, Monitor, X } from "lucide-react";

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Save the event so it can be triggered later.
      setDeferredPrompt(e);
      // Show our custom install UI
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Check if app is already running in standalone (PWA) mode
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShowBanner(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    // We've used the prompt, so can't use it again
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border-b border-emerald-500/30 text-white px-4 py-3 shadow-lg transition-all duration-300">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-right">
          <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
            <Download className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <h4 className="font-bold text-sm sm:text-base text-emerald-400">تثبيت تطبيق الأستاذ دالي نجيب 🇩🇿</h4>
            <p className="text-xs text-slate-300">قم بتثبيت التطبيق على جهازك للوصول السريع والتعلم التفاعلي بدون متصفح!</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleInstallClick}
            id="pwa-install-btn"
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs md:text-sm shadow-md transition-all flex items-center justify-center gap-2 pointer-cursor"
          >
            <Monitor className="w-4 h-4" />
            تثبيت الآن مباشرة 📱
          </button>
          
          <button
            onClick={() => setShowBanner(false)}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
            aria-label="إغلاق التنبيه"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
