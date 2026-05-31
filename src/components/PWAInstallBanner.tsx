import React, { useEffect, useState } from "react";
import { Download, Monitor, Trash2, X, Smartphone, CheckCircle, Info } from "lucide-react";

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [showUninstallModal, setShowUninstallModal] = useState(false);

  useEffect(() => {
    // Check if app is open as a standalone PWA
    const checkPWAStatus = () => {
      const isStandaloneMode = 
        window.matchMedia("(display-mode: standalone)").matches || 
        (navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
      
      // If standalone model is active, show the banner enabling "Uninstall Guide"
      if (isStandaloneMode) {
        setShowBanner(true);
      }
    };

    checkPWAStatus();

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser default mini infobar
      e.preventDefault();
      // Keep triggering prompt
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // If prompt not loaded but they clicked, show custom help
      alert("الرجاء الضغط على زر المشاركة ثم 'إضافة للشاشة الرئيسية' إذا كنت تستخدم آيفون.");
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA outcome choice: ${outcome}`);
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  // If banner was dismissed manually and not in standalone
  if (!showBanner) return null;

  return (
    <div className="w-full bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border-b border-brand-green/30 text-white px-4 py-2.5 shadow-md transition-all font-sans relative z-40 text-right" dir="rtl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        
        {/* Banner Details */}
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-brand-green/20 rounded-lg text-brand-emerald">
            {isStandalone ? (
              <CheckCircle className="w-4 h-4 text-[#00ff7f] animate-pulse" />
            ) : (
              <Download className="w-4 h-4 text-emerald-400 animate-bounce" />
            )}
          </div>
          <div>
            <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
              {isStandalone ? (
                <>التطبيق مثبت كوضع الهاتف المستقل (PWA) 📱</>
              ) : (
                <>ثبّت تطبيق الأستاذ دالي نجيب على هاتفك 🇩🇿</>
              )}
            </h4>
            <p className="text-[10px] text-slate-400">
              {isStandalone ? (
                <>أنت الآن تتصفح التطبيق من الشاشة الرئيسية مباشرة وبمظهر نقي بدون متصفح.</>
              ) : (
                <>اضغط زر التثبيت في الأسفل لتنزيل التطبيق مباشرة على هاتفك أو حاسوبك دون الذهاب للمتجر!</>
              )}
            </p>
          </div>
        </div>

        {/* Action button triggers */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          
          {isStandalone ? (
            <button
              onClick={() => setShowUninstallModal(true)}
              className="px-3 py-1.5 bg-red-950/40 hover:bg-red-950/60 text-red-400 border border-red-500/30 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              إلغاء تثبيت التطبيق 🗑️
            </button>
          ) : (
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-[#00ff7f] hover:bg-emerald-400 text-slate-950 rounded-lg font-black text-[11px] flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-md"
            >
              <Smartphone className="w-3.5 h-3.5" />
              تثبيت مباشر كـ تطبيق 📲
            </button>
          )}

          <button
            onClick={() => setShowBanner(false)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-all cursor-pointer"
            title="إخفاء الشريط"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Modern Dialog instructing steps to uninstall/remove the web app */}
      {showUninstallModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[999]" dir="rtl">
          <div className="bg-brand-card border border-brand-border rounded-2xl max-w-md w-full p-6 text-right shadow-2xl relative animate-slide-up">
            
            <button
              onClick={() => setShowUninstallModal(false)}
              className="absolute left-4 top-4 p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-red-400 font-bold mb-4 border-b border-brand-border pb-2.5">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-sm md:text-base">دليل إلغاء تثبيت تطبيق الأستاذ نجيب دالي</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              نظراً لأن التطبيق مثبت من خلال خاصية <strong className="text-brand-emerald">PWA</strong> المباشرة المتوافقة مع أندرويد و iOS، فإن إزالة التطبيق تتم بسهولة تامة من خلال هاتفك مباشرة ولا تتطلب الذهاب لثلاث نقاط بالمتصفح:
            </p>

            <div className="space-y-3.5 text-xs text-slate-350 bg-slate-950 p-4 rounded-xl border border-brand-green/10">
              
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-brand-green/30 text-brand-emerald font-black flex items-center justify-center shrink-0 text-[10px]">1</span>
                <div>
                  <strong className="text-white block mb-0.5">هواتف الأندرويد (Xiaomi, Samsung, Realme):</strong>
                  <span>اضغط مطولاً على أيقونة التطبيق في شاشتك الرئيسية، ثم انقر على <strong className="text-red-400">إلغاء التثبيت (Uninstall)</strong> أو اسحب الأيقونة لأعلى وسلة المهملات.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 border-t border-brand-border pt-3">
                <span className="w-5 h-5 rounded-full bg-brand-green/30 text-brand-emerald font-black flex items-center justify-center shrink-0 text-[10px]">2</span>
                <div>
                  <strong className="text-white block mb-0.5">هواتف الآيفون (iPhone / iPad):</strong>
                  <span>اضغط مطولاً على الأيقونة في الشاشة الرئيسية، ثم اختر <strong className="text-red-400">حذف الإشارة المرجعية / حذف التطبيق (Delete Bookmark)</strong>.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 border-t border-brand-border pt-3">
                <span className="w-5 h-5 rounded-full bg-brand-green/30 text-brand-emerald font-black flex items-center justify-center shrink-0 text-[10px]">3</span>
                <div>
                  <strong className="text-white block mb-0.5">أجهزة الكمبيوتر (Chrome, Edge):</strong>
                  <span>افتح التطبيق ثم اضغط على النقاط الثلاث في أعلى يمين واجهة نافذة التطبيق المستقلة، ثم اختر <strong>إزالة تثبيت التطبيق f_m(x)...</strong></span>
                </div>
              </div>

            </div>

            <div className="mt-5 flex items-center gap-2 justify-end text-xs">
              <button
                onClick={() => setShowUninstallModal(false)}
                className="px-4 py-2 bg-brand-green text-white font-bold rounded-lg cursor-pointer hover:bg-brand-emerald transition-all active:scale-95"
              >
                فهمت الطريقة 👍
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
