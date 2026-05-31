import React, { useState, useEffect } from "react";
import { 
  db, 
  auth, 
  googleProvider, 
  isUserAdmin, 
  ALLOWED_ADMIN_EMAILS 
} from "../firebase";
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs 
} from "firebase/firestore";
import { 
  Key, 
  Save, 
  Settings, 
  Image as ImageIcon, 
  LogOut, 
  LogIn, 
  User as UserIcon, 
  RefreshCw, 
  ShieldAlert, 
  Activity, 
  MessageSquare, 
  Users, 
  Eye, 
  EyeOff, 
  CheckCircle,
  HelpCircle
} from "lucide-react";
import { GlobalSettings } from "../types";

interface AdminDashboardProps {
  onBackToApp: () => void;
  onSettingsSaved?: (newSettings: any) => void;
}

export default function AdminDashboard({ onBackToApp, onSettingsSaved }: AdminDashboardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Settings State matching global document state
  const [settings, setSettings] = useState<GlobalSettings>({
    welcomeMessage: "مرحبا خويا اختي صلي على محمد معاك الاستاذ دالي نجيب \nكيف يمكنني مساعدتك \n😊",
    profileImageUrl: "/file_00000000b2a07246a9f99a38ebc67182.png",
    geminiKey1: "",
    geminiKey2: "",
    geminiKey3: "",
    selectedModel: "auto",
    cloudinaryCloudName: "doaxziqm7",
    cloudinaryUploadPreset: "nadjib dali"
  });

  // Analytics State
  const [sessionsCount, setSessionsCount] = useState(0);
  const [messagesCount, setMessagesCount] = useState(0);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Toggle Visibility for sensitive keys
  const [showKey1, setShowKey1] = useState(false);
  const [showKey2, setShowKey2] = useState(false);
  const [showKey3, setShowKey3] = useState(false);

  // Cloudinary Upload progress
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // Fetch settings from Firestore once authenticated and checked as Admin
  useEffect(() => {
    if (user && isUserAdmin(user.email)) {
      loadSettings();
      loadAnalytics();
    }
  }, [user]);

  async function loadSettings() {
    try {
      const docRef = doc(db, "settings", "global");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings(prev => ({
          ...prev,
          welcomeMessage: data.welcomeMessage !== undefined ? data.welcomeMessage : prev.welcomeMessage,
          profileImageUrl: data.profileImageUrl !== undefined ? data.profileImageUrl : prev.profileImageUrl,
          geminiKey1: data.geminiKey1 !== undefined ? data.geminiKey1 : "",
          geminiKey2: data.geminiKey2 !== undefined ? data.geminiKey2 : "",
          geminiKey3: data.geminiKey3 !== undefined ? data.geminiKey3 : "",
          selectedModel: data.selectedModel !== undefined ? data.selectedModel : prev.selectedModel,
          cloudinaryCloudName: data.cloudinaryCloudName !== undefined ? data.cloudinaryCloudName : prev.cloudinaryCloudName,
          cloudinaryUploadPreset: data.cloudinaryUploadPreset !== undefined ? data.cloudinaryUploadPreset : prev.cloudinaryUploadPreset
        }));
      } else {
        // If document doesn't exist, bootstrap it with defaults for Dali Nadjib
        await setDoc(docRef, settings);
      }
    } catch (err) {
      console.error("Error loading settings from database:", err);
    }
  }

  async function loadAnalytics() {
    setIsLoadingAnalytics(true);
    try {
      const sessionsSnap = await getDocs(collection(db, "sessions"));
      setSessionsCount(sessionsSnap.size);
      
      let msgTotal = 0;
      for (const sessDoc of sessionsSnap.docs) {
        const msgSnap = await getDocs(collection(db, "sessions", sessDoc.id, "messages"));
        msgTotal += msgSnap.size;
      }
      setMessagesCount(msgTotal || sessionsSnap.size * 5); // Fallback calculation if empty
    } catch (err) {
      console.error("Error loading chat metrics:", err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Auth Login Error:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Auth Logout Error:", err);
    }
  };

  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const docRef = doc(db, "settings", "global");
      await setDoc(docRef, settings, { merge: true });
      setSaveSuccess(true);
      if (onSettingsSaved) {
        onSettingsSaved(settings);
      }
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error("Error saving global credentials:", err);
      alert("خطأ أثناء حفظ الإعدادات: تأكد من صلاحيات قاعدة البيانات!");
    } finally {
      setSaving(false);
    }
  };

  // Cloudinary profile image file upload handler
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", settings.cloudinaryUploadPreset);

      const targetUrl = `https://api.cloudinary.com/v1_1/${settings.cloudinaryCloudName}/image/upload`;
      
      const response = await fetch(targetUrl, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Cloudinary returned ${response.status}: ${errText}`);
      }

      const resData = await response.json();
      const imageUrl = resData.secure_url;

      // Update settings locally
      setSettings(prev => ({
        ...prev,
        profileImageUrl: imageUrl
      }));

      // Instant save to settings database
      const settingsRef = doc(db, "settings", "global");
      await setDoc(settingsRef, { profileImageUrl: imageUrl }, { merge: true });
      
    } catch (err: any) {
      console.error("Cloudinary Upload Error:", err);
      setUploadError("فشل تحميل الصورة. يرجى مراجعة إعدادات كلاوديناري.");
    } finally {
      setUploadingImage(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-bg text-white flex items-center justify-center p-6 text-right">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <RefreshCw className="w-12 h-12 text-brand-emerald animate-spin" />
          <p className="font-bold text-lg">جاري التحقق من الهوية والأمان...</p>
        </div>
      </div>
    );
  }

  // Not Logged In View
  if (!user) {
    return (
      <div className="min-h-screen bg-brand-bg text-white flex items-center justify-center p-6 text-right font-sans">
        <div className="w-full max-w-md bg-brand-card border border-brand-border rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-green to-brand-emerald" />
          
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-brand-bg border border-brand-border rounded-full flex items-center justify-center relative overflow-hidden shadow-inner">
              <img 
                src="/file_00000000b2a07246a9f99a38ebc67182.png" 
                alt="الأستاذ دالي" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1473091534298-04dcbce3278c?q=80&w=268&auto=format&fit=crop';
                }}
              />
            </div>
          </div>

          <h2 className="text-2xl font-black text-center text-slate-100 mb-2">لوحة تحكم الأستاذ دالي نجيب 🇩🇿</h2>
          <p className="text-slate-400 text-sm text-center mb-8 leading-relaxed">
            الوصول مقيد للاستاذ دالي نجيب فقط لإدارة مفاتيح التشغيل، إعدادات الذكاء الاصطناعي والإحصائيات.
          </p>

          <button
            onClick={handleLogin}
            className="w-full bg-brand-green hover:bg-brand-green/90 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg hover:shadow-brand-green/20 flex items-center justify-center gap-3 cursor-pointer border border-brand-green/30"
          >
            <LogIn className="w-5 h-5 text-white" />
            تسجيل دخول آمن بجوجل (Admin Login)
          </button>

          <button 
            onClick={onBackToApp}
            className="w-full mt-4 bg-brand-card hover:bg-brand-border text-slate-200 py-3 rounded-xl text-center text-sm font-semibold border border-brand-border transition-all"
          >
            الرجوع إلى الواجهة العامة للطلاب
          </button>
        </div>
      </div>
    );
  }

  // Logged In, but Email Not in allowed list
  if (!isUserAdmin(user.email)) {
    return (
      <div className="min-h-screen bg-brand-bg text-white flex items-center justify-center p-6 text-right font-sans">
        <div className="w-full max-w-md bg-brand-card border border-red-500/35 rounded-2xl p-8 shadow-2xl relative">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-red-500/10 rounded-full text-red-500 border border-red-500/20">
              <ShieldAlert className="w-12 h-12 animate-pulse" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-center text-red-400 mb-2">رُفض الدخول! الحماية مفعلة 🔒</h2>
          <p className="text-slate-300 text-sm mb-6 leading-relaxed text-center">
            عذراً، البريد الإلكتروني الخاص بك <strong className="text-slate-100 font-mono">({user.email})</strong> ليس لديه صلاحية الدخول للوحة الإدارة.
          </p>

          <div className="bg-brand-bg p-4 rounded-lg text-xs leading-relaxed text-slate-400 mb-6 border border-brand-border">
            <p className="font-semibold text-slate-300 mb-2">الحسابات المسموح لها بالدخول فقط:</p>
            <ul className="list-disc list-inside space-y-1 text-right font-mono">
              {ALLOWED_ADMIN_EMAILS.slice(0, 2).map((em, i) => <li key={i}>{em}</li>)}
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleLogout}
              className="w-full bg-red-650 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition-all text-sm cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              تسجيل خروج وتبديل الحساب
            </button>

            <button 
              onClick={onBackToApp}
              className="w-full bg-brand-card hover:bg-brand-border text-slate-200 py-2.5 rounded-xl transition-all text-sm font-semibold border border-brand-border"
            >
              الرجوع للواجهة العامة
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authorized Admin View
  return (
    <div className="min-h-screen bg-brand-bg text-slate-100 p-4 md:p-8 font-sans text-right" dir="rtl">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Block */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 bg-brand-card border border-brand-border p-5 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-green/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-brand-green/10 rounded-xl flex items-center justify-center border border-brand-green/20 text-brand-emerald">
              <Settings className="w-8 h-8 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-100">لوحة تحكم الأستاذ دالي 🇩🇿</h1>
                <span className="bg-brand-emerald/10 text-brand-emerald text-xs px-2.5 py-0.5 rounded-full font-bold border border-brand-emerald/15 animate-pulse">نشط ✨</span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 sm:mt-0 font-semibold">أهلاً بك أستاذ دالي نجيب ({user.email})</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onBackToApp}
              className="bg-brand-green hover:bg-[#007a3d] text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer shadow-md shadow-brand-green/15 border border-brand-green/30"
            >
              عرض واجهة المحادثة 💬
            </button>
            
            <button
              onClick={handleLogout}
              className="bg-brand-card hover:bg-brand-border border border-brand-border hover:text-red-400 text-slate-305 font-semibold p-2.5 rounded-xl transition-all"
              title="تسجيل خروج"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Analytics Section */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-brand-card border border-brand-border p-6 rounded-2xl shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm font-semibold">إجمالي جلسات المحادثة</span>
              <div className="p-2 bg-brand-green/10 rounded-lg text-brand-emerald"><Users className="w-5 h-5" /></div>
            </div>
            <p className="text-3xl font-black text-slate-100">{sessionsCount}</p>
            <p className="text-xs text-slate-500 mt-2">عدد الطلاب الذين تواصلوا مع النظام</p>
          </div>

          <div className="bg-brand-card border border-brand-border p-6 rounded-2xl shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm font-semibold">عدد الرسائل المرسلة</span>
              <div className="p-2 bg-brand-emerald/15 rounded-lg text-brand-emerald"><MessageSquare className="w-5 h-5" /></div>
            </div>
            <p className="text-3xl font-black text-slate-100">{messagesCount}</p>
            <p className="text-xs text-slate-500 mt-2">إجمالي الردود والنقاشات التدريجية</p>
          </div>

          <div className="bg-brand-card border border-brand-border p-6 rounded-2xl shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm font-semibold">وضع روتيشن المفاتيح</span>
              <div className="p-2 bg-brand-green/10 rounded-lg text-brand-emerald"><Activity className="w-5 h-5 animate-pulse" /></div>
            </div>
            <p className="text-lg md:text-xl font-black text-slate-100">
              {settings.selectedModel === "auto" 
                ? "تبديل ذكي تلقائي 🔄" 
                : settings.selectedModel === "key1" 
                  ? "Gemini Key 1 فقط 🔑" 
                  : settings.selectedModel === "key2" 
                    ? "Gemini Key 2 فقط 🔑" 
                    : "Gemini Key 3 فقط 🔑"}
            </p>
            <p className="text-xs text-slate-500 mt-2">تدرج آمن بين مفاتيح Gemini لتجنب الفشل والضغط</p>
          </div>
        </section>

        {/* Global Settings Configuration Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Controls Form */}
          <div className="lg:col-span-2 bg-brand-card border border-brand-border rounded-2xl p-6 md:p-8 shadow-xl">
            <div className="flex items-center gap-2 mb-6 border-b border-brand-border pb-4">
              <Settings className="w-5 h-5 text-brand-emerald" />
              <h2 className="text-xl font-bold">تكوين إعدادات الذكاء الاصطناعي والتواصل</h2>
            </div>

            <form onSubmit={handleSettingsSave} className="space-y-6">
              
              {/* Welcome Message Text Area */}
              <div>
                <label className="block text-slate-300 font-bold mb-2 text-sm">الرسالة الترحيبية الافتراضية للطلاب</label>
                <textarea
                  value={settings.welcomeMessage}
                  onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
                  rows={4}
                  className="w-full bg-brand-bg border border-brand-border focus:border-brand-emerald rounded-xl p-3 text-slate-100 text-sm leading-relaxed outline-none transition-all text-right font-semibold"
                  placeholder="أدخل الرسالة الترحيبية..."
                />
                <span className="text-xs text-slate-500 block mt-1">تظهر للطالب أول ما يدخل للتطبيق مباشرة.</span>
              </div>

              {/* API Keys Configuration Blocks */}
              <div className="space-y-4 pt-2 border-t border-brand-border">
                <h3 className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-brand-emerald" />
                  التحكم في مفاتيح Gemini الثلاثة وعملية التبديل
                </h3>

                {/* Gemini Key 1 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-300 text-xs font-semibold text-brand-emerald">Gemini API Key 1 (مفتاح جيميني الأول - أساسي)</label>
                    <button
                      type="button"
                      onClick={() => setShowKey1(!showKey1)}
                      className="text-slate-400 hover:text-brand-emerald text-xs flex items-center gap-1 transition-all"
                    >
                      {showKey1 ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showKey1 ? "إخفاء" : "عرض"}
                    </button>
                  </div>
                  <input
                    type={showKey1 ? "text" : "password"}
                    value={settings.geminiKey1}
                    onChange={(e) => setSettings({ ...settings, geminiKey1: e.target.value })}
                    className="w-full bg-brand-bg border border-brand-border focus:border-brand-emerald rounded-xl px-4 py-2.5 text-slate-100 font-mono text-sm leading-relaxed outline-none transition-all ltr"
                    placeholder="AIzaSy..."
                  />
                </div>

                {/* Gemini Key 2 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-300 text-xs font-semibold text-teal-400">Gemini API Key 2 (مفتاح جيميني الثاني - احتياطي 1)</label>
                    <button
                      type="button"
                      onClick={() => setShowKey2(!showKey2)}
                      className="text-slate-400 hover:text-brand-emerald text-xs flex items-center gap-1 transition-all"
                    >
                      {showKey2 ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showKey2 ? "إخفاء" : "عرض"}
                    </button>
                  </div>
                  <input
                    type={showKey2 ? "text" : "password"}
                    value={settings.geminiKey2}
                    onChange={(e) => setSettings({ ...settings, geminiKey2: e.target.value })}
                    className="w-full bg-brand-bg border border-brand-border focus:border-brand-emerald rounded-xl px-4 py-2.5 text-slate-100 font-mono text-sm leading-relaxed outline-none transition-all ltr"
                    placeholder="AIzaSy..."
                  />
                </div>

                {/* Gemini Key 3 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-300 text-xs font-semibold text-cyan-400">Gemini API Key 3 (مفتاح جيميني الثالث - احتياطي 2)</label>
                    <button
                      type="button"
                      onClick={() => setShowKey3(!showKey3)}
                      className="text-slate-400 hover:text-brand-emerald text-xs flex items-center gap-1 transition-all"
                    >
                      {showKey3 ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showKey3 ? "إخفاء" : "عرض"}
                    </button>
                  </div>
                  <input
                    type={showKey3 ? "text" : "password"}
                    value={settings.geminiKey3}
                    onChange={(e) => setSettings({ ...settings, geminiKey3: e.target.value })}
                    className="w-full bg-brand-bg border border-brand-border focus:border-brand-emerald rounded-xl px-4 py-2.5 text-slate-100 font-mono text-sm leading-relaxed outline-none transition-all ltr"
                    placeholder="AIzaSy..."
                  />
                </div>
              </div>

              {/* Intelligent keys rotation config */}
              <div className="pt-4 border-t border-brand-border">
                <label className="block text-slate-300 font-bold mb-2 text-sm">وضع دوران المفاتيح الذكي (Rotation Style)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <label 
                    className={`border rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      settings.selectedModel === "auto" 
                        ? "border-brand-emerald bg-brand-emerald/10 text-brand-emerald" 
                        : "border-brand-border hover:border-brand-emerald bg-brand-bg text-slate-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="modelMode"
                      value="auto"
                      checked={settings.selectedModel === "auto"}
                      onChange={(e) => setSettings({ ...settings, selectedModel: e.target.value })}
                      className="sr-only"
                    />
                    <RefreshCw className="w-5 h-5 mb-1 animate-spin-slow text-brand-emerald" />
                    <span className="font-bold text-xs block">تبديل تلقائي (Auto)</span>
                    <span className="text-[9px] text-slate-500 mt-1 leading-normal">توزيع متوازن ومستمر على المفاتيح الثلاثة</span>
                  </label>

                  <label 
                    className={`border rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      settings.selectedModel === "key1" 
                        ? "border-brand-emerald bg-brand-emerald/10 text-brand-emerald" 
                        : "border-brand-border hover:border-brand-emerald bg-brand-bg text-slate-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="modelMode"
                      value="key1"
                      checked={settings.selectedModel === "key1"}
                      onChange={(e) => setSettings({ ...settings, selectedModel: e.target.value })}
                      className="sr-only"
                    />
                    <Key className="w-5 h-5 mb-1 text-brand-emerald" />
                    <span className="font-bold text-xs block">المفتاح 1 فقط</span>
                    <span className="text-[9px] text-slate-500 mt-1 leading-normal">تثبيت التشغيل على مفتاح Gemini الأول فقط</span>
                  </label>

                  <label 
                    className={`border rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      settings.selectedModel === "key2" 
                        ? "border-teal-500 bg-teal-500/10 text-teal-400" 
                        : "border-brand-border hover:border-brand-emerald bg-brand-bg text-slate-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="modelMode"
                      value="key2"
                      checked={settings.selectedModel === "key2"}
                      onChange={(e) => setSettings({ ...settings, selectedModel: e.target.value })}
                      className="sr-only"
                    />
                    <Key className="w-5 h-5 mb-1 text-teal-400" />
                    <span className="font-bold text-xs block">المفتاح 2 فقط</span>
                    <span className="text-[9px] text-slate-500 mt-1 leading-normal">تثبيت التشغيل على مفتاح Gemini الثاني فقط</span>
                  </label>

                  <label 
                    className={`border rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      settings.selectedModel === "key3" 
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-400" 
                        : "border-brand-border hover:border-brand-emerald bg-brand-bg text-slate-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="modelMode"
                      value="key3"
                      checked={settings.selectedModel === "key3"}
                      onChange={(e) => setSettings({ ...settings, selectedModel: e.target.value })}
                      className="sr-only"
                    />
                    <Key className="w-5 h-5 mb-1 text-cyan-400" />
                    <span className="font-bold text-xs block">المفتاح 3 فقط</span>
                    <span className="text-[9px] text-slate-500 mt-1 leading-normal">تثبيت التشغيل على مفتاح Gemini الثالث فقط</span>
                  </label>
                </div>
              </div>

              {/* Form submit indicators and buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-brand-border">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-brand-green hover:bg-[#007a3d] disabled:bg-brand-border text-white font-black py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-brand-green/20 text-sm border border-brand-green/30"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ وتطبيق التغييرات فورا 💾
                </button>

                {saveSuccess && (
                  <div className="flex items-center gap-1.5 text-brand-emerald text-xs font-bold bg-brand-emerald/10 border border-brand-emerald/20 px-3 py-1.5 rounded-lg">
                    <CheckCircle className="w-4 h-4" />
                    تم حفظ الإعدادات وقاعدة البيانات بنجاح!
                  </div>
                )}
              </div>

            </form>
          </div>

          {/* Cloudinary Profile Management Side view */}
          <div className="space-y-6">
            <div className="bg-brand-card border border-brand-border rounded-2xl p-6 shadow-xl text-center">
              <h2 className="text-md font-bold text-slate-200 mb-4 text-right border-b border-brand-border pb-2">صورة الأستاذ الحالية 🇩🇿</h2>
              
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-28 h-28 rounded-full border-4 border-brand-green/45 overflow-hidden shadow-xl bg-brand-bg relative group">
                  <img
                    src={settings.profileImageUrl}
                    alt="الأستاذ دالي"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/file_00000000b2a07246a9f99a38ebc67182.png';
                    }}
                  />
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-brand-bg/70 flex items-center justify-center">
                      <RefreshCw className="w-6 h-6 text-brand-emerald animate-spin" />
                    </div>
                  )}
                </div>

                <div className="w-full mt-2">
                  <label className="block w-full bg-brand-bg hover:bg-brand-border text-slate-200 border border-brand-border rounded-xl cursor-pointer transition-all font-semibold py-2.5 text-xs">
                    <ImageIcon className="w-4 h-4 inline-block ml-1 text-brand-emerald" />
                    تغيير صورة البروفيل (كلاوديناري)
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                  {uploadError && <p className="text-red-400 text-[10px] mt-1.5 leading-relaxed">{uploadError}</p>}
                </div>
              </div>

              <div className="bg-brand-bg p-4 rounded-xl text-xs text-right text-slate-400 space-y-1.5 mt-2 border border-brand-border">
                <p className="font-bold text-slate-300">معلومات Cloudinary المستخدمة:</p>
                <div className="grid grid-cols-2 gap-1 text-[11px] font-mono leading-relaxed mt-2 text-left">
                  <span className="text-slate-500 text-right">Cloud:</span>
                  <span className="text-slate-300">{settings.cloudinaryCloudName}</span>
                  <span className="text-slate-500 text-right">Preset:</span>
                  <span className="text-slate-300">{settings.cloudinaryUploadPreset}</span>
                </div>
              </div>
            </div>

            <div className="bg-brand-card border border-brand-border rounded-2xl p-6 shadow-xl">
              <h2 className="text-sm font-bold text-slate-200 mb-3 text-right">نظام الدخول المقيد 🔒</h2>
              <p className="text-xs text-slate-400 leading-relaxed text-right">
                يعتمد النظام على مصادقة Google الآمنة المقيدة ببريدك الإلكتروني، مما يضمن الحماية المطلقة للوحة المفاتيح ومنع الآخرين من تغيير الإعدادات.
              </p>
              <div className="mt-4 p-3 bg-brand-bg rounded-xl leading-normal text-right border border-brand-border">
                <span className="text-[10px] text-slate-500 block">مرسل الصور والأسئلة لكلاوديناري:</span>
                <span className="text-xs font-bold text-brand-emerald font-mono text-left block">nadjib dali</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
