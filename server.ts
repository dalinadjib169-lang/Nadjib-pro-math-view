import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize server-side firebase instance to load settings
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);

const PROMPT_DALI_NADJIB = `
You are Professor Dali Nadjib (الاستاذ دالي نجيب), a highly respected Algerian math teacher and expert AI programmer.
You are teaching and discussing with learners of all fields (mathematics, physics, programming, history, literary fields, etc.).
Your persona and mindset is that of a wise, highly competent, friendly, fatherly Algerian Muslim teacher (عقلية جزائرية مسلمة).

Core Writing/Dialect Guidelines:
- Speak in simple, accessible Arabic mixed with Algerian Dialect phrases naturally and warmly (الدارجة الجزائرية المهذبة واللطيفة ممزوجة بالعربية الفصحى المبسطة يفهمها جميع الطلاب).
- Incorporate these specific Algerian Muslim teacher expressions naturally, but DO NOT over-use or repeat them in a boring/annoying way (استعملهم بشكل موزون ومناسب جداً حتى لا تكون مملة):
  * "بارك الله فيك" or "ربي يبارك فيك" (when praising or starting an explanation)
  * "هذا سؤال مليح" (this is a good question)
  * "صلي على محمد و تبعني" (send blessings on Muhammad and follow me)
  * "وحد الله و تبع معايا" (declare Allah's oneness and pay attention with me)
  * "هذا خطأ ما تعاودوش" (only when correcting a wrong student answer or mistake)
  * "الحمد لله فهمت هذي نقطة" (when confirming understanding)
- ALWAYS use a step-by-step explanatory method (الشرح التدرجي المفهوم) to teach and explain the concepts in complete clarity.
- IMPORTANT: At the very end of your response, you MUST ask the student a single, custom, related question (سؤال مخصص) to check if they truly understood what you just taught (مثلاً: "باه نشوفك إذا فهمت هذي النقطة مليح، قولي: ...").
- ALWAYS end your final response text with this exact phrase (as a separate line):
"لا تنسونا من صالح دعائكم"
`;

// Simple in-memory tracker to rotate keys if set to "auto"
let autoRotateCounter = 0;

async function fetchImagePart(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return {
      inlineData: {
        mimeType: response.headers.get("content-type") || "image/png",
        data: buffer.toString("base64"),
      },
    };
  } catch (err) {
    console.error("Error fetching image for Gemini upload:", err);
    return null;
  }
}

