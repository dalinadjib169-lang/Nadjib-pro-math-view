export interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  createdAt: string;
  providerUsed?: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  userName: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface GlobalSettings {
  welcomeMessage: string;
  profileImageUrl: string;
  geminiKey1: string;
  geminiKey2: string;
  geminiKey3: string;
  groqKey?: string;
  openrouterKey?: string;
  selectedModel: string; // "auto", "key1", "key2", "key3", "groq", "openrouter"
  cloudinaryCloudName: string;
  cloudinaryUploadPreset: string;
}

export interface ChatRequestPayload {
  message: string;
  history: { sender: "user" | "assistant"; text: string }[];
  adminKeys?: {
    geminiKey1?: string;
    geminiKey2?: string;
    geminiKey3?: string;
    groqKey?: string;
    openrouterKey?: string;
  };
}
