import React, { useState } from "react";
import { Sparkles, Sun, Moon, Sparkle, Heart, Volume2 } from "lucide-react";

interface Zikr {
  text: string;
  category: "morning" | "evening" | "general" | "sleep";
  source?: string;
  reward?: string;
}

const AZKAR_LIST: Zikr[] = [
  {
    text: "أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.",
    category: "morning",
    reward: "من قالها حين يصبح حُفظ في يومه"
  },
  {
    text: "اللهم بك أصبحنا، وبك أمسينا، وبك نحيا، وبك نموت، وإليك النشور.",
    category: "morning"
  },
  {
    text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ  (مائة مرة) 💫",
    category: "general",
    reward: "حطّت خطاياه وإن كانت مثل زبد البحر"
  },
  {
    text: "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ ﷺ (كررها لتنال شفاعته) ✨",
    category: "general",
    reward: "من صلى عليّ حين يصبح وحين يمسي أدركته شفاعتي"
  },
  {
    text: "أمسينَا وأمسَى المُلكُ للهِ والحمدُ للهِ، لا إلهَ إلا اللهُ وحدَه لا شريكَ له، له الملكُ وله الحمدُ وهو على كلِّ شيءٍ قديرٌ.",
    category: "evening",
    reward: "حفظ وأمان في المساء"
  },
  {
    text: "اللهم بك أمسينا، وبك أصبحنا، وبك نحيا، وبك نموت، وإليك المصير.",
    category: "evening"
  },
  {
    text: "يا حي يا قيوم برحمتك أستغيث، أصلح لي شأني كله ولا تكلني إلى نفسي طرفة عين.",
    category: "morning",
    reward: "صلاح الأحوال والبركة"
  },
  {
    text: "أستغفر الله العظيم الذي لا إله إلا هو الحي القيوم وأتوب إليه 🤲",
    category: "general",
    reward: "غفرت ذنوبه وإن فرّ من الزحف"
  },
  {
    text: "لا حَوْلَ وَلا قُوَّةَ إِلا بِاللَّهِ العلي العظيم 🌿",
    category: "general",
    reward: "كنز من كنوز الجنة"
  },
  {
    text: "لا إله إلا أنت سبحانك إني كنت من الظالمين ⭐",
    category: "general",
    reward: "تفريح الكرب والهموم"
  },
  {
    text: "باسمك ربي وضعت جنبي وبك أرفعه، إن أمسكت نفسي فارحمها، وإن أرسلتها فاحفظها بما تحفظ به عبادك الصالحين.",
    category: "sleep",
    reward: "حفظ آمن أثناء النوم"
  },
  {
    text: "اللهم قني عذابك يوم تبعث عبادك 💤",
    category: "sleep"
  },
  {
    text: "رضيت بالله رباً، وبالإسلام ديناً، وبمحمد ﷺ نبياً ورسولاً.",
    category: "morning",
    reward: "من قالها وجبت له الجنة"
  }
];

export default function AzkarMarquee() {
  const [activeCategory, setActiveCategory] = useState<"all" | "morning" | "evening" | "general" | "sleep">("all");
  const [readCount, setReadCount] = useState(0);

  const filteredAzkar = activeCategory === "all" 
    ? AZKAR_LIST 
    : AZKAR_LIST.filter(z => z.category === activeCategory);

  // Combine them into a continuous string with separators
  const fullText = filteredAzkar.map(z => {
    const symbol = z.category === "morning" ? "☀️" : z.category === "evening" ? "🌙" : z.category === "sleep" ? "💤" : "✨";
    return ` [${symbol} ${z.text} ${z.reward ? `(${z.reward})` : ""}] `;
  }).join("  ✦  ");

  return (
    <div className="w-full bg-slate-900/90 border-b border-brand-green/20 backdrop-blur-md relative z-50 text-right select-none font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs py-1.5 px-3 md:px-6 gap-2">
        
        {/* Tab filters with icons */}
        <div className="flex items-center gap-1.5 overflow-x-auto scroller-none py-0.5">
          <span className="text-[10px] text-slate-400 font-bold ml-1.5 hidden sm:inline">أذكار المسلم لربح الأجر:</span>
          
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-2 py-1 rounded-md font-bold transition-all ${
              activeCategory === "all" 
                ? "bg-brand-green text-white shadow-sm" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            الكل
          </button>
          
          <button
            onClick={() => setActiveCategory("morning")}
            className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 transition-all ${
              activeCategory === "morning" 
                ? "bg-amber-600/30 text-amber-400 border border-amber-600/50 shadow-sm" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            الصباح
          </button>

          <button
            onClick={() => setActiveCategory("evening")}
            className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 transition-all ${
              activeCategory === "evening" 
                ? "bg-indigo-600/30 text-indigo-400 border border-indigo-600/50 shadow-sm" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            المساء
          </button>

          <button
            onClick={() => setActiveCategory("sleep")}
            className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 transition-all ${
              activeCategory === "sleep" 
                ? "bg-purple-650/30 text-purple-400 border border-purple-550/50 shadow-sm" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            💤 النوم
          </button>
        </div>

        {/* The Marquee Display Box */}
        <div className="flex-1 overflow-hidden relative mx-4 h-6 w-full md:w-auto bg-slate-950/70 border border-brand-green/10 rounded-lg flex items-center shadow-inner">
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-slate-950 z-10 pointer-events-none" />
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-l from-transparent to-slate-950 z-10 pointer-events-none" />
          
          {/* Scrolling text speed is 50s, paused on hover */}
          <div 
            className="whitespace-nowrap animate-marquee hover:pause cursor-help text-[11px] text-[#00ff7f] font-medium font-sans flex items-center"
            style={{ animationDuration: "60s" }}
            title="مرّر الماوس أو إلمس الشاشة لإيقاف الحركة والقراءة بتمهل"
          >
            {fullText} {fullText}
          </div>
        </div>

        {/* Counter of completed Azkar reward tracker */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReadCount(prev => prev + 1)}
            className="bg-brand-green/20 hover:bg-brand-emerald/30 text-brand-emerald border border-brand-emerald/25 rounded-md px-2 py-1 font-black text-[10px] transition-all flex items-center gap-1 cursor-pointer active:scale-95"
            title="اضغط هنا لتسجيل قراءتك وكسب الأجر"
          >
            <Sparkles className="w-3 h-3 text-brand-emerald animate-pulse" />
            سبّحت {readCount} مرة 👍
          </button>
        </div>

      </div>
    </div>
  );
}
