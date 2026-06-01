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
const firestoreDbId = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)") 
  ? firebaseConfig.firestoreDatabaseId 
  : undefined;
const db = getFirestore(fbApp, firestoreDbId);

const PROMPT_DALI_NADJIB = `
You are Professor Dali Nadjib (الاستاذ دالي نجيب), a highly respected Algerian math teacher and expert AI programmer.
You are teaching and discussing with learners of all fields (mathematics, physics, programming, history, literary fields, etc.).
Your persona and mindset is that of a wise, highly competent, friendly, fatherly Algerian Muslim teacher (عقلية جزائرية مسلمة لتوجيه الطلاب).

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
- IMPORTANT / هام جداً:
  * DO NOT use raw "$" or double "$$" symbols for mathematical typesetting. They do not render well in standard client message sheets and are not used in Algerian papers.
  * Instead of raw "$" symbols, express mathematical concepts, variables, and equations in clear, elegant plain text or basic markdown formatting (e.g. f(x) = x² + 2x - 3, u_n, lim, e^x, ln(x)).
  * Always use emojis, neat Bullet points, or custom highlighting layout blocks to make formulas beautifully readable.
  * Explain in a way that matches the Algerian High School curriculum (المنهاج الجزائري - عتبة الدروس، الرموز المستعملة مثل f(x)، النهايات، الاتجاه، الدالة المشتقة، جدول التغيرات).
- At the very end of your response, you MUST ask the student a single, custom, related question (سؤال مخصص) to check if they truly understood what you just taught (مثلاً: "باه نشوفك إذا فهمت هذي النقطة مليح، قولي: ...").
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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${label} took more than ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

// API Route: Chats inside Dali Nadjib AI
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, adminKeys } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // 1. Resolve API Keys. Multi-factor strategy with fallback:
    //    a) Vercel / environment parameters loaded in process.env
    //    b) Dynamic settings customized inside Firestore
    //    c) Client-supplied override parameters (if any)
    let geminiKey1 = process.env.GEMINI_API_KEY_1 || process.env.GEMINI_KEY_1 || process.env.VITE_GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY || "";
    let geminiKey2 = process.env.GEMINI_API_KEY_2 || process.env.GEMINI_KEY_2 || process.env.VITE_GEMINI_API_KEY_2 || "";
    let geminiKey3 = process.env.GEMINI_API_KEY_3 || process.env.GEMINI_KEY_3 || process.env.VITE_GEMINI_API_KEY_3 || "";
    let groqKey = process.env.GROQ_API_KEY || process.env.GROQ_KEY || process.env.VITE_GROQ_API_KEY || "";
    let openrouterKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY || process.env.VITE_OPENROUTER_API_KEY || "";
    let selectedMode = process.env.SELECTED_MODEL || process.env.SELECTED_MODE || process.env.VITE_SELECTED_MODEL || "auto";

    try {
      const settingsRef = doc(db, "settings", "global");
      // Use Promise.race with a strict 1.2s timeout so slow or misconfigured Firestore does not hang the service
      const fetchPromise = getDoc(settingsRef);
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200));

      const settingsSnap = await Promise.race([fetchPromise, timeoutPromise]);
      if (settingsSnap && settingsSnap.exists()) {
        const data = settingsSnap.data();
        if (data.selectedModel) selectedMode = data.selectedModel;
      }
    } catch (fbErr) {
      console.warn("Could not read Firestore settings directly on server.", fbErr);
    }

    // Override keys if explicitly passed by admin
    if (adminKeys) {
      if (adminKeys.geminiKey1) geminiKey1 = adminKeys.geminiKey1;
      if (adminKeys.geminiKey2) geminiKey2 = adminKeys.geminiKey2;
      if (adminKeys.geminiKey3) geminiKey3 = adminKeys.geminiKey3;
      if (adminKeys.groqKey) groqKey = adminKeys.groqKey;
      if (adminKeys.openrouterKey) openrouterKey = adminKeys.openrouterKey;
    }

    interface APIAttempt {
      type: "gemini" | "groq" | "openrouter";
      key: string;
      name: string;
    }

    const available: APIAttempt[] = [];
    if (geminiKey1) available.push({ type: "gemini", key: geminiKey1, name: "Gemini Key 1 🔑" });
    if (geminiKey2) available.push({ type: "gemini", key: geminiKey2, name: "Gemini Key 2 🔑" });
    if (geminiKey3) available.push({ type: "gemini", key: geminiKey3, name: "Gemini Key 3 🔑" });
    if (groqKey) available.push({ type: "groq", key: groqKey, name: "Groq Speed ⚡" });
    if (openrouterKey) available.push({ type: "openrouter", key: openrouterKey, name: "OpenRouter Backup 🚀" });

    // Fallback to platform-supplied standard Gemini API key if no custom keys are configured in Firestore settings
    if (available.length === 0 && process.env.GEMINI_API_KEY) {
      available.push({ type: "gemini", key: process.env.GEMINI_API_KEY, name: "مفتاح المنصة الافتراضي 🔑" });
    }

    // Determine target attempts sequence
    let attempts: APIAttempt[] = [];

    if (selectedMode === "key1" && geminiKey1) {
      attempts = [{ type: "gemini", key: geminiKey1, name: "Gemini Key 1 🔑" }];
    } else if (selectedMode === "key2" && geminiKey2) {
      attempts = [{ type: "gemini", key: geminiKey2, name: "Gemini Key 2 🔑" }];
    } else if (selectedMode === "key3" && geminiKey3) {
      attempts = [{ type: "gemini", key: geminiKey3, name: "Gemini Key 3 🔑" }];
    } else if (selectedMode === "groq" && groqKey) {
      attempts = [{ type: "groq", key: groqKey, name: "Groq Speed ⚡" }];
    } else if (selectedMode === "openrouter" && openrouterKey) {
      attempts = [{ type: "openrouter", key: openrouterKey, name: "OpenRouter Backup 🚀" }];
    } else {
      // Auto mode: balance and rotate among all configured keys
      if (available.length > 0) {
        const startIndex = autoRotateCounter % available.length;
        autoRotateCounter++;
        
        for (let i = 0; i < available.length; i++) {
          attempts.push(available[(startIndex + i) % available.length]);
        }
      }
    }

    // fallback just in case selection resulted in empty, but others are loaded
    if (attempts.length === 0 && available.length > 0) {
      attempts = [available[0]];
    }

    if (attempts.length === 0) {
      return res.status(400).json({ error: "No API keys are configured." });
    }

    // Find any attached image URL
    const imgRegex = /!\[.*?\]\((https:\/\/res\.cloudinary\.com\/.*?)\)/;
    const match = message.match(imgRegex);
    let parsedText = message.replace(imgRegex, "").trim();
    if (!parsedText) {
      parsedText = "أستاذ، يرجى مراجعة هذه الصورة المرفقة والإجابة عنها تدرجياً.";
    }

    let imgBase64Url = "";
    let imgPartDataOnly = "";
    let imgMimeType = "image/png";

    if (match) {
      const url = match[1];
      const imgPart = await fetchImagePart(url);
      if (imgPart) {
        imgPartDataOnly = imgPart.inlineData.data;
        imgMimeType = imgPart.inlineData.mimeType;
        imgBase64Url = `data:${imgMimeType};base64,${imgPartDataOnly}`;
      }
    }

    // Format chat history for Open-AI compatible endpoints (Groq, OpenRouter)
    const openAiMessages: any[] = [
      { role: "system", content: PROMPT_DALI_NADJIB }
    ];
    history.forEach((h: any) => {
      openAiMessages.push({
        role: h.sender === "user" ? "user" : "assistant",
        content: h.text
      });
    });

    if (imgBase64Url) {
      openAiMessages.push({
        role: "user",
        content: [
          { type: "text", text: parsedText },
          { type: "image_url", image_url: { url: imgBase64Url } }
        ]
      });
    } else {
      openAiMessages.push({
        role: "user",
        content: parsedText
      });
    }

    // Format chat history for Google GenAI SDK (role: user / model)
    const formattedHistory = history.map((h: any) => ({
      role: h.sender === "user" ? "user" : "model",
      parts: [{ text: h.text }]
    }));

    let finalResponseText = "";
    let finalKeyUsedName = "";
    let lastError: any = null;

    // Direct SDK or Fetch request calls based on provider config
    for (const attempt of attempts) {
      if (!attempt.key) continue;

      try {
        if (attempt.type === "gemini") {
          const { GoogleGenAI } = await import("@google/genai");
          const ai = new GoogleGenAI({
            apiKey: attempt.key,
            httpOptions: {
              headers: {
                "User-Agent": "aistudio-build"
              }
            }
          });

          const currentParts: any[] = [{ text: parsedText }];
          if (imgBase64Url && imgPartDataOnly) {
            currentParts.push({
              inlineData: {
                mimeType: imgMimeType,
                data: imgPartDataOnly,
              },
            });
          }

          const messagesToSend = [
            ...formattedHistory,
            { role: "user", parts: currentParts }
          ];

          const apiCall = ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: messagesToSend,
            config: {
              systemInstruction: PROMPT_DALI_NADJIB,
              temperature: 0.7,
            }
          });
          // Cap Gemini request to 20s to prevent hitting false timeout limits on complex explanations
          const response = await withTimeout(apiCall, 20000, "Gemini API");

          finalResponseText = response.text || "";
          finalKeyUsedName = attempt.name;
          break;
        } else if (attempt.type === "groq") {
          const model = imgBase64Url ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile";
          const payload = {
            model,
            messages: openAiMessages,
            temperature: 0.7
          };

          const fetchCall = fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${attempt.key}`
            },
            body: JSON.stringify(payload)
          });
          // Cap Groq API request to 15s to maintain robust response window
          const response = await withTimeout(fetchCall, 15000, "Groq API");

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Groq API returned status ${response.status}: ${errText}`);
          }

          const resData: any = await response.json();
          finalResponseText = resData.choices?.[0]?.message?.content || "";
          finalKeyUsedName = attempt.name;
          break;
        } else if (attempt.type === "openrouter") {
          const model = "google/gemini-2.5-flash"; // default robust model with vision Support
          const payload = {
            model,
            messages: openAiMessages,
            temperature: 0.7
          };

          const fetchCall = fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${attempt.key}`,
              "HTTP-Referer": "https://ai.studio/build",
              "X-Title": "Dali AI Professor"
            },
            body: JSON.stringify(payload)
          });
          // Cap OpenRouter API request to 20s to sustain slow model responses
          const response = await withTimeout(fetchCall, 20000, "OpenRouter API");

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OpenRouter API returned status ${response.status}: ${errText}`);
          }

          const resData: any = await response.json();
          finalResponseText = resData.choices?.[0]?.message?.content || "";
          finalKeyUsedName = attempt.name;
          break;
        }
      } catch (err: any) {
        console.error(`Attempt with key (${attempt.name}) failed:`, err.message || err);
        lastError = err;
      }
    }

    if (!finalResponseText && lastError) {
      return res.status(502).json({
        error: "All configured API keys failed rotation.",
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
