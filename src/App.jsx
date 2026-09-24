import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const ROLES = [
  { id: "software_engineer", label: "Software Engineer", icon: "⚙️" },
  { id: "data_analyst", label: "Data Analyst", icon: "📊" },
  { id: "product_manager", label: "Product Manager", icon: "🗺️" },
  { id: "ux_designer", label: "UX Designer", icon: "🎨" },
  { id: "hr_manager", label: "HR Manager", icon: "🤝" },
  { id: "marketing", label: "Marketing Lead", icon: "📣" },
  { id: "finance", label: "Finance Analyst", icon: "💹" },
  { id: "devops", label: "DevOps Engineer", icon: "🔧" },
];

const TOTAL_QUESTIONS = 10;

const MOCK_QUESTIONS = [
  "Tell me about yourself and what drew you to this field.",
  "Describe a challenging project you worked on and how you overcame obstacles.",
  "How do you prioritize tasks when you have multiple deadlines?",
  "Give an example of a time you had to learn something quickly under pressure.",
  "How do you handle disagreements with teammates or stakeholders?",
  "Walk me through your problem-solving process when faced with an unfamiliar challenge.",
  "What tools or methodologies do you rely on most in your day-to-day work?",
  "Describe a time you made a mistake at work. How did you handle it?",
  "Where do you see yourself professionally in the next 3–5 years?",
  "What questions do you have for us about this role or the team?",
];

const MOCK_EVAL = {
  overallScore: 66,
  categories: {
    technicalKnowledge: 69,
    communication: 100,
    confidence: 50,
    bodyLanguage: 51,
  },
  feedback:
    "You demonstrated solid foundational knowledge throughout the interview. Your communication was particularly strong — responses were clear, structured, and easy to follow. Confidence dipped slightly under technical pressure, but your overall composure was professional. Focus on grounding your answers with specific metrics and outcomes to leave a stronger impression.",
  strengths: [
    "Clear and articulate communication style",
    "Strong problem-solving narrative",
    "Professional and composed demeanor",
  ],
  improvements: [
    "Back answers with specific metrics or data",
    "Maintain steadier eye contact during technical questions",
    "Deepen role-specific technical depth",
  ],
};

// ─── MOCK API ─────────────────────────────────────────────────────────────────
const callClaude = async (index) => {
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 400));
  return MOCK_QUESTIONS[index] || MOCK_QUESTIONS[0];
};

const evaluateInterview = async () => {
  await new Promise((r) => setTimeout(r, 1800));
  return MOCK_EVAL;
};

// ─── SPEECH ──────────────────────────────────────────────────────────────────
const speak = (text, onEnd) => {
  if (!window.speechSynthesis) { if (onEnd) onEnd(); return; }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const femaleVoice =
    voices.find((v) => v.name.toLowerCase().includes("female")) ||
    voices.find((v) => v.name.toLowerCase().includes("samantha")) ||
    voices.find((v) => v.name.toLowerCase().includes("victoria")) ||
    voices.find((v) => v.name.toLowerCase().includes("karen")) ||
    voices[1] ||
    voices[0];
  if (femaleVoice) utter.voice = femaleVoice;
  utter.rate = 0.92;
  utter.pitch = 1.1;
  utter.volume = 1;
  if (onEnd) utter.onend = onEnd;
  window.speechSynthesis.speak(utter);
};

