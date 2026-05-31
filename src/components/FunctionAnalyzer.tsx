import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  HelpCircle, 
  ChevronDown, 
  Maximize2, 
  Minimize2, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Flame, 
  Plus, 
  Minus,
  MessageSquare,
  Activity,
  LineChart,
  Grid3X3,
  BookOpen,
  Info
} from "lucide-react";

// Structure of analyzed result for rendering
interface AnalysisResult {
  domainStr: string;
  limits: { bound: string; val: string; explanation: string }[];
  derivativeStr: string;
  variationDirections: { interval: string; direction: "increasing" | "decreasing" | "constant"; sign: string }[];
  asymptotes: { eq: string; type: "vertical" | "horizontal" | "oblique"; desc: string }[];
  extrema: { x: number; y: number; type: "max" | "min"; label: string }[];
}

interface FunctionAnalyzerProps {
  onAskDali: (questionText: string) => void;
  isDaliAnswering: boolean;
}

export default function FunctionAnalyzer({ onAskDali, isDaliAnswering }: FunctionAnalyzerProps) {
  // Preset function types in the Algerian curriculum
  const [funcTemplate, setFuncTemplate] = useState<"quadratic" | "homographic" | "cubic" | "asymptotic_rational" | "parametric">("homographic");
  
  // Coefficients state
  const [coeffA, setCoeffA] = useState<number>(2);
  const [coeffB, setCoeffB] = useState<number>(3);
  const [coeffC, setCoeffC] = useState<number>(1); // also used for denominator cx + d
  const [coeffD, setCoeffD] = useState<number>(-1);
  
  // Parametric parameter 'm'
  const [paramM, setParamM] = useState<number>(1);
  
  // Interactive Tangent point x0
  const [tangentX0, setTangentX0] = useState<number>(2);
  const [showTangent, setShowTangent] = useState<boolean>(true);

  // Grid Zoom & Scale setting for the custom SVG plot
  const [zoom, setZoom] = useState<number>(30); // pixels per unit
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  
  // Tracking mouse over coordinates on plot
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const plotRef = useRef<SVGSVGElement | null>(null);

  // Reset parameters when template changes
  useEffect(() => {
    if (funcTemplate === "quadratic") {
      setCoeffA(1); setCoeffB(-4); setCoeffC(3);
    } else if (funcTemplate === "homographic") {
      setCoeffA(2); setCoeffB(3); setCoeffC(1); setCoeffD(-1);
    } else if (funcTemplate === "cubic") {
      setCoeffA(1); setCoeffB(-3); setCoeffC(0); setCoeffD(2);
    } else if (funcTemplate === "asymptotic_rational") {
      setCoeffA(1); setCoeffB(-1); setCoeffC(2); setCoeffD(1); // f(x) = ax + b + c/(x - d)
    } else if (funcTemplate === "parametric") {
      setCoeffA(1); setCoeffB(-2); setCoeffC(1); // used for f_m(x) = (m*x + b)/(x - c)
    }
  }, [funcTemplate]);

  // Compute functional value y = f(x)
  const evaluateFunction = (x: number): number | null => {
    // Prevent Division by Zero & safe limiters
    try {
      if (funcTemplate === "quadratic") {
        return coeffA * x * x + coeffB * x + coeffC;
      }
      if (funcTemplate === "homographic") {
        const denom = coeffC * x + coeffD;
        if (Math.abs(denom) < 0.0001) return null;
        return (coeffA * x + coeffB) / denom;
      }
      if (funcTemplate === "cubic") {
        return coeffA * x * x * x + coeffB * x * x + coeffC * x + coeffD;
      }
      if (funcTemplate === "asymptotic_rational") {
        const denom = x - coeffD;
        if (Math.abs(denom) < 0.0001) return null;
        return coeffA * x + coeffB + coeffC / denom;
      }
      if (funcTemplate === "parametric") {
        // f_m(x) = (m * x + coeffB) / (x - coeffC)
        const denom = x - coeffC;
        if (Math.abs(denom) < 0.0001) return null;
        return (paramM * x + coeffB) / denom;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Compute formal analysis representation dynamically
  const getAnalysis = (): AnalysisResult => {
    let result: AnalysisResult = {
      domainStr: "D = IR",
      limits: [],
      derivativeStr: "",
      variationDirections: [],
      asymptotes: [],
      extrema: []
    };

    if (funcTemplate === "quadratic") {
      const a = coeffA; const b = coeffB; const c = coeffC;
      const xVertex = -b / (2 * a);
      const yVertex = a * xVertex * xVertex + b * xVertex + c;
      const arrowSymbol1 = a > 0 ? "متناقصة تماماً ↘️" : "متزايدة تماماً ↗️";
      const arrowSymbol2 = a > 0 ? "متزايدة تماماً ↗️" : "متناقصة تماماً ↘️";
      
      const limInf = a > 0 ? "+∞" : "-∞";

      result.domainStr = "D = IR = ]-∞ , +∞[";
      result.limits = [
        { bound: "-∞", val: limInf, explanation: `نهاية الحد الأعلى درجة f(x) ≈ (${a}*x²)` },
        { bound: "+∞", val: limInf, explanation: `نهاية الحد الأعلى درجة f(x) ≈ (${a}*x²)` }
      ];
      result.derivativeStr = `f'(x) = ${2 * a}x + (${b})`;
      result.variationDirections = [
        { interval: `]-∞ , ${xVertex.toFixed(2)}]`, direction: a > 0 ? "decreasing" : "increasing", sign: a > 0 ? "-" : "+" },
        { interval: `[${xVertex.toFixed(2)} , +∞[`, direction: a > 0 ? "increasing" : "decreasing", sign: a > 0 ? "+" : "-" }
      ];
      result.extrema = [
        { x: xVertex, y: yVertex, type: a > 0 ? "min" : "max", label: a > 0 ? "قيمة حدية صغرى" : "قيمة حدية كبرى" }
      ];
    } 
    else if (funcTemplate === "homographic") {
      const a = coeffA; const b = coeffB; const c = coeffC; const d = coeffD;
      const pole = -d / c;
      const det = a * d - b * c; // ad - bc
      const signOfDerivative = det > 0 ? "+" : "-";
      const direction = det > 0 ? "increasing" : "decreasing";
      const arrowText = det > 0 ? "متزايدة تماماً ↗️" : "متناقصة تماماً ↘️";
      const horizAsymp = (a / c).toFixed(2);

      result.domainStr = `D = IR \\ {${pole.toFixed(2)}} = ]-∞ , ${pole.toFixed(2)}[ U ]${pole.toFixed(2)} , +∞[`;
      result.limits = [
        { bound: "-∞", val: horizAsymp, explanation: `نهاية حاصل قسمة أعلى درجة: ax/cx = ${a}/${c}` },
        { bound: `x < ${pole.toFixed(2)}`, val: det > 0 ? "+∞" : "-∞", explanation: "دراسة إشارة القطب بقيم صغرى" },
        { bound: `x > ${pole.toFixed(2)}`, val: det > 0 ? "-∞" : "+∞", explanation: "دراسة إشارة القطب بقيم كبرى" },
        { bound: "+∞", val: horizAsymp, explanation: `نهاية حاصل قسمة أعلى درجة: ax/cx = ${a}/${c}` }
      ];
      result.derivativeStr = `f'(x) = ${det} / (${c}x + (${d}))²`;
      result.variationDirections = [
        { interval: `]-∞ , ${pole.toFixed(2)}[`, direction: direction, sign: signOfDerivative },
        { interval: `]${pole.toFixed(2)} , +∞[`, direction: direction, sign: signOfDerivative }
      ];
      result.asymptotes = [
        { eq: `y = ${horizAsymp}`, type: "horizontal", desc: `مستقيم مقارب أفقي بجوار +∞ و -∞` },
        { eq: `x = ${pole.toFixed(2)}`, type: "vertical", desc: `مستقيم مقارب عمودي موازي لمحور التراتيب` }
      ];
    }
    else if (funcTemplate === "cubic") {
      const a = coeffA; const b = coeffB; const c = coeffC; const d = coeffD;
      // f'(x) = 3ax^2 + 2bx + c
      const da = 3 * a;
      const db = 2 * b;
      const dc = c;
      const delta = db * db - 4 * da * dc;

      result.domainStr = "D = IR = ]-∞ , +∞[";
      result.limits = [
        { bound: "-∞", val: a > 0 ? "-∞" : "+∞", explanation: `نهاية الحد المسيطر ${a}x³` },
        { bound: "+∞", val: a > 0 ? "+∞" : "-∞", explanation: `نهاية الحد المسيطر ${a}x³` }
      ];
      result.derivativeStr = `f'(x) = ${da}x² + (${db})x + (${dc})`;
      
      if (delta > 0) {
        const r1 = (-db - Math.sqrt(delta)) / (2 * da);
        const r2 = (-db + Math.sqrt(delta)) / (2 * da);
        const rootMin = Math.min(r1, r2);
        const rootMax = Math.max(r1, r2);

        const signOuter = a > 0 ? "+" : "-";
        const signInner = a > 0 ? "-" : "+";
        const dirOuter = a > 0 ? "increasing" : "decreasing";
        const dirInner = a > 0 ? "decreasing" : "increasing";

        result.variationDirections = [
          { interval: `]-∞ , ${rootMin.toFixed(2)}]`, direction: dirOuter, sign: signOuter },
          { interval: `[${rootMin.toFixed(2)} , ${rootMax.toFixed(2)}]`, direction: dirInner, sign: signInner },
          { interval: `[${rootMax.toFixed(2)} , +∞[`, direction: dirOuter, sign: signOuter }
        ];

        const valMin = evaluateFunction(rootMin) || 0;
        const valMax = evaluateFunction(rootMax) || 0;
        result.extrema = [
          { x: rootMin, y: valMin, type: a > 0 ? "max" : "min", label: a > 0 ? "ذروة كبرى" : "ذروة صغرى" },
          { x: rootMax, y: valMax, type: a > 0 ? "min" : "max", label: a > 0 ? "ذروة صغرى" : "ذروة كبرى" }
        ];
      } else {
        result.variationDirections = [
          { interval: "]-∞ , +∞[", direction: a > 0 ? "increasing" : "decreasing", sign: a > 0 ? "+" : "-" }
        ];
      }
    }
    else if (funcTemplate === "asymptotic_rational") {
      // f(x) = ax + b + c/(x - d)
      const a = coeffA; const b = coeffB; const c = coeffC; const d = coeffD;
      result.domainStr = `D = IR \\ {${d}} = ]-∞ , ${d}[ U ]${d} , +∞[`;
      
      const limitsExposed = [
        { bound: "-∞", val: a > 0 ? "-∞" : "+∞", explanation: "المقارب المائل ax+b يسيطر لكون الكسر يؤول لـ 0" },
        { bound: `x < ${d}`, val: c > 0 ? "-∞" : "+∞", explanation: "حالة الكسر بقيمة سالبة تحت المطب" },
        { bound: `x > ${d}`, val: c > 0 ? "+∞" : "-∞", explanation: "حالة الكسر بقيمة موجبة تحت المطب" },
        { bound: "+∞", val: a > 0 ? "+∞" : "-∞", explanation: "المقارب المائل ax+b يسيطر بجوار المالانهاية" }
      ];

      result.limits = limitsExposed;
      result.derivativeStr = `f'(x) = ${a} - (${c}) / (x - ${d})²`;
      
      // Points where f' = 0 -> a = c/(x-d)^2 -> (x-d)^2 = c/a -> x = d +/- sqrt(c/a)
      const rootVal = c / a;
      if (rootVal > 0) {
        const x1 = d - Math.sqrt(rootVal);
        const x2 = d + Math.sqrt(rootVal);
        const dir1 = a > 0 ? "increasing" : "decreasing";
        const dir2 = a > 0 ? "decreasing" : "increasing";
        const sig1 = a > 0 ? "+" : "-";
        const sig2 = a > 0 ? "-" : "+";

        result.variationDirections = [
          { interval: `]-∞ , ${x1.toFixed(2)}]`, direction: dir1, sign: sig1 },
          { interval: `[${x1.toFixed(2)} , ${d}[`, direction: dir2, sign: sig2 },
          { interval: `]${d} , ${x2.toFixed(2)}]`, direction: dir2, sign: sig2 },
          { interval: `[${x2.toFixed(2)} , +∞[`, direction: dir1, sign: sig1 }
        ];

        result.extrema = [
          { x: x1, y: evaluateFunction(x1) || 0, type: a > 0 ? "max" : "min", label: "ذروة محلية أولى" },
          { x: x2, y: evaluateFunction(x2) || 0, type: a > 0 ? "min" : "max", label: "ذروة محلية ثانية" }
        ];
      } else {
        result.variationDirections = [
          { interval: `]-∞ , ${d}[`, direction: a > 0 ? "increasing" : "decreasing", sign: a > 0 ? "+" : "-" },
          { interval: `]${d} , +∞[`, direction: a > 0 ? "increasing" : "decreasing", sign: a > 0 ? "+" : "-" }
        ];
      }

      result.asymptotes = [
        { eq: `y = ${a}x + (${b})`, type: "oblique", desc: `مستقيم مقارب مائل (Δ) بجوار +∞ و -∞` },
        { eq: `x = ${d}`, type: "vertical", desc: `مستقيم مقارب عمودي موازٍ لمحور التراتيب` }
      ];
    }
    else if (funcTemplate === "parametric") {
      // f_m(x) = (m * x + b) / (x - c)
      const m = paramM; const b = coeffB; const c = coeffC;
      const det = -m * c - b; // derivative sign numerator: m*d - b*c -> for d=-c, c=1: m*(-c) - b
      const signOfDerivative = det > 0 ? "+" : "-";
      const direction = det > 0 ? "increasing" : "decreasing";

      result.domainStr = `D = IR \\ {${c}} = ]-∞ , ${c}[ U ]${c} , +∞[`;
      result.limits = [
        { bound: "-∞", val: `${m}`, explanation: `الوسيط m هو معامل أعلى درجة بمحور الفواصل: y = ${m}` },
        { bound: `x < ${c}`, val: det > 0 ? "+∞" : "-∞", explanation: "النهاية اليسرى تتأثر بقيمة وسيط التوجيه" },
        { bound: `x > ${c}`, val: det > 0 ? "-∞" : "+∞", explanation: "النهاية اليمنى تتأثر بقيمة وسيط التوجيه" },
        { bound: "+∞", val: `${m}`, explanation: `الوسيط m هو المقارب الأفقي بجانب اللانهائي: y = ${m}` }
      ];
      result.derivativeStr = `f'_m(x) = (${det}) / (x - ${c})² = (-${m * c} - ${b}) / (x - ${c})²`;
      result.variationDirections = [
        { interval: `]-∞ , ${c}[`, direction: direction, sign: signOfDerivative },
        { interval: `]${c} , +∞[`, direction: direction, sign: signOfDerivative }
      ];
      result.asymptotes = [
        { eq: `y = ${m}`, type: "horizontal", desc: `مستقيم مقارب أفقي متحرك يتحدد بالوسيط m = ${m}` },
        { eq: `x = ${c}`, type: "vertical", desc: `مستقيم مقارب عمودي ثابت للقطب x = ${c}` }
      ];
    }

    return result;
  };

  const currentAnalysis = getAnalysis();

  // Evaluate derivative f'(x) numerically to build tangent equation
  const evaluateDerivativeAt = (x0: number): number => {
    const h = 0.0001;
    const y2 = evaluateFunction(x0 + h);
    const y1 = evaluateFunction(x0 - h);
    if (y2 === null || y1 === null) return 0;
    return (y2 - y1) / (2 * h);
  };

  // Tangent line values calculation
  const slopeAtX0 = evaluateDerivativeAt(tangentX0);
  const valAtX0 = evaluateFunction(tangentX0) || 0;
  // tangent line: y = slopeAtX0 * (x - tangentX0) + valAtX0 -> y = slopeAtX0 * x + (valAtX0 - slopeAtX0 * tangentX0)
  const interceptAtX0 = valAtX0 - slopeAtX0 * tangentX0;

  // Custom coordinate handler for rendering the SVG
  const mapCoordinates = (x: number, y: number) => {
    // Grid center is width/2 + offsetX, height/2 + offsetY
    const width = 450;
    const height = 300;
    const cx = width / 2 + offsetX;
    const cy = height / 2 - offsetY; // Standard SVG inverted Y
    return {
      px: cx + x * zoom,
      py: cy - y * zoom
    };
  };

  const reverseMapCoordinates = (px: number, py: number) => {
    const width = 450;
    const height = 300;
    const cx = width / 2 + offsetX;
    const cy = height / 2 - offsetY;
    const rx = (px - cx) / zoom;
    const ry = (cy - py) / zoom;
    return { x: rx, y: ry };
  };

  // Draw core function curve path
  const generateCurvePath = (): string => {
    const points: string[] = [];
    const step = 0.05;
    let inGap = false;

    // We plot x from -8 to +8
    for (let x = -8; x <= 8; x += step) {
      const y = evaluateFunction(x);
      if (y === null || isNaN(y) || Math.abs(y) > 15) {
        inGap = true;
        continue;
      }

      const { px, py } = mapCoordinates(x, y);
      
      // Do not output coordinates out of visual range
      if (px < -100 || px > 550 || py < -100 || py > 400) {
        inGap = true;
        continue;
      }

      if (inGap || points.length === 0) {
        points.push(`M ${px.toFixed(2)} ${py.toFixed(2)}`);
        inGap = false;
      } else {
        points.push(`L ${px.toFixed(2)} ${py.toFixed(2)}`);
      }
    }
    return points.join(" ");
  };

  // Generate Tangent Line svg path
  const generateTangentPath = (): string => {
    const pt1 = mapCoordinates(-8, slopeAtX0 * -8 + interceptAtX0);
    const pt2 = mapCoordinates(8, slopeAtX0 * 8 + interceptAtX0);
    return `M ${pt1.px.toFixed(2)} ${pt1.py.toFixed(2)} L ${pt2.px.toFixed(2)} ${pt2.py.toFixed(2)}`;
  };

  // Generate Oblique Asymptote path
  const generateObliqueAsympPath = (eqStr: string): string => {
    // y = ax + b
    if (funcTemplate === "asymptotic_rational") {
      const a = coeffA;
      const b = coeffB;
      const pt1 = mapCoordinates(-8, a * -8 + b);
      const pt2 = mapCoordinates(8, a * 8 + b);
      return `M ${pt1.px.toFixed(2)} ${pt1.py.toFixed(2)} L ${pt2.px.toFixed(2)} ${pt2.py.toFixed(2)}`;
    }
    return "";
  };

  // Grid background arrays
  const lineRangeY = Array.from({ length: 31 }, (_, i) => i - 15);
  const lineRangeX = Array.from({ length: 31 }, (_, i) => i - 15);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!plotRef.current) return;
    const rect = plotRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const { x, y } = reverseMapCoordinates(px, py);
    setHoverCoord({ x, y });
  };

  const handleMouseLeave = () => {
    setHoverCoord(null);
  };

  // Injected Prompt Sender tool
  const askDaliAboutStep = (stepTitle: string, stepDetail: string) => {
    let questionText = `أستاذ دالي، ملقيتش كيفاش نفهم هاد الجزء "${stepTitle}" في دراسة الدالة الحالية. \n`;
    questionText += `المعادلة هي:  `;
    if (funcTemplate === "quadratic") questionText += `f(x) = ${coeffA}x² + (${coeffB})x + (${coeffC})\n`;
    if (funcTemplate === "homographic") questionText += `f(x) = (${coeffA}x + ${coeffB}) / (${coeffC}x + ${coeffD})\n`;
    if (funcTemplate === "cubic") questionText += `f(x) = ${coeffA}x³ + (${coeffB})x² + (${coeffC})x + (${coeffD})\n`;
    if (funcTemplate === "asymptotic_rational") questionText += `f(x) = ${coeffA}x + (${coeffB}) + (${coeffC})/(x - (${coeffD}))\n`;
    if (funcTemplate === "parametric") questionText += `f(x) = (${paramM}x + (${coeffB})) / (x - ${coeffC}) [بوسيط m = ${paramM}]\n`;

    questionText += `التفاصيل المحسوبة: ${stepDetail} \n`;
    questionText += `اشرحهالي بالتفصيل الممل وباللهجة الجزائرية باش نفهم مليح وبلا ما تخلطلي الأمور بالرموز الصعبة! صلي على محمد يا أستاذ ووعاوني. 😊`;
    
    onAskDali(questionText);
  };

  return (
    <div className="bg-brand-card border border-brand-border rounded-2xl shadow-xl overflow-hidden text-right" dir="rtl">
      
      {/* Upper Tab Header Design */}
      <div className="bg-slate-900 border-b border-brand-border p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-brand-green/20 text-brand-emerald rounded-xl">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-md md:text-lg font-black text-slate-100">دراسة ورسم الدوال الذكي (المنهاج الجزائري) 🇩🇿</h2>
            <p className="text-[11px] text-slate-400">انقر على أي معادلة أو خطوة واطلب الشرح الفوري بالدارجة من الأستاذ دالي</p>
          </div>
        </div>

        {/* Selected Mathematical Model dropdown selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">نموذج الدالة المدروسة:</span>
          <div className="relative">
            <select
              value={funcTemplate}
              onChange={(e) => setFuncTemplate(e.target.value as any)}
              className="bg-brand-bg text-slate-200 border border-brand-border rounded-xl text-xs py-2 pr-2.5 pl-8 font-bold outline-none cursor-pointer focus:border-brand-emerald transition-all"
            >
              <option value="quadratic">كثير حدود درجة 2 (f(x) = ax² + bx + c)</option>
              <option value="cubic">كثير حدود درجة 3 (f(x) = ax³ + bx² + cx + d)</option>
              <option value="homographic">تناظرية/تناسبية ((ax+b)/(cx+d))</option>
              <option value="asymptotic_rational">ناطقة تناظرية بجدار مائل (ax+b + c/(x-d))</option>
              <option value="parametric">دراسة وسيطية متحركة (f_m(x))</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        
        {/* Left column: Dynamic inputs control block */}
        <div className="lg:col-span-4 bg-brand-bg/80 border-l border-brand-border p-5 space-y-6">
          
          {/* Custom Equation parameters editor */}
          <div>
            <h3 className="text-xs font-bold text-brand-emerald uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-brand-emerald rounded-full"></span>
              تثبيت وضبط معاملات الدالة
            </h3>

            <div className="bg-brand-card p-4 rounded-xl border border-brand-border text-center space-y-3">
              
              {/* Display equation formula clearly in plain text */}
              <div className="bg-brand-bg py-2 px-3 rounded-lg border border-brand-border inline-block min-w-full">
                <span className="text-xs text-slate-400 block mb-0.5">معادلة المنحنى الممثل (C_f)</span>
                <span className="text-sm md:text-base font-black font-mono text-white tracking-wide">
                  {funcTemplate === "quadratic" && `f(x) = (${coeffA})x² + (${coeffB})x + (${coeffC})`}
                  {funcTemplate === "homographic" && `f(x) = (${coeffA}x + (${coeffB})) / (${coeffC}x + (${coeffD}))`}
                  {funcTemplate === "cubic" && `f(x) = (${coeffA})x³ + (${coeffB})x² + (${coeffC})x + (${coeffD})`}
                  {funcTemplate === "asymptotic_rational" && `f(x) = (${coeffA})x + (${coeffB}) + (${coeffC})/(x - (${coeffD}))`}
                  {funcTemplate === "parametric" && `f_m(x) = (${paramM}x + (${coeffB})) / (x - (${coeffC}))`}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1.5 font-bold">بدون رمز ($) المزعج - متوافق 100% مع التعليم الجزائري</span>
              </div>

              {/* Sliders for coefficients */}
              <div className="space-y-3 text-right">
                
                {/* coeffA */}
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-300">
                    <span>المعامل a = {coeffA}</span>
                    <span className="font-mono text-slate-500">موجّب للتحدب</span>
                  </div>
                  <input
                    type="range" min="-5" max="5" step="1"
                    value={coeffA}
                    onChange={(e) => setCoeffA(parseInt(e.target.value) || 1)}
                    className="w-full accent-brand-emerald bg-brand-bg h-1 rounded-lg"
                  />
                </div>

                {/* coeffB */}
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-300">
                    <span>المعامل b = {coeffB}</span>
                  </div>
                  <input
                    type="range" min="-5" max="5" step="1"
                    value={coeffB}
                    onChange={(e) => setCoeffB(parseInt(e.target.value) || 0)}
                    className="w-full accent-brand-emerald bg-brand-bg h-1 rounded-lg"
                  />
                </div>

                {/* coeffC */}
                {funcTemplate !== "quadratic" && (
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-300">
                      <span>{funcTemplate === "homographic" ? "المعامل c = " : "المعامل c (البسط) = "}{coeffC}</span>
                    </div>
                    <input
                      type="range" min="-5" max="5" step="1"
                      value={coeffC}
                      onChange={(e) => setCoeffC(parseInt(e.target.value) || 1)}
                      className="w-full accent-brand-emerald bg-brand-bg h-1 rounded-lg"
                    />
                  </div>
                )}

                {/* coeffD */}
                {(funcTemplate === "homographic" || funcTemplate === "cubic" || funcTemplate === "asymptotic_rational") && (
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-300">
                      <span>{funcTemplate === "cubic" ? "المعامل ثابت d = " : "المعامل d (المقام) = "}{coeffD}</span>
                    </div>
                    <input
                      type="range" min="-5" max="5" step="1"
                      value={coeffD}
                      onChange={(e) => setCoeffD(parseInt(e.target.value) || 0)}
                      className="w-full accent-brand-emerald bg-brand-bg h-1 rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Parametric Slider integration */}
          {funcTemplate === "parametric" && (
            <div className="bg-brand-emerald/10 border border-brand-emerald/20 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-brand-emerald">الوسيط المتحرك (Parametric m)</span>
                <span className="bg-brand-green text-white font-mono font-bold text-xs px-2 py-0.5 rounded-md">m = {paramM}</span>
              </div>
              <p className="text-[10px] text-slate-400">حرّك وسيط التوجيه ولاحظ المناقشة و زحزحة المنحنى فورياً على المخطط:</p>
              <input
                type="range" min="-5" max="5" step="0.5"
                value={paramM}
                onChange={(e) => setParamM(parseFloat(e.target.value))}
                className="w-full accent-brand-emerald bg-brand-bg h-1.5 rounded-lg"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>m = -5</span>
                <span>m = 0 (مستقر)</span>
                <span>m = 5</span>
              </div>
            </div>
          )}

          {/* Interactive Tangent computation solver widget */}
          <div className="bg-brand-card p-4 rounded-xl border border-brand-border space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={showTangent}
                  onChange={(e) => setShowTangent(e.target.checked)}
                  className="rounded accent-brand-green"
                />
                معادلة مماس المنحنى (T)
              </label>
              <span className="text-[10px] text-slate-500">عند النقطة الفاصلة x₀</span>
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <div className="col-span-1">
                <input
                  type="number" min="-5" max="5" step="0.5"
                  value={tangentX0}
                  onChange={(e) => setTangentX0(parseFloat(e.target.value) || 0)}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg text-xs py-1.5 px-2 font-mono text-center text-slate-200 outline-none"
                />
              </div>
              <div className="col-span-2 text-right">
                <span className="text-[11px] text-slate-400 block">قيمة x0 المقترحة:</span>
                <span className="text-[11px] font-mono font-bold text-brand-emerald">f'({tangentX0}) = {slopeAtX0.toFixed(2)}</span>
              </div>
            </div>

            {showTangent && (
              <div className="bg-brand-bg p-2.5 rounded-lg text-center border border-brand-border">
                <span className="text-[10px] text-slate-400 block mb-0.5">صيغة معادلة المماس المحسوبة:</span>
                <span className="text-xs font-black text-white font-mono">
                  (T) : y = {slopeAtX0.toFixed(2)} * (x - {tangentX0}) + {valAtX0.toFixed(2)}
                  <span className="block text-brand-emerald mt-1 text-[11px]">
                    = {slopeAtX0.toFixed(2)}x {interceptAtX0 >= 0 ? `+ ${interceptAtX0.toFixed(2)}` : `- ${Math.abs(interceptAtX0).toFixed(2)}`}
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Quick ask pre-computed buttons block */}
          <div className="space-y-2">
            <span className="text-[11px] text-slate-400 font-bold block">مساعدة جاهزة من الأستاذ دالي:</span>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                onClick={() => askDaliAboutStep("مجموعة التعريف والنهايات", `مجموعة التعريف المُستخرجة هي: ${currentAnalysis.domainStr}. النهايات عند الأطراف المحسوبة هي: ${JSON.stringify(currentAnalysis.limits)}`)}
                disabled={isDaliAnswering}
                className="text-[11px] text-right bg-brand-card hover:bg-brand-border border border-brand-border text-slate-200 hover:text-brand-emerald p-2.5 rounded-xl transition-all font-semibold flex items-center justify-between"
              >
                <span>شرح النهايات والتفسير المندس لـ (Cf)</span>
                <span className="text-xs">🧠 🇩🇿</span>
              </button>
              <button
                onClick={() => askDaliAboutStep("اشتقاق الدالة واتجاه التغير", `عبارة المشتقة هي: ${currentAnalysis.derivativeStr} مع دراسة التغيرات بالفترات التالية: ${JSON.stringify(currentAnalysis.variationDirections)}`)}
                disabled={isDaliAnswering}
                className="text-[11px] text-right bg-brand-card hover:bg-brand-border border border-brand-border text-slate-200 hover:text-brand-emerald p-2.5 rounded-xl transition-all font-semibold flex items-center justify-between"
              >
                <span>اشرحلي كيفاش اشتقينا وخرجنا جدول التغيرات</span>
                <span className="text-xs">📈 🔄</span>
              </button>
              <button
                onClick={() => {
                  let str = `الدالة لـ (T) عند x0=${tangentX0} بمعدل مماس: f'(x0)=${slopeAtX0} وعلاقة y = ${slopeAtX0}x + ${interceptAtX0}`;
                  askDaliAboutStep("شرح مماس المنحنى والتقاطع", str);
                }}
                disabled={isDaliAnswering}
                className="text-[11px] text-right bg-brand-card hover:bg-brand-border border border-brand-border text-slate-200 hover:text-brand-emerald p-2.5 rounded-xl transition-all font-semibold flex items-center justify-between"
              >
                <span>اشرحلي كيفاش رسمنا المستقيم المقارب والمماس (T)</span>
                <span className="text-xs">📐 🖍️</span>
              </button>
            </div>
          </div>

        </div>

        {/* Right column: Plot container and Variations table container */}
        <div className="lg:col-span-8 p-5 space-y-6 flex flex-col justify-between">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            
            {/* Visual plot section */}
            <div className="md:col-span-7 bg-slate-950 rounded-2xl border border-brand-border overflow-hidden relative shadow-inner">
              
              {/* Plot Header toolbar */}
              <div className="bg-brand-card/90 border-b border-brand-border px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <Grid3X3 className="w-4 h-4 text-brand-emerald" />
                  منحنى الدالة (C_f) والأشعة المقاربة
                </span>
                
                {/* Zoom tools */}
                <div className="flex items-center gap-1 text-[10px]">
                  <button 
                    onClick={() => setZoom(prev => Math.min(prev + 5, 80))}
                    className="p-1 px-2 bg-brand-bg hover:bg-brand-border border border-brand-border text-slate-300 rounded font-bold"
                  >
                    + تقريب
                  </button>
                  <button 
                    onClick={() => setZoom(prev => Math.max(prev - 5, 15))}
                    className="p-1 px-2 bg-brand-bg hover:bg-brand-border border border-brand-border text-slate-300 rounded font-bold"
                  >
                    - تبعيد
                  </button>
                  <button 
                    onClick={() => { setOffsetX(0); setOffsetY(0); setZoom(30); }}
                    className="p-1 px-2 bg-brand-bg hover:bg-brand-border border border-brand-border text-slate-300 rounded font-bold"
                    title="إعادة ضبط المحاور والمركز"
                  >
                    إعادة
                  </button>
                </div>
              </div>

              {/* Dynamic Coordinate Plot representation via responsive high quality SVG */}
              <div className="relative text-left" dir="ltr">
                <svg
                  ref={plotRef}
                  width="100%"
                  height="300"
                  viewBox="0 0 450 300"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  className="bg-brand-bg/60 cursor-crosshair"
                >
                  {/* Grid Lines */}
                  {/* Y values grid lines */}
                  {lineRangeY.map((y) => {
                    const { py } = mapCoordinates(0, y);
                    if (py < 0 || py > 300) return null;
                    return (
                      <line
                        key={`grid-y-${y}`}
                        x1="0"
                        y1={py}
                        x2="450"
                        y2={py}
                        stroke="#1e293b"
                        strokeWidth={y === 0 ? "2" : "0.5"}
                        strokeDasharray={y === 0 ? "0" : "1 4"}
                      />
                    );
                  })}

                  {/* X values grid lines */}
                  {lineRangeX.map((x) => {
                    const { px } = mapCoordinates(x, 0);
                    if (px < 0 || px > 450) return null;
                    return (
                      <line
                        key={`grid-x-${x}`}
                        x1={px}
                        y1="0"
                        x2={px}
                        y2="300"
                        stroke="#1e293b"
                        strokeWidth={x === 0 ? "2" : "0.5"}
                        strokeDasharray={x === 0 ? "0" : "1 4"}
                      />
                    );
                  })}

                  {/* Axis Labeling / tick indicators */}
                  {[-6, -4, -2, 2, 4, 6].map((tick) => {
                    const tX = mapCoordinates(tick, 0);
                    const tY = mapCoordinates(0, tick);
                    return (
                      <g key={`ticks-${tick}`} className="text-[9px] font-mono fill-slate-500">
                        {tX.px >= 0 && tX.px <= 450 && (
                          <text x={tX.px} y={tX.py + 12} textAnchor="middle">{tick}</text>
                        )}
                        {tY.py >= 0 && tY.py <= 300 && (
                          <text x={tY.px - 10} y={tY.py + 3} textAnchor="end">{tick}</text>
                        )}
                      </g>
                    );
                  })}
                  
                  {/* Origin 0 label */}
                  <text 
                    x={mapCoordinates(0,0).px - 10} 
                    y={mapCoordinates(0,0).py + 12} 
                    className="text-[9px] font-mono fill-slate-500 font-bold"
                  >
                    0
                  </text>

                  {/* Draw Vertical Asymptotes */}
                  {currentAnalysis.asymptotes.filter(a => a.type === "vertical").map((as, i) => {
                    const xVal = parseFloat(as.eq.replace("x =", "").trim());
                    if (isNaN(xVal)) return null;
                    const { px } = mapCoordinates(xVal, 0);
                    return (
                      <line
                        key={`v-asymp-${i}`}
                        x1={px}
                        y1="0"
                        x2={px}
                        y2="300"
                        stroke="#ef4444"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                      />
                    );
                  })}

                  {/* Draw Horizontal Asymptotes */}
                  {currentAnalysis.asymptotes.filter(a => a.type === "horizontal").map((as, i) => {
                    const yVal = parseFloat(as.eq.replace("y =", "").trim());
                    if (isNaN(yVal)) return null;
                    const { py } = mapCoordinates(0, yVal);
                    return (
                      <line
                        key={`h-asymp-${i}`}
                        x1="0"
                        y1={py}
                        x2="450"
                        y2={py}
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                      />
                    );
                  })}

                  {/* Draw Oblique Asymptotes */}
                  {currentAnalysis.asymptotes.filter(a => a.type === "oblique").map((as, i) => {
                    const obliquePath = generateObliqueAsympPath(as.eq);
                    if (!obliquePath) return null;
                    return (
                      <path
                        key={`o-asymp-${i}`}
                        d={obliquePath}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                      />
                    );
                  })}

                  {/* Draw Tangent Line (T) */}
                  {showTangent && (
                    <path
                      d={generateTangentPath()}
                      fill="none"
                      stroke="#ec4899"
                      strokeWidth="1.5"
                      strokeDasharray="2 3"
                    />
                  )}

                  {/* Plot Core Curved Function (C_f) path line */}
                  <path
                    d={generateCurvePath()}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Extrema coordinates marked clearly */}
                  {currentAnalysis.extrema.map((ex, i) => {
                    const { px, py } = mapCoordinates(ex.x, ex.y);
                    if (px < 0 || px > 450 || py < 0 || py > 300) return null;
                    return (
                      <g key={`extrema-pt-${i}`}>
                        <circle cx={px} cy={py} r="4" fill="#10b981" stroke="#fff" strokeWidth="1" />
                        <text 
                          x={px + 6} 
                          y={py - 6} 
                          className="text-[8px] fill-slate-300 font-bold bg-slate-900 px-1 py-0.5 rounded"
                        >
                          {ex.x.toFixed(1)}, {ex.y.toFixed(1)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Interactive tangent spot helper node to grab */}
                  {showTangent && (
                    <circle
                      cx={mapCoordinates(tangentX0, valAtX0).px}
                      cy={mapCoordinates(tangentX0, valAtX0).py}
                      r="5"
                      fill="#ec4899"
                      stroke="#fff"
                      strokeWidth="1.5"
                    />
                  )}

                </svg>

                {/* Display cursor hover metrics */}
                <div className="absolute bottom-2 right-2 bg-slate-900/95 border border-brand-border px-2 px-3 py-1.5 rounded-lg text-left shadow-lg pointer-events-none text-right">
                  {hoverCoord ? (
                    <p className="font-mono text-[10px] text-slate-300 space-y-0.5" dir="rtl">
                      <span className="block text-brand-emerald font-bold font-sans">تتبع الإحداثيات الحية:</span>
                      <span className="block">الفواصل (x): {hoverCoord.x.toFixed(2)}</span>
                      <span className="block">التراتيب (y): {hoverCoord.y.toFixed(2)}</span>
                    </p>
                  ) : (
                    <p className="text-[9px] text-slate-400">مرر الفأرة فوق المخطط لتتبع نقاط المنحنى</p>
                  )}
                </div>

                {/* Plot color legend guides */}
                <div className="absolute top-2 left-2 bg-slate-900/90 border border-brand-border px-2 py-1.5 rounded-lg flex flex-col gap-1 text-[9px] text-slate-300">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-1 bg-[#10b981] rounded"></span>
                    <span>المنحنىCf</span>
                  </div>
                  {showTangent && (
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-1 bg-[#ec4899] rounded"></span>
                      <span>المماس(T)</span>
                    </div>
                  )}
                  {currentAnalysis.asymptotes.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-0.5 bg-red-500 rounded"></span>
                      <span>مقارب عمودي</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed analytical overview info panel */}
            <div className="md:col-span-5 bg-slate-900 border border-brand-border rounded-2xl p-4 text-right flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-brand-emerald block uppercase tracking-wide mb-1">التحليل الرياضي التفصيلي</span>
                <h3 className="text-sm font-black text-white mb-3">خصائص الدالة التحليلية</h3>
                
                <div className="space-y-3.5 text-xs text-slate-300">
                  
                  {/* Domain */}
                  <div className="border-b border-brand-border pb-2">
                    <span className="text-slate-500 block text-[10px]">مجموعة التعريف للـ دالة:</span>
                    <span className="font-bold font-mono text-white tracking-wide block">{currentAnalysis.domainStr}</span>
                  </div>

                  {/* Derivative */}
                  <div className="border-b border-brand-border pb-2">
                    <span className="text-slate-500 block text-[10px]">الدالة المشتقة f'(x):</span>
                    <span className="font-bold font-mono text-brand-emerald tracking-wide block">{currentAnalysis.derivativeStr}</span>
                    <span className="text-[9px] text-slate-400 mt-1 block">دراسة إشارتها تحدد تماماً جهة صعود وهبوط المنحنى الممثل.</span>
                  </div>

                  {/* Asymptotes list display */}
                  {currentAnalysis.asymptotes.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-slate-500 block text-[10px]">المعادلات المقاربة المكتشفة:</span>
                      {currentAnalysis.asymptotes.map((as, i) => (
                        <div key={i} className="bg-brand-bg/60 p-1.5 rounded border border-brand-border text-[11px] font-mono leading-normal">
                          <span className="font-bold text-white block">{as.eq}</span>
                          <span className="text-[10px] text-slate-400 font-sans block">{as.desc}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Limits and asymptotes explanations block list */}
              <div className="bg-brand-bg/50 p-2.5 rounded-xl border border-brand-border mt-4 text-[10px] leading-relaxed">
                <span className="text-slate-400 block font-bold mb-1">💡 تفسير النهايات الهندسي:</span>
                <p className="text-slate-500 text-[10px]">النهايات عند الأطراف اللانهائية تفسر وجود مستقيمات مقاربة موازية لمحور الفواصل والأراتيب لتحديد سلوك الدالة في الفضاء.</p>
              </div>

            </div>
          </div>

          {/* Aesthetic variation table widget - "رسم جدول تغيرات ودقة" */}
          <div className="bg-slate-900 border border-brand-border rounded-2xl p-4 text-right">
            <h3 className="text-xs font-bold text-brand-emerald uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>جدول التغيرات النموذجي (Tableau de Variations)</span>
              <span className="text-[10px] normal-case bg-brand-emerald/10 border border-brand-emerald/20 text-brand-emerald px-2 py-0.5 rounded-full font-bold">بمعدل دقة 100% 📐</span>
            </h3>
            
            {/* Algerian Classroom Variation diagram rendered natively */}
            <div className="overflow-x-auto w-full">
              <div className="min-w-[400px] border border-brand-border rounded-xl bg-brand-bg divide-y divide-brand-border text-[12px] font-sans">
                
                {/* Row 1: x variable */}
                <div className="grid grid-cols-12 divide-x divide-brand-border divide-x-reverse items-center py-2 h-10 text-center">
                  <div className="col-span-2 font-black text-slate-300">الـفواصل (x)</div>
                  <div className="col-span-1 border-r border-brand-border uppercase font-mono text-[10px] font-bold text-slate-500">-∞</div>
                  
                  {/* Center Critical Roots or Pole points depending on equation */}
                  {funcTemplate === "homographic" && (
                    <div className="col-span-8 flex justify-around text-slate-100 font-bold font-mono">
                      <span>{-coeffD/coeffC === 0 ? "0" : (-coeffD/coeffC).toFixed(1)} (جدار قطبي)</span>
                    </div>
                  )}
                  {funcTemplate === "quadratic" && (
                    <div className="col-span-8 flex justify-center text-slate-100 font-bold font-mono">
                      <span>{(-coeffB/(2*coeffA)).toFixed(2)} (الذروة)</span>
                    </div>
                  )}
                  {funcTemplate === "cubic" && (
                    <div className="col-span-8 flex justify-around text-slate-100 font-bold font-mono">
                      <span>الجذور الحرجة للمشتقة</span>
                    </div>
                  )}
                  {funcTemplate === "asymptotic_rational" && (
                    <div className="col-span-8 flex justify-around text-slate-100 font-bold font-mono">
                      <span>{coeffD.toFixed(1)} (القطب)</span>
                    </div>
                  )}
                  {funcTemplate === "parametric" && (
                    <div className="col-span-8 flex justify-around text-slate-100 font-bold font-mono text-[11px]">
                      <span>{coeffC.toFixed(1)} (مستقيم جدار عمودي)</span>
                    </div>
                  )}

                  <div className="col-span-1 border-r border-brand-border uppercase font-mono text-[10px] font-bold text-slate-500">+∞</div>
                </div>

                {/* Row 2: derivative sign */}
                <div className="grid grid-cols-12 divide-x divide-brand-border divide-x-reverse items-center py-2 h-10 text-center">
                  <div className="col-span-2 font-black text-slate-300">إشارة f'(x)</div>
                  
                  {/* Signs indicators */}
                  <div className="col-span-10 grid grid-cols-3 font-mono font-black text-sm text-center">
                    {/* First slot sign */}
                    <span className="text-brand-emerald">
                      {funcTemplate === "homographic" ? (coeffA*coeffD - coeffB*coeffC > 0 ? "+" : "-") : (coeffA > 0 ? "-" : "+")}
                    </span>
                    
                    {/* Middle bar/zero/barrier */}
                    <span className="text-slate-500 border-x border-dashed border-slate-700/50">
                      {funcTemplate === "homographic" || funcTemplate === "asymptotic_rational" || funcTemplate === "parametric" ? "|| double bar" : "0"}
                    </span>
                    
                    {/* Last slot sign */}
                    <span className="text-brand-emerald">
                      {funcTemplate === "homographic" ? (coeffA*coeffD - coeffB*coeffC > 0 ? "+" : "-") : (coeffA > 0 ? "+" : "-")}
                    </span>
                  </div>
                </div>

                {/* Row 3: variation functions behavior arrows */}
                <div className="grid grid-cols-12 divide-x divide-brand-border divide-x-reverse py-3 min-h-[70px] text-center">
                  <div className="col-span-2 font-black text-slate-300 flex items-center justify-center">تـغيرات f(x)</div>
                  
                  {/* Dynamic graphic representation with arrows */}
                  <div className="col-span-10 flex justify-between px-6 items-center relative text-slate-200">
                    
                    {/* Quadratic behavior flow */}
                    {funcTemplate === "quadratic" && (
                      <div className="w-full h-full flex items-center justify-between text-xs relative px-4" dir="rtl">
                        <span>{coeffA > 0 ? "+∞" : "-∞"}</span>
                        <div className="flex-1 flex flex-col items-center justify-center relative font-mono font-bold text-brand-emerald px-6">
                          <span className="text-slate-400 block text-[9px] mb-1">الذروة:</span>
                          <span>{evaluateFunction(-coeffB/(2*coeffA))?.toFixed(2)}</span>
                          {coeffA > 0 ? (
                            <span className="text-red-400 text-xs mt-1">↘️ مقعرة ثم صاعدة ↗️</span>
                          ) : (
                            <span className="text-brand-emerald text-xs mt-1">↗️ محدبة ثم هابطة ↘️</span>
                          )}
                        </div>
                        <span>{coeffA > 0 ? "+∞" : "-∞"}</span>
                      </div>
                    )}

                    {/* Homographic variation details */}
                    {funcTemplate === "homographic" && (
                      <div className="w-full flex justify-between items-center text-xs text-slate-400 font-mono font-bold">
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-slate-500">من عند:</span>
                          <span>{(coeffA / coeffC).toFixed(1)}</span>
                        </div>
                        <div className="flex flex-col items-center flex-1">
                          <span className="text-[9px] text-red-500 block font-sans">خط القطب الجداري (||)</span>
                          <span className="font-black text-slate-300">
                            {coeffA*coeffD - coeffB*coeffC > 0 ? "صعود متوازي ↗️" : "نزول متوازي ↘️"}
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-slate-500">إلى غاية:</span>
                          <span>{(coeffA / coeffC).toFixed(1)}</span>
                        </div>
                      </div>
                    )}

                    {/* Parametric rational behavior */}
                    {(funcTemplate === "asymptotic_rational" || funcTemplate === "parametric" || funcTemplate === "cubic") && (
                      <div className="w-full text-center py-2 text-slate-300">
                        <p className="text-xs">دراسة ورسم جدول التغيرات التفصيلي متاح عبر مستعرض الرسوم المجاورة.</p>
                        <span className="text-[10px] text-slate-500 font-mono">انقر على "اشرحلي حساب المشتقة وإشارتها" ليسرد الأستاذ التغيرات تلو الخطوات.</span>
                      </div>
                    )}

                  </div>
                </div>

              </div>
            </div>

            <p className="text-[10px] text-slate-500 text-right mt-2 flex items-center justify-end gap-1">
              <Info className="w-3.5 h-3.5 text-brand-emerald" />
              الرمز الجداري (||) في جدول التغيرات يُمثّل قطب الدالة غير المعرفة، وهو ما يلتزم به المنهاج الجزائري الرسمي باحترافية.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}