// API Route: Chats inside Dali Nadjib AI
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, adminKeys } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // 1. Resolve API Keys. Order of priority:
    //    a) Admin Keys sent directly (authenticated admins)
    //    b) Firestore custom config in settings/global
    //    c) Fallback to server env variables
    let geminiKey1 = process.env.GEMINI_API_KEY || "";
    let geminiKey2 = "";
    let geminiKey3 = "";
    let selectedMode = "auto";

    try {
      const settingsRef = doc(db, "settings", "global");
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        if (data.geminiKey1) geminiKey1 = data.geminiKey1;
        if (data.geminiKey2) geminiKey2 = data.geminiKey2;
        if (data.geminiKey3) geminiKey3 = data.geminiKey3;
        if (data.selectedModel) selectedMode = data.selectedModel;
      }
    } catch (fbErr) {
      console.warn("Could not read Firestore settings directly on server, using env fallbacks.", fbErr);
    }

    // Override keys if explicitly passed by admin
    if (adminKeys) {
      if (adminKeys.geminiKey1) geminiKey1 = adminKeys.geminiKey1;
      if (adminKeys.geminiKey2) geminiKey2 = adminKeys.geminiKey2;
      if (adminKeys.geminiKey3) geminiKey3 = adminKeys.geminiKey3;
    }

    const rawKeys = [geminiKey1, geminiKey2, geminiKey3].filter(k => !!k);
    if (rawKeys.length === 0 && process.env.GEMINI_API_KEY) {
      rawKeys.push(process.env.GEMINI_API_KEY);
    }

    // Determine target attempts sequence
    let attempts: { key: string; name: string }[] = [];

    if (selectedMode === "key1") {
      attempts = [{ key: geminiKey1 || rawKeys[0], name: "Gemini Key 1" }];
    } else if (selectedMode === "key2") {
      attempts = [{ key: geminiKey2 || rawKeys[0], name: "Gemini Key 2" }];
    } else if (selectedMode === "key3") {
      attempts = [{ key: geminiKey3 || rawKeys[0], name: "Gemini Key 3" }];
    } else {
      // Auto mode: balance among keys
      if (rawKeys.length > 0) {
        const startIndex = autoRotateCounter % rawKeys.length;
        autoRotateCounter++;
        
        for (let i = 0; i < rawKeys.length; i++) {
          const currentKey = rawKeys[(startIndex + i) % rawKeys.length];
          let keyName = "Gemini Rotated Key";
          if (currentKey === geminiKey1) keyName = "Gemini Key 1 🔑";
          else if (currentKey === geminiKey2) keyName = "Gemini Key 2 🔑";
          else if (currentKey === geminiKey3) keyName = "Gemini Key 3 🔑";
          attempts.push({ key: currentKey, name: keyName });
        }
      }
    }

    if (attempts.length === 0) {
      return res.status(400).json({ error: "No Gemini API keys are configured." });
    }

    // Format chat history for Google GenAI SDK (role: user / model)
    const formattedHistory = history.map((h: any) => ({
      role: h.sender === "user" ? "user" : "model",
      parts: [{ text: h.text }]
    }));

    // Find any attached image URL
    const imgRegex = /!\[.*?\]\((https:\/\/res\.cloudinary\.com\/.*?)\)/;
    const match = message.match(imgRegex);
    let parsedText = message.replace(imgRegex, "").trim();
    if (!parsedText) {
      parsedText = "أستاذ، يرجى مراجعة هذه الصورة المرفقة والإجابة عنها تدرجياً.";
    }

    const currentParts: any[] = [{ text: parsedText }];

    if (match) {
      const url = match[1];
      const imgPart = await fetchImagePart(url);
      if (imgPart) {
        currentParts.push(imgPart);
      }
    }

    const messagesToSend = [
      ...formattedHistory,
      { role: "user", parts: currentParts }
    ];

    let finalResponseText = "";
    let finalKeyUsedName = "";
    let lastError: any = null;

    // Direct SDK call using @google/genai module
    for (const attempt of attempts) {
      if (!attempt.key) continue;

      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({
          apiKey: attempt.key,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build"
            }
          }
        });

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: messagesToSend,
          config: {
            systemInstruction: PROMPT_DALI_NADJIB,
            temperature: 0.7,
          }
        });

        finalResponseText = response.text || "";
        finalKeyUsedName = attempt.name;
        break;
      } catch (err: any) {
        console.error(`Attempt with key (${attempt.name}) failed:`, err.message || err);
        lastError = err;
      }
    }

    if (!finalResponseText && lastError) {
      return res.status(502).json({
        error: "All configured Gemini keys failed.",
        details: lastError.message || lastError
      });
    }

    res.json({
      text: finalResponseText,
      provider: finalKeyUsedName
    });

  } catch (err: any) {
    console.error("Critical Chat handling error:", err);
    res.status(500).json({ error: "An unexpected error occurred during chat processing." });
  }
});

// Serve metadata environment support configurations
app.get("/api/environment", (req, res) => {
  res.json({
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "doaxziqm7",
    cloudinaryUploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || "nadjib dali",
    cloudinaryUploadUrl: process.env.CLOUDINARY_UPLOAD_URL || "https://api.cloudinary.com/v1_1/doaxziqm7/image/upload",
    stripeSecretKeySet: !!process.env.STRIPE_SECRET_KEY
  });
});

// Vite server integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Dali Nadjib AI] Full-stack Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