// ─── VISION HOOK ─────────────────────────────────────────────────────────────
const useVision = (videoRef, isActive) => {
  const [metrics, setMetrics] = useState({ eyeContact: 0, smile: 0, headStability: 0, gestures: 0 });
  const intervalRef = useRef(null);
  const canvasRef = useRef(document.createElement("canvas"));
  const metricsHistory = useRef([]);

  useEffect(() => {
    if (!isActive) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let skinPixels = 0, totalPixels = data.length / 4, brightnessSum = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) skinPixels++;
          brightnessSum += (r + g + b) / 3;
        }
        const skinRatio = skinPixels / totalPixels;
        const avgBrightness = brightnessSum / totalPixels;
        const m = {
          eyeContact: Math.min(100, Math.round(skinRatio * 400 + Math.random() * 15)),
          smile: Math.min(100, Math.round(40 + avgBrightness / 3 + Math.random() * 20)),
          headStability: Math.min(100, Math.round(60 + Math.random() * 35)),
          gestures: Math.min(100, Math.round(30 + skinRatio * 200 + Math.random() * 20)),
        };
        metricsHistory.current.push(m);
        setMetrics(m);
      } catch (_) {}
    }, 1500);
    return () => clearInterval(intervalRef.current);
  }, [isActive, videoRef]);

  const getSummary = () => {
    const h = metricsHistory.current;
    if (!h.length) return { avgEyeContact: 0, avgSmile: 0, headStability: 0 };
    const avg = (key) => Math.round(h.reduce((s, m) => s + m[key], 0) / h.length);
    return { avgEyeContact: avg("eyeContact"), avgSmile: avg("smile"), headStability: avg("headStability") };
  };

  return { metrics, getSummary };
};

