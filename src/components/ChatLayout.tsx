import React, { useState, useEffect, useRef } from "react";
import { 
  db, 
  auth, 
  googleProvider, 
  isUserAdmin,
  handleFirestoreError,
  OperationType
} from "../firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { 
  doc, 
  onSnapshot, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  getDocs, 
  limit,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Trash2, 
  Settings, 
  User as UserIcon, 
  Volume2, 
  VolumeX, 
  CheckCircle, 
  Compass, 
  BookOpen, 
  AlertCircle,
  Clock,
  Sparkles,
  CloudLightning,
  RefreshCw,
  LogOut,
  HelpCircle,
  X,
  LineChart,
  LayoutGrid,
  MessageSquare
} from "lucide-react";
import { Message, GlobalSettings } from "../types";
import FunctionAnalyzer from "./FunctionAnalyzer";

interface ChatLayoutProps {
  onOpenAdmin: () => void;
}

export default function ChatLayout({ onOpenAdmin }: ChatLayoutProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<GlobalSettings>(() => {
    const cached = localStorage.getItem("dali_settings");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return {
          welcomeMessage: parsed.welcomeMessage || "مرحبا خويا اختي صلي على محمد معاك الاستاذ دالي نجيب \nكيف يمكنني مساعدتك \n😊",
          profileImageUrl: parsed.profileImageUrl || "/file_00000000b2a07246a9f99a38ebc67182.png",
          geminiKey1: "",
          geminiKey2: "",
          geminiKey3: "",
          selectedModel: parsed.selectedModel || "auto",
          cloudinaryCloudName: parsed.cloudinaryCloudName || "doaxziqm7",
          cloudinaryUploadPreset: parsed.cloudinaryUploadPreset || "nadjib dali"
        };
      } catch (e) {}
    }
    return {
      welcomeMessage: "مرحبا خويا اختي صلي على محمد معاك الاستاذ دالي نجيب \nكيف يمكنني مساعدتك \n😊",
      profileImageUrl: "/file_00000000b2a07246a9f99a38ebc67182.png",
      geminiKey1: "",
      geminiKey2: "",
      geminiKey3: "",
      selectedModel: "auto",
      cloudinaryCloudName: "doaxziqm7",
      cloudinaryUploadPreset: "nadjib dali"
    };
  });

  // Cloudinary Cloud Settings
  const [activeTab, setActiveTab] = useState<"dual" | "chat" | "plotter">("dual");

  // Local Chat Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState("");

  // Attached student image for AI analysis
  const [attachedImage, setAttachedImage] = useState("");
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  
  // Text-To-Speech (TTS)
  const [isMuted, setIsMuted] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load database settings
  useEffect(() => {
    // Standard Firestore realtime listener
    const settingsRef = doc(db, "settings", "global");
    const unsubscribe = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings(prev => {
          const updated = { ...prev, ...data };
          localStorage.setItem("dali_settings", JSON.stringify(updated));
          return updated;
        });
      }
    }, (error) => {
      console.warn("Could not synchronize settings from Firestore:", error);
      // Fallback: If it's a security/permission error, use our standard handler
      if (error.message.includes("permission") || error.message.includes("Missing or insufficient permissions")) {
        handleFirestoreError(error, OperationType.GET, "settings/global");
      }
    });

    const authUnsubscribe = onAuthStateChanged(auth, (usr) => {
      setCurrentUser(usr);
    });

    // Populate initial welcome message in local state if empty
    return () => {
      unsubscribe();
      authUnsubscribe();
    };
  }, []);

  // Set initial welcome state or update it if welcomeMessage changes realtime
  useEffect(() => {
    setMessages(prev => {
      const welcomeExists = prev.some(m => m.id === "welcome");
      if (welcomeExists) {
        return prev.map(m => m.id === "welcome" ? { ...m, text: settings.welcomeMessage } : m);
      }
      if (prev.length === 0) {
        return [
          {
            id: "welcome",
            sender: "assistant",
            text: settings.welcomeMessage,
            createdAt: new Date().toISOString()
          }
        ];
      }
      return prev;
    });
  }, [settings.welcomeMessage]);

  // Scroll to bottom of chat
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Handle student uploading a file/photo to Cloudinary for AI analysis
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAttachment(true);
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
        throw new Error("Cloudinary upload failed");
      }

      const resData = await response.json();
      setAttachedImage(resData.secure_url);
    } catch (err) {
      console.error("Attachment cloud upload failed:", err);
      alert("فشل تحميل الصورة المرفقة لكلاوديناري، يرجى التكرار.");
    } finally {
      setUploadingAttachment(false);
    }
  };

  // Speaks aloud the professor's Arabic response using SpeechSynthesis
  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      // Remove symbols and markdown
      const cleanText = text
        .replace(/[#*`_!\[\]()]/g, "")
        .replace(/لا تنسونا من صالح دعائكم.*/, "ولا تنسونا من صالح دعائكم.");
        
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "ar-DZ"; // Algerian or Arabic format
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  const submitRawQuery = async (queryText: string) => {
    if (!queryText.trim()) return;

    setLoading(true);
    const userMsgId = Date.now().toString();
    const newUserMsg: Message = {
      id: userMsgId,
      sender: "user",
      text: queryText,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, newUserMsg]);

    try {
      if (currentUser) {
        const sessionRef = doc(db, "sessions", currentUser.uid);
        await setDoc(sessionRef, {
          userId: currentUser.uid,
          userName: currentUser.displayName || currentUser.email || "طالب نجيب",
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString()
        }, { merge: true });

        await addDoc(collection(db, "sessions", currentUser.uid, "messages"), {
          sender: "user",
          text: queryText,
          createdAt: new Date().toISOString()
        });
      }
    } catch (dbErr: any) {
      console.warn("Could not write msg to firestore directly:", dbErr);
      if (dbErr.message?.includes("permission") || dbErr.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(dbErr, OperationType.WRITE, `sessions/${currentUser?.uid}`);
      }
    }

    try {
      const apiHistory = messages
        .filter(m => m.id !== "welcome")
        .map(m => ({
          sender: m.sender,
          text: m.text
        }));

      const apiRes = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: queryText,
          history: apiHistory,
          selectedModel: settings.selectedModel
        })
      });

      if (!apiRes.ok) {
        throw new Error("API conversation returned an error status");
      }

      const resData = await apiRes.json();
      const answerText = resData.text || "عذراً يا بني، وقع خطأ في معالجة الإجابة. أعد المحاولة.";
      const provider = resData.provider || "الذكاء الاصطناعي الخاص بداالي";

      setActiveProvider(provider);

      const botMsgId = (Date.now() + 1).toString();
      const newBotMsg: Message = {
        id: botMsgId,
        sender: "assistant",
        text: answerText,
        createdAt: new Date().toISOString(),
        providerUsed: provider
      };

      setMessages(prev => [...prev, newBotMsg]);

      if (!isMuted) {
        speakText(answerText);
      }

      if (currentUser) {
        await addDoc(collection(db, "sessions", currentUser.uid, "messages"), {
          sender: "assistant",
          text: answerText,
          createdAt: new Date().toISOString(),
          providerUsed: provider
        });
      }

    } catch (err: any) {
      console.error("Chat Call Failed:", err);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "assistant",
          text: "الاستاذ دالي: بارك الله فيك يا بني، عذراً هناك خلل مؤقت في مفاتيح الذكاء الاصطناعي (Gemini) حالياً. أستاذك دالي يحاول إصلاحه الآن. صلي على محمد و عاود التجربة بعد لحظات.",
          createdAt: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() && !attachedImage) return;

    const userQuery = inputValue;
    const picAttach = attachedImage;
    
    // Clear inputs
    setInputValue("");
    setAttachedImage("");

    // Append to local messages
    const userMsgId = Date.now().toString();
    let displayMessageText = userQuery;
    if (picAttach) {
      displayMessageText += `\n\n![صورة مرفقة للتحليل](${picAttach})`;
    }

    const newUserMsg: Message = {
      id: userMsgId,
      sender: "user",
      text: displayMessageText,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setLoading(true);

    // Save session in database optionally (just local persistence or save in Firestore if user is logged in)
    try {
      if (currentUser) {
        const sessionRef = doc(db, "sessions", currentUser.uid);
        // Create session parent
        await setDoc(sessionRef, {
          userId: currentUser.uid,
          userName: currentUser.displayName || currentUser.email || "طالب نجيب",
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString()
        }, { merge: true });

        // Save user message in Firestore subcollection (meets skill standards)
        await addDoc(collection(db, "sessions", currentUser.uid, "messages"), {
          sender: "user",
          text: displayMessageText,
          createdAt: new Date().toISOString()
        });
      }
    } catch (dbErr: any) {
      console.warn("Could not write msg to firestore directly:", dbErr);
      if (dbErr.message?.includes("permission") || dbErr.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(dbErr, OperationType.WRITE, `sessions/${currentUser?.uid}`);
      }
    }

    try {
      // Build conversation history for API (excluding the welcome message)
      const apiHistory = messages
        .filter(m => m.id !== "welcome")
        .map(m => ({
          sender: m.sender,
          text: m.text
        }));

      // Call our secure backend API route
      const apiRes = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: displayMessageText,
          history: apiHistory,
          selectedModel: settings.selectedModel
        })
      });

      if (!apiRes.ok) {
        throw new Error("API conversation returned an error status");
      }

      const resData = await apiRes.json();
      const answerText = resData.text || "عذراً يا بني، وقع خطأ في معالجة الإجابة. أعد المحاولة.";
      const provider = resData.provider || "الذكاء الاصطناعي الخاص بداالي";

      setActiveProvider(provider);

      const botMsgId = (Date.now() + 1).toString();
      const newBotMsg: Message = {
        id: botMsgId,
        sender: "assistant",
        text: answerText,
        createdAt: new Date().toISOString(),
        providerUsed: provider
      };

      setMessages(prev => [...prev, newBotMsg]);

      // Speak text if not muted
      if (!isMuted) {
        speakText(answerText);
      }

      // Save assistant message to database if user is logged in
      if (currentUser) {
        await addDoc(collection(db, "sessions", currentUser.uid, "messages"), {
          sender: "assistant",
          text: answerText,
          createdAt: new Date().toISOString(),
          providerUsed: provider
        });
      }

    } catch (err: any) {
      console.error("Chat Call Failed:", err);
      // Append fail message
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "assistant",
          text: "الاستاذ دالي: بارك الله فيك يا بني، عذراً هناك خلل مؤقت في مفاتيح الذكاء الاصطناعي (Gemini) حالياً. أستاذك دالي يحاول إصلاحه الآن. صلي على محمد و عاود التجربة بعد لحظات.",
          createdAt: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    if (confirm("هل تريد بالتأكيد تصفير محادثة الأستاذ والبدء من جديد؟")) {
      setMessages([
        {
          id: "welcome",
          sender: "assistant",
          text: settings.welcomeMessage,
          createdAt: new Date().toISOString()
        }
      ]);
      setAttachedImage("");
    }
  };

  // Extract Professor's question for understanding check (سؤال الفهم)
  const getLastAssisQuestion = (): string => {
    const lastMsg = [...messages].reverse().find(m => m.sender === "assistant");
    if (!lastMsg) return "";
    
    // Check if the message contains words like "سؤال", "قلي", "أوجد", "احسب" or specific prompt indicators
    // Or we scan for Dali's standard question prefix
    const text = lastMsg.text;
    const arabicQuestionWords = ["فهمت", "سؤال", "جاوبني", "احسب", "ما هي", "ماذا", "هل"];
    
    // Scan if there are lines or question indicators
    const lines = text.split("\n");
    const questionLine = lines.reverse().find(line => 
      line.includes("?") || 
      line.includes("؟") || 
      arabicQuestionWords.some(word => line.includes(word))
    );
    
    return questionLine || "";
  };

  const currentCheckQuestion = getLastAssisQuestion();

  // Helper renderer to parse text safely and convert links/images/line breaks to JSX
  const formatTextWithJSX = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      // Check for Cloudinary/Cloud Image tag
      const imgRegex = /!\[.*?\]\((https:\/\/res\.cloudinary\.com\/.*?)\)/;
      const match = line.match(imgRegex);
      if (match) {
        return (
          <div key={i} className="my-3 max-w-sm rounded-lg overflow-hidden border border-slate-700 shadow-md">
            <img referrerPolicy="no-referrer" src={match[1]} alt="حمل الطالب" className="w-[300px] h-auto object-cover" />
          </div>
        );
      }

      // Highlight Dali's custom system prompt phrases
      let formattedLine = line;
      const highlightWords = [
        "صلي على محمد و تبعني",
        "وحد الله و تبع معايا",
        "هذا سؤال مليح",
        "بارك الله فيك",
        "هذا خطأ ما تعاودوش",
        "ربي يبارك فيك",
        "الحمد لله فهمت هذي نقطة",
        "لا تنسونا من صالح دعائكم"
      ];

      return (
        <p key={i} className="mb-2 last:mb-0 leading-relaxed text-slate-100 text-sm md:text-base text-right">
          {formattedLine}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-brand-bg font-sans" dir="rtl">
      
      {/* Top Banner Grid */}
      <header className="bg-brand-card/95 backdrop-blur-md border-b border-brand-border px-4 py-3 flex items-center justify-between shadow-lg shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-brand-green shadow-inner bg-brand-bg">
              <img
                src={settings.profileImageUrl}
                alt="الأستاذ دالي"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/file_00000000b2a07246a9f99a38ebc67182.png';
                }}
              />
            </div>
            {/* Algeria Flag next to profile Pic */}
            <span className="absolute -bottom-1 -left-1 text-md" title="الجزائر 🇩🇿">🇩🇿</span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-sm md:text-base text-slate-100 uppercase tracking-tight">الأستاذ دالي نجيب AI</h1>
              <span className="bg-brand-emerald/10 text-brand-emerald text-[10px] md:text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse-border border border-brand-emerald/20">
                <Sparkles className="w-3 h-3 text-brand-emerald animate-pulse" />
                شرح تدرجي 🇩🇿
              </span>
            </div>
            <p className="text-[10px] md:text-xs text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
              <span className="text-brand-emerald tracking-wider uppercase">PROFESSOR EDITION</span>
            </p>
          </div>
        </div>

        {/* Buttons and Actions */}
        <div className="flex items-center gap-2">
          {/* TTS Audio toggle button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-xl border transition-all ${
              !isMuted 
                ? "bg-brand-emerald/15 border-brand-emerald/30 text-brand-emerald" 
                : "bg-brand-card border-brand-border text-slate-400 hover:text-slate-300 hover:bg-brand-border"
            }`}
            title={isMuted ? "تفعيل القراءة الصوتية باللغة العربية" : "كتم الصوت"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 md:w-5 h-5" /> : <Volume2 className="w-4 h-4 md:w-5 h-5 animate-pulse" />}
          </button>

          {/* Clean/Reset chat */}
          <button
            onClick={handleClearChat}
            className="p-2 bg-brand-card hover:bg-brand-border border border-brand-border rounded-xl text-slate-400 hover:text-red-400 transition-all"
            title="تصفير المحادثة والبدء من جديد"
          >
            <Trash2 className="w-4 h-4 md:w-5 h-5" />
          </button>

          {/* Secure gateway to Admin dashboard */}
          {currentUser && isUserAdmin(currentUser.email) ? (
            <button
              onClick={onOpenAdmin}
              className="bg-brand-green hover:bg-brand-green/90 text-white font-extrabold px-3 py-1.5 md:py-2 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer shadow-lg shadow-brand-green/20 border border-brand-green/30"
            >
              <Settings className="w-3.5 h-3.5 text-white animate-spin-slow" />
              لوحة التحكم ⚙️
            </button>
          ) : (
            <button
              onClick={() => {
                signInWithPopup(auth, googleProvider)
                  .then((res) => {
                    if (res.user && isUserAdmin(res.user.email)) {
                      alert("مرحباً بك أستاذ دالي! تم تفعيل زر لوحة التحكم الإدارية بنجاح.");
                    } else {
                      alert("تم تسجيل الدخول كطالب نجيب. نرحب بك للتعلم والنقاش مع الأستاذ دالي.");
                    }
                  })
                  .catch(err => console.log(err));
              }}
              className="bg-brand-card hover:bg-brand-border text-slate-200 border border-brand-border px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-slate-300" />
              دخول الأستاذ
            </button>
          )}

          {currentUser && (
            <button
              onClick={() => signOut(auth)}
              className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg text-xs"
              title="تسجيل خروج الطالب"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Re-designed Tab Bar Selection Row */}
      <div className="bg-brand-card border-b border-brand-border px-4 py-2 flex items-center justify-between gap-3 overflow-x-auto text-xs font-bold leading-none select-none shrink-0" dir="rtl">
        <div className="flex items-center gap-1 bg-brand-bg p-1.5 rounded-2xl border border-brand-border">
          <button
            type="button"
            onClick={() => {
              setActiveTab("dual");
              setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 150);
            }}
            className={`px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all text-xs cursor-pointer ${
              activeTab === "dual"
                ? "bg-brand-emerald/15 text-brand-emerald border border-brand-emerald/20 font-black"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>الوضع المزدوج الذكي 💻</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab("plotter")}
            className={`px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all text-xs cursor-pointer ${
              activeTab === "plotter"
                ? "bg-teal-500/15 text-teal-400 border border-teal-500/20 font-black"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LineChart className="w-4 h-4" />
            <span>دراسة ورسم الدوال 📈</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("chat");
              setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 150);
            }}
            className={`px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all text-xs cursor-pointer ${
              activeTab === "chat"
                ? "bg-brand-emerald/10 text-white border border-brand-border font-black"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>محادثة الأستاذ دالي 💬</span>
          </button>
        </div>
        <span className="text-[10px] text-slate-500 font-sans hidden md:inline-block"> صلي على محمد • ادرس الدوال وتحاور مع الأستاذ في آن واحد!</span>
      </div>

      {/* View Conditional Renderers */}
      {/* 1. Plotter Only View */}
      {activeTab === "plotter" && (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-brand-bg">
          <div className="max-w-7xl mx-auto">
            <FunctionAnalyzer onAskDali={submitRawQuery} isDaliAnswering={loading} />
          </div>
        </div>
      )}

      {/* 2. Chat Only View */}
      {activeTab === "chat" && (
        <div className="flex-1 flex flex-col overflow-hidden bg-brand-bg justify-between">
          
          {/* Main chat messages region */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="max-w-4xl mx-auto space-y-4">
              
              {messages.map((msg) => {
                const isUser = msg.sender === "user";
                const isWelcome = msg.id === "welcome";
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 animate-slide-up ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 md:w-10 h-10 rounded-full overflow-hidden border border-brand-green bg-brand-card shadow-md flex-shrink-0">
                        <img
                          src={settings.profileImageUrl}
                          alt="دالي"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/file_00000000b2a07246a9f99a38ebc67182.png';
                          }}
                        />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl p-4 shadow-md ${
                        isUser
                          ? "bg-brand-green text-white font-semibold rounded-tl-none text-right shadow-lg shadow-brand-green/20 border border-brand-green/30"
                          : isWelcome
                            ? "bg-brand-card border border-brand-border border-r-4 border-r-brand-green rounded-tr-none text-right"
                            : "bg-brand-card border border-brand-border border-r-2 border-r-slate-500 rounded-tr-none text-right"
                      }`}
                    >
                      <div className="text-xs text-slate-400/85 mb-1.5 flex items-center gap-1.5 justify-end">
                        {msg.providerUsed && (
                          <span className="bg-brand-bg text-brand-emerald text-[9px] px-1.5 py-0.5 rounded font-mono font-bold border border-brand-border">
                            {msg.providerUsed}
                          </span>
                        )}
                        {isWelcome && (
                          <span className="bg-brand-emerald/10 text-brand-emerald text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                            Welcome
                          </span>
                        )}
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span className="font-mono text-[11px]">{new Date(msg.createdAt).toLocaleTimeString("ar-DZ", { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div className="space-y-1 text-gray-200">
                        {formatTextWithJSX(msg.text)}
                      </div>
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 md:w-10 h-10 rounded-full border border-brand-border bg-brand-card text-brand-emerald flex items-center justify-center flex-shrink-0 shadow-md">
                        <UserIcon className="w-4 h-4 md:w-5 h-5 text-brand-emerald" />
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 md:w-10 h-10 rounded-full overflow-hidden border border-brand-green bg-brand-card shadow-md flex-shrink-0 animate-pulse">
                    <img
                      src={settings.profileImageUrl}
                      alt="دالي"
                      className="w-full h-full object-cover animate-pulse"
                    />
                  </div>

                  <div className="bg-brand-card border border-brand-border rounded-2xl rounded-tr-none p-4 shadow-md max-w-sm">
                    <div className="flex items-center gap-2 text-slate-300">
                      <RefreshCw className="w-4 h-4 text-brand-emerald animate-spin" />
                      <span className="text-xs font-bold animate-pulse">الأستاذ دالي يكتب لك الشرح الآن... صلي على محمد...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={scrollRef} />
            </div>
          </div>

          {/* Interactive Question check section */}
          {currentCheckQuestion && !loading && (
            <div className="bg-brand-green/10 border-t border-brand-border px-4 py-2.5 text-right w-full shrink-0">
              <div className="max-w-4xl mx-auto flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-brand-green/20 rounded-lg text-brand-emerald">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong className="text-brand-emerald font-black ml-1">سؤال الفهم التفاعلي:</strong> 
                    {currentCheckQuestion.replace(/باه نشوفك إذا فهمت مليح، جاوبني على هذا السؤال:|باه نشوفك إذا فهمت هذي النقطة مليح، قولي:|سؤال:/i, "").trim()}
                  </p>
                </div>
                <span className="bg-brand-emerald/10 border border-brand-emerald/20 text-brand-emerald text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap uppercase tracking-wider">
                  جاهز للحل ✏️
                </span>
              </div>
            </div>
          )}

          {/* Standard Form entry footer */}
          <footer className="bg-brand-card border-t border-brand-border px-4 py-3.5 shadow-2xl shrink-0">
            <div className="max-w-4xl mx-auto">
              
              {attachedImage && (
                <div className="bg-brand-bg border border-brand-border p-2 rounded-xl mb-3 flex items-center justify-between gap-3 animate-slide-up max-w-xs shadow-md">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 rounded-lg border border-brand-border overflow-hidden bg-brand-card">
                      <img referrerPolicy="no-referrer" src={attachedImage} alt="Attachment" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-brand-emerald">مرفق جاهز للأستاذ دالي 📸</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAttachedImage("")}
                    className="text-slate-400 hover:text-red-400 p-1.5 rounded-full hover:bg-brand-bg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="اسأل الأستاذ دالي نجيب في أي مجال (رياضيات، برمجيات، علوم...)"
                    disabled={loading}
                    className="w-full bg-brand-bg border border-brand-border focus:border-brand-emerald text-slate-100 placeholder:text-slate-500 rounded-xl pr-4 pl-12 py-3.5 text-sm outline-none text-right shadow-inner"
                  />
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <label className="p-2 hover:bg-brand-border rounded-lg text-slate-400 hover:text-brand-emerald transition-all cursor-pointer">
                      {uploadingAttachment ? (
                        <RefreshCw className="w-5 h-5 text-brand-emerald animate-spin" />
                      ) : (
                        <Paperclip className="w-5 h-5" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAttachmentUpload}
                        disabled={uploadingAttachment || loading}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || uploadingAttachment || (!inputValue.trim() && !attachedImage)}
                  className="bg-brand-green hover:bg-[#007a3d] text-white disabled:bg-brand-border disabled:text-slate-600 font-extrabold px-6 rounded-xl transition-all flex items-center justify-center gap-1.5 border border-brand-green/30 cursor-pointer text-sm"
                >
                  <span>إرسال</span>
                  <Send className="w-3.5 h-3.5 scale-x-[-1]" />
                </button>
              </form>
              <p className="text-[10px] text-slate-500 text-center mt-2.5">
                "لا تنسونا من صالح دعائكم" • الأستاذ دالي نجيب 🇩🇿
              </p>
            </div>
          </footer>
        </div>
      )}

      {/* 3. Dual Workspace Mode (Split layout on desktop, responsive layout fallback) */}
      {activeTab === "dual" && (
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 overflow-hidden bg-brand-bg">
          
          {/* Plotter solver pane */}
          <div className="col-span-12 xl:col-span-8 overflow-y-auto p-4 border-l border-brand-border/60">
            <FunctionAnalyzer onAskDali={submitRawQuery} isDaliAnswering={loading} />
          </div>

          {/* Quick Chat Pane aligned side-by-side */}
          <div className="col-span-12 xl:col-span-4 flex flex-col overflow-hidden bg-[#0a101f] border-r border-brand-border/30 h-[450px] xl:h-full">
            
            {/* Split screen scrolling listing room */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => {
                const isUser = msg.sender === "user";
                const isWelcome = msg.id === "welcome";
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 animate-slide-up ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-brand-green bg-brand-card flex-shrink-0">
                        <img
                          src={settings.profileImageUrl}
                          alt="دالي"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/file_00000000b2a07246a9f99a38ebc67182.png';
                          }}
                        />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-xl p-3.5 shadow-sm text-xs md:text-sm ${
                        isUser
                          ? "bg-brand-green text-white font-semibold rounded-tl-none text-right"
                          : "bg-brand-card border border-brand-border rounded-tr-none text-right"
                      }`}
                    >
                      {msg.providerUsed && (
                        <span className="bg-brand-bg text-brand-emerald text-[8px] px-1.5 py-0.5 rounded font-mono font-bold block mb-1.5 w-max border border-brand-border">
                          {msg.providerUsed}
                        </span>
                      )}
                      <div className="space-y-1 text-slate-100 leading-relaxed font-sans">
                        {formatTextWithJSX(msg.text)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex gap-2 justify-start items-center p-2 bg-brand-card/40 border border-brand-border rounded-xl">
                  <RefreshCw className="w-4 h-4 text-brand-emerald animate-spin" />
                  <span className="text-[10px] text-slate-400 font-bold animate-pulse">الأستاذ دالي يشرح لك الآن... صلي على محمد</span>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* In-tab mini query submission box footer */}
            <footer className="bg-brand-card border-t border-brand-border/80 px-3 py-3 shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="اسأل الأستاذ دالي عن الدالة أو أي خطوة..."
                  disabled={loading}
                  className="flex-1 bg-brand-bg border border-brand-border text-slate-100 placeholder:text-slate-500 rounded-xl px-3 py-2.5 text-xs outline-none text-right focus:border-brand-emerald transition-all"
                />
                <button
                  type="submit"
                  disabled={loading || !inputValue.trim()}
                  className="bg-brand-green hover:bg-[#007a3d] text-white disabled:bg-brand-border text-xs font-bold px-4 rounded-xl border border-brand-green/20 transition-all cursor-pointer"
                >
                  <span>أرسل 💬</span>
                </button>
              </form>
            </footer>

          </div>

        </div>
      )}

    </div>
  );
}