// ─── SPEECH RECOGNITION HOOK ─────────────────────────────────────────────────
const useSpeechRecognition = () => {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setTranscript(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
    setTranscript("");
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  return { transcript, listening, start, stop, setTranscript };
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [phase, setPhase] = useState("landing");
  const [selectedRole, setSelectedRole] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [answers, setAnswers] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [liveHint, setLiveHint] = useState("");
  const [questionVisible, setQuestionVisible] = useState(false);
  const [scoreAnimated, setScoreAnimated] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const { metrics, getSummary } = useVision(videoRef, phase === "interview" && isRecording);
  const { transcript, listening, start: startSpeech, stop: stopSpeech, setTranscript } = useSpeechRecognition();

  useEffect(() => {
    if (phase === "interview") {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
          setCameraReady(true);
        })
        .catch(() => setCameraReady(false));
    }
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [phase]);

  useEffect(() => {
    const loadVoices = () => window.speechSynthesis.getVoices();
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const hints = [];
    if (metrics.eyeContact < 40) hints.push("👁️ Maintain eye contact with the camera");
    if (metrics.smile < 30) hints.push("😊 Smile naturally — show confidence!");
    if (metrics.headStability < 50) hints.push("🧠 Keep your head steady");
    if (hints.length) {
      setLiveHint(hints[0]);
      const t = setTimeout(() => setLiveHint(""), 3000);
      return () => clearTimeout(t);
    }
  }, [metrics, isRecording]);

  const generateQuestion = async (index, prevAnswers) => {
    setIsGenerating(true);
    setQuestionVisible(false);
    const q = await callClaude(index);
    setCurrentQuestion(q);
    setTimeout(() => setQuestionVisible(true), 100);
    setIsGenerating(false);
    setIsSpeaking(true);
    speak(q, () => {
      setIsSpeaking(false);
      setIsRecording(true);
      startSpeech();
    });
  };

  const startInterview = async (role) => {
    setSelectedRole(role);
    setPhase("interview");
    setQuestionIndex(0);
    setAnswers([]);
    setTimeout(() => generateQuestion(0, []), 800);
  };

  const submitAnswer = async () => {
    stopSpeech();
    setIsRecording(false);
    const answer = transcript.trim() || "(No answer recorded)";
    const newAnswer = {
      question: currentQuestion,
      answer,
      confidenceScore: +(metrics.eyeContact / 100).toFixed(2),
      gestureScore: +(metrics.gestures / 100).toFixed(2),
    };
    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);
    setTranscript("");
    const nextIndex = questionIndex + 1;
    if (nextIndex >= TOTAL_QUESTIONS) {
      await finishInterview(updatedAnswers);
    } else {
      setQuestionIndex(nextIndex);
      generateQuestion(nextIndex, updatedAnswers);
    }
  };

  const retryQuestion = () => {
    stopSpeech();
    setIsRecording(false);
    setTranscript("");
    setIsSpeaking(true);
    speak(currentQuestion, () => {
      setIsSpeaking(false);
      setIsRecording(true);
      startSpeech();
    });
  };

  const finishInterview = async (finalAnswers) => {
    setIsGenerating(true);
    setPhase("results");
    const evalData = await evaluateInterview();
    const session = {
      role: selectedRole.label,
      date: new Date().toISOString(),
      questions: finalAnswers,
      finalScore: evalData.overallScore,
      feedback: evalData.feedback,
      categories: evalData.categories,
      strengths: evalData.strengths,
      improvements: evalData.improvements,
    };
    setSessionData(session);
    setEvaluation(evalData);
    setIsGenerating(false);
    setTimeout(() => setScoreAnimated(true), 500);
  };

  const downloadReport = () => {
    if (!sessionData) return;
    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `intriview_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── LANDING ───────────────────────────────────────────────────────────────
  if (phase === "landing") {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "'Syne', sans-serif", color: "#f0ede8", display: "flex", flexDirection: "column", alignItems: "center", overflowX: "hidden", position: "relative" }}>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
          @keyframes fadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
          @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
          .role-card:hover { transform: translateY(-4px) scale(1.02); border-color: #c9a96e !important; }
          .role-card { transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1); }
          .start-btn:hover { transform: scale(1.04); box-shadow: 0 0 40px rgba(201,169,110,0.5) !important; }
          .start-btn { transition: all 0.2s ease; }
        `}</style>

        <div style={{ position: "fixed", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(201,169,110,0.08) 1px, transparent 0)", backgroundSize: "40px 40px", pointerEvents: "none" }} />
        <div style={{ position: "fixed", top: "20%", left: "10%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,169,110,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "fixed", bottom: "15%", right: "8%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(100,160,255,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

        <header style={{ width: "100%", maxWidth: 1100, padding: "32px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #c9a96e, #e8d5a3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, animation: "float 3s ease-in-out infinite" }}>🎯</div>
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", background: "linear-gradient(90deg, #c9a96e, #e8d5a3, #c9a96e)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 3s linear infinite" }}>IntriView</span>
          </div>
          <div style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: "rgba(201,169,110,0.6)", letterSpacing: 2, textTransform: "uppercase" }}>AI Mock Interview</div>
        </header>

        <main style={{ flex: 1, width: "100%", maxWidth: 900, padding: "40px 40px 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ animation: "fadeUp 0.8s ease both" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(201,169,110,0.08)", border: "1px solid rgba(201,169,110,0.2)", borderRadius: 100, padding: "6px 16px", marginBottom: 28, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: "#c9a96e", letterSpacing: 1.5, textTransform: "uppercase" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
              AI-Powered · Real-time Analysis
            </div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(48px, 8vw, 82px)", lineHeight: 1.0, margin: "0 0 12px", fontWeight: 400, letterSpacing: "-1px" }}>
              <span style={{ display: "block", color: "#f0ede8" }}>Interview with</span>
              <span style={{ display: "block", fontStyle: "italic", background: "linear-gradient(90deg, #c9a96e 0%, #e8d5a3 50%, #c9a96e 100%)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 3s linear infinite" }}>confidence.</span>
            </h1>
            <p style={{ fontSize: 17, color: "rgba(240,237,232,0.55)", maxWidth: 560, margin: "20px auto 52px", lineHeight: 1.7 }}>
              10 intelligent questions. Live expression tracking. Instant AI feedback. Your personal interview coach, available 24/7.
            </p>
          </div>

          <div style={{ width: "100%", animation: "fadeUp 0.8s 0.2s ease both", opacity: 0, animationFillMode: "forwards" }}>
            <p style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: "rgba(201,169,110,0.5)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 20 }}>Select your role</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 40 }}>
              {ROLES.map((role) => (
                <button key={role.id} className="role-card" onClick={() => setSelectedRole(role)} style={{
                  background: selectedRole?.id === role.id ? "rgba(201,169,110,0.12)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${selectedRole?.id === role.id ? "#c9a96e" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 14, padding: "18px 14px", cursor: "pointer",
                  color: selectedRole?.id === role.id ? "#e8d5a3" : "rgba(240,237,232,0.65)",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  fontSize: 14, fontWeight: selectedRole?.id === role.id ? 600 : 400, fontFamily: "'Syne', sans-serif",
                }}>
                  <span style={{ fontSize: 26 }}>{role.icon}</span>
                  {role.label}
                </button>
              ))}
            </div>

            <button className="start-btn" onClick={() => selectedRole && startInterview(selectedRole)} style={{
              background: selectedRole ? "linear-gradient(135deg, #c9a96e, #e8d5a3)" : "rgba(255,255,255,0.05)",
              border: "none", borderRadius: 14, padding: "18px 52px", fontSize: 16, fontWeight: 700,
              color: selectedRole ? "#0a0a0f" : "rgba(255,255,255,0.2)",
              cursor: selectedRole ? "pointer" : "not-allowed", fontFamily: "'Syne', sans-serif",
              letterSpacing: 0.5, boxShadow: selectedRole ? "0 0 30px rgba(201,169,110,0.3)" : "none",
            }}>
              Begin Interview →
            </button>
          </div>

          <div style={{ display: "flex", gap: 32, marginTop: 60, flexWrap: "wrap", justifyContent: "center", animation: "fadeUp 0.8s 0.4s ease both", opacity: 0, animationFillMode: "forwards" }}>
            {[["🎥", "Webcam Analysis"], ["😊", "Expression Tracking"], ["🧠", "AI Feedback"], ["📊", "Score Report"]].map(([icon, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(240,237,232,0.35)", fontFamily: "'IBM Plex Mono', monospace" }}>
                <span style={{ fontSize: 16 }}>{icon}</span>{label}
              </div>
            ))}
          </div>
        </main>

        <footer style={{ padding: "40px", fontSize: 11, color: "rgba(255,255,255,0.15)", fontFamily: "'IBM Plex Mono', monospace" }}>
          IntriView © 2025 — Powered by Claude AI
        </footer>
      </div>
    );
  }

  // ─── RESULTS ───────────────────────────────────────────────────────────────
  if (phase === "results") {
    const score = evaluation?.overallScore || 0;
    const cats = evaluation?.categories || {};
    const getColor = (s) => s >= 80 ? "#4ade80" : s >= 60 ? "#c9a96e" : "#f87171";

    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "'Syne', sans-serif", color: "#f0ede8", padding: "0 20px 60px" }}>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @keyframes fadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
          @keyframes countUp { from{opacity:0;transform:scale(0.5)} to{opacity:1;transform:scale(1)} }
          @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
          @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          .card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:16px; padding:24px; }
        `}</style>
        <div style={{ position: "fixed", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(201,169,110,0.05) 1px, transparent 0)", backgroundSize: "40px 40px", pointerEvents: "none" }} />

        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ textAlign: "center", padding: "48px 0 32px", animation: "fadeUp 0.6s ease both" }}>
            <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "rgba(201,169,110,0.5)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Interview Complete</div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 48, fontWeight: 400 }}>
              Your <span style={{ fontStyle: "italic", background: "linear-gradient(90deg, #c9a96e, #e8d5a3)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Results</span>
            </h1>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, marginTop: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
              {selectedRole?.label} · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>

          {isGenerating ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <div style={{ width: 48, height: 48, border: "3px solid rgba(201,169,110,0.2)", borderTopColor: "#c9a96e", borderRadius: "50%", margin: "0 auto 24px", animation: "spin 0.8s linear infinite" }} />
              <p style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>Analyzing your performance...</p>
            </div>
          ) : (
            <>
              <div style={{ animation: "countUp 0.8s 0.2s cubic-bezier(0.34,1.56,0.64,1) both", opacity: 0, animationFillMode: "forwards", display: "flex", justifyContent: "center", marginBottom: 32 }}>
                <div style={{ position: "relative", width: 160, height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="160" height="160" style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
                    <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                    <circle cx="80" cy="80" r="70" fill="none" stroke={getColor(score)} strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 70}`}
                      strokeDashoffset={`${2 * Math.PI * 70 * (1 - score / 100)}`}
                      style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.34,1,0.64,1)" }} />
                  </svg>
                  <div style={{ textAlign: "center", zIndex: 1 }}>
                    <div style={{ fontSize: 42, fontWeight: 800, color: getColor(score), lineHeight: 1 }}>{score}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>/ 100</div>
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 20, animation: "fadeUp 0.6s 0.4s ease both", opacity: 0, animationFillMode: "forwards" }}>
                <h3 style={{ fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", color: "rgba(201,169,110,0.7)", textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 20px" }}>Score Breakdown</h3>
                {Object.entries({ "Technical Knowledge": cats.technicalKnowledge, "Communication": cats.communication, "Confidence": cats.confidence, "Body Language": cats.bodyLanguage }).map(([label, val]) => (
                  <div key={label} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                      <span style={{ color: "rgba(255,255,255,0.7)" }}>{label}</span>
                      <span style={{ color: getColor(val || 0), fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>{val || 0}</span>
                    </div>
                    <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 100, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: `linear-gradient(90deg, ${getColor(val || 0)}, ${getColor(val || 0)}aa)`, borderRadius: 100, width: `${val || 0}%`, transition: "width 1.2s cubic-bezier(0.34,1.2,0.64,1)" }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20, animation: "fadeUp 0.6s 0.5s ease both", opacity: 0, animationFillMode: "forwards" }}>
                <div className="card">
                  <h3 style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: "#4ade80", textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 14px" }}>✓ Strengths</h3>
                  {(evaluation?.strengths || []).map((s, i) => <p key={i} style={{ margin: "0 0 8px", fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>· {s}</p>)}
                </div>
                <div className="card">
                  <h3 style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: "#f87171", textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 14px" }}>↑ Improve</h3>
                  {(evaluation?.improvements || []).map((s, i) => <p key={i} style={{ margin: "0 0 8px", fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>· {s}</p>)}
                </div>
              </div>

              <div className="card" style={{ marginBottom: 20, animation: "fadeUp 0.6s 0.6s ease both", opacity: 0, animationFillMode: "forwards" }}>
                <h3 style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: "rgba(201,169,110,0.7)", textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 14px" }}>Detailed Feedback</h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.8 }}>{evaluation?.feedback}</p>
              </div>

              <div className="card" style={{ marginBottom: 32, animation: "fadeUp 0.6s 0.7s ease both", opacity: 0, animationFillMode: "forwards" }}>
                <h3 style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: "rgba(201,169,110,0.7)", textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 20px" }}>Interview Transcript</h3>
                {answers.map((qa, i) => (
                  <div key={i} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: i < answers.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <p style={{ fontSize: 12, color: "rgba(201,169,110,0.6)", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 6 }}>Q{i + 1}</p>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", margin: "0 0 8px", fontWeight: 600 }}>{qa.question}</p>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>{qa.answer}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", animation: "fadeUp 0.6s 0.8s ease both", opacity: 0, animationFillMode: "forwards" }}>
                <button onClick={downloadReport} style={{ background: "linear-gradient(135deg, #c9a96e, #e8d5a3)", border: "none", borderRadius: 12, padding: "14px 32px", fontSize: 14, fontWeight: 700, color: "#0a0a0f", cursor: "pointer", fontFamily: "'Syne', sans-serif" }}>
                  ↓ Download Report
                </button>
                <button onClick={() => { setPhase("landing"); setSelectedRole(null); setAnswers([]); setEvaluation(null); setSessionData(null); }} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "14px 32px", fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.7)", cursor: "pointer", fontFamily: "'Syne', sans-serif" }}>
                  Start New Interview
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── INTERVIEW ─────────────────────────────────────────────────────────────
  const progress = (questionIndex / TOTAL_QUESTIONS) * 100;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "'Syne', sans-serif", color: "#f0ede8", display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes soundwave { 0%,100%{height:6px} 50%{height:20px} }
        .rec-bar { width: 3px; border-radius: 3px; background: #c9a96e; animation: soundwave 0.6s ease-in-out infinite; display: inline-block; margin: 0 1px; }
        .submit-btn:hover:not(:disabled) { transform: scale(1.03); box-shadow: 0 0 30px rgba(201,169,110,0.4); }
        .submit-btn { transition: all 0.2s ease; }
      `}</style>

      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.05)", zIndex: 100 }}>
        <div style={{ height: "100%", background: "linear-gradient(90deg, #c9a96e, #e8d5a3)", width: `${progress}%`, transition: "width 0.5s ease", borderRadius: "0 2px 2px 0" }} />
      </div>

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 32px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18, fontWeight: 800, background: "linear-gradient(90deg, #c9a96e, #e8d5a3)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>IntriView</span>
          <span style={{ fontSize: 11, background: "rgba(201,169,110,0.1)", border: "1px solid rgba(201,169,110,0.2)", color: "#c9a96e", borderRadius: 20, padding: "2px 10px", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1 }}>{selectedRole?.label}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: "rgba(255,255,255,0.3)" }}>Question {questionIndex + 1} of {TOTAL_QUESTIONS}</span>
          <div style={{ display: "flex", gap: 4 }}>
            {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => (
              <div key={i} style={{ width: 20, height: 4, borderRadius: 2, background: i < questionIndex ? "#c9a96e" : i === questionIndex ? "rgba(201,169,110,0.5)" : "rgba(255,255,255,0.08)", transition: "all 0.3s ease" }} />
            ))}
          </div>
        </div>
      </header>

      <main style={{ flex: 1, display: "grid", gridTemplateColumns: "340px 1fr", overflow: "hidden" }}>
        <div style={{ borderRight: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", padding: 24, gap: 16 }}>
          <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "#0f0f18", aspectRatio: "4/3" }}>
            <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transform: "scaleX(-1)" }} />
            {!cameraReady && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <span style={{ fontSize: 40 }}>📷</span>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'IBM Plex Mono', monospace" }}>Camera initializing...</p>
              </div>
            )}
            {isRecording && (
              <div style={{ position: "absolute", top: 12, left: 12, display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.6)", borderRadius: 20, padding: "4px 10px" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "pulse 1s ease-in-out infinite" }} />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", fontFamily: "'IBM Plex Mono', monospace" }}>REC</span>
              </div>
            )}
            {liveHint && (
              <div style={{ position: "absolute", bottom: 12, left: 12, right: 12, background: "rgba(0,0,0,0.75)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#e8d5a3" }}>
                {liveHint}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "Eye Contact", val: metrics.eyeContact, icon: "👁️" },
              { label: "Smile", val: metrics.smile, icon: "😊" },
              { label: "Stability", val: metrics.headStability, icon: "🧠" },
              { label: "Gestures", val: metrics.gestures, icon: "🤚" },
            ].map(({ label, val, icon }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 4 }}>{icon} {label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: val >= 60 ? "#4ade80" : val >= 40 ? "#c9a96e" : "#f87171" }}>
                  {isRecording ? val : "--"}<span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>%</span>
                </div>
                <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 100, marginTop: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${isRecording ? val : 0}%`, background: val >= 60 ? "#4ade80" : val >= 40 ? "#c9a96e" : "#f87171", borderRadius: 100, transition: "width 0.5s ease" }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 14px", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", gap: 8 }}>
            {isGenerating && <><div style={{ width: 14, height: 14, border: "2px solid rgba(201,169,110,0.3)", borderTopColor: "#c9a96e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />Generating question...</>}
            {isSpeaking && <><span style={{ animation: "pulse 1s ease-in-out infinite" }}>🔊</span> Speaking question...</>}
            {isRecording && listening && (
              <><div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 20 }}>
                {[0.1, 0.3, 0.5, 0.2, 0.4].map((d, i) => <div key={i} className="rec-bar" style={{ animationDelay: `${d}s` }} />)}
              </div> Listening...</>
            )}
            {!isGenerating && !isSpeaking && !isRecording && <><span>⏸</span> Ready</>}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: "32px 40px", gap: 24, overflowY: "auto" }}>
          <div style={{ animation: questionVisible ? "fadeUp 0.5s ease both" : "none" }}>
            <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: "rgba(201,169,110,0.5)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, background: "rgba(201,169,110,0.1)", border: "1px solid rgba(201,169,110,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>{questionIndex + 1}</div>
              Question {questionIndex + 1}
              {isSpeaking && <span style={{ color: "#c9a96e", animation: "pulse 1s ease-in-out infinite" }}>🔊</span>}
            </div>
            {isGenerating ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", height: 60 }}>
                <div style={{ width: 16, height: 16, border: "2px solid rgba(201,169,110,0.2)", borderTopColor: "#c9a96e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", fontFamily: "'IBM Plex Mono', monospace" }}>Crafting your question...</span>
              </div>
            ) : (
              <h2 style={{ fontSize: "clamp(20px, 3vw, 28px)", fontFamily: "'DM Serif Display', serif", fontWeight: 400, lineHeight: 1.4, color: "#f0ede8" }}>
                {currentQuestion}
              </h2>
            )}
          </div>

          <div style={{ flex: 1, minHeight: 160, background: "rgba(255,255,255,0.015)", border: `1px solid ${isRecording ? "rgba(201,169,110,0.2)" : "rgba(255,255,255,0.05)"}`, borderRadius: 16, padding: "20px 24px", transition: "border-color 0.3s ease", position: "relative" }}>
            <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: "rgba(255,255,255,0.2)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
              Your Answer {isRecording && listening && "— Speaking now"}
            </div>
            {transcript ? (
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", lineHeight: 1.7 }}>{transcript}</p>
            ) : (
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.18)", fontStyle: "italic" }}>
                {isRecording ? "Start speaking your answer..." : isSpeaking ? "Listen to the question first..." : "Waiting..."}
              </p>
            )}
            {isRecording && listening && (
              <div style={{ position: "absolute", bottom: 16, right: 16, display: "flex", alignItems: "flex-end", gap: 3, height: 24 }}>
                {[0, 0.1, 0.2, 0.3, 0.15].map((d, i) => <div key={i} className="rec-bar" style={{ animationDelay: `${d}s`, animationDuration: `${0.4 + d}s` }} />)}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="submit-btn" onClick={submitAnswer} disabled={!isRecording || isGenerating} style={{
              background: isRecording && !isGenerating ? "linear-gradient(135deg, #c9a96e, #e8d5a3)" : "rgba(255,255,255,0.04)",
              border: "none", borderRadius: 12, padding: "14px 28px", fontSize: 14, fontWeight: 700,
              color: isRecording && !isGenerating ? "#0a0a0f" : "rgba(255,255,255,0.2)",
              cursor: isRecording && !isGenerating ? "pointer" : "not-allowed", fontFamily: "'Syne', sans-serif",
            }}>
              {questionIndex < TOTAL_QUESTIONS - 1 ? "Next Question →" : "Finish Interview ✓"}
            </button>
            <button onClick={retryQuestion} disabled={isGenerating || isSpeaking} style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 20px", fontSize: 13, fontWeight: 600,
              color: "rgba(255,255,255,0.5)", cursor: isGenerating || isSpeaking ? "not-allowed" : "pointer", fontFamily: "'Syne', sans-serif",
            }}>
              ↺ Replay Question
            </button>
          </div>

          {answers.length > 0 && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 24 }}>
              <p style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: "rgba(255,255,255,0.2)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Previous Answers</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {answers.slice(-3).map((qa, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.015)", borderRadius: 10, padding: "12px 16px" }}>
                    <p style={{ fontSize: 11, color: "rgba(201,169,110,0.5)", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 4 }}>Q{answers.length - (answers.slice(-3).length - 1 - i)}</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 4, fontWeight: 600 }}>{qa.question.substring(0, 80)}...</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>{(qa.answer || "").substring(0, 120)}{qa.answer?.length > 120 ? "..." : ""}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
