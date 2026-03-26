import { useEffect, useState, useRef } from "react";
import { predictRisk, getRecommendations } from "./api";
import axios from "axios";

const RISK_CFG = {
  Low:    { color: "#10b981", bg: "rgba(16,185,129,0.07)",  border: "rgba(16,185,129,0.25)", pct: 20, icon: "✅" },
  Medium: { color: "#eab308", bg: "rgba(234,179,8,0.07)",   border: "rgba(234,179,8,0.25)",  pct: 60, icon: "⚠️" },
  High:   { color: "#ef4444", bg: "rgba(239,68,68,0.07)",   border: "rgba(239,68,68,0.25)",  pct: 90, icon: "🚨" },
};
const RISK_EXPLAIN = {
  Low:    "Your lifestyle indicators suggest low risk. Keep up the good habits.",
  Medium: "Some risk factors present. Targeted lifestyle changes can reduce your risk.",
  High:   "Multiple risk factors detected. Lifestyle intervention and medical consultation recommended.",
};

export default function RiskResults({ profile, onNext }) {
  const [risks, setRisks]         = useState(null);
  const [plan, setPlan]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [error, setError]         = useState("");
  const [chatOpen, setChatOpen]   = useState(false);

  useEffect(() => {
    predictRisk(profile)
      .then(res => {
        setRisks(res.data); setLoading(false); setLoadingPlan(true);
        return getRecommendations({ ...profile, ...res.data });
      })
      .then(res => { setPlan(parsePlan(res.data.recommendations)); setLoadingPlan(false); })
      .catch(e  => { setError(e.message); setLoading(false); });
  }, [profile]);

  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorScreen message={error} />;

  return (
    <div style={{ background: "#020617", minHeight: "100vh", padding: "20px 16px 90px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, background: "rgba(16,185,129,0.1)", border: "1.5px solid rgba(16,185,129,0.2)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🩺</div>
          <div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f1f5f9" }}>Health Risk Report</div>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{profile.name} · BMI {profile.bmi} · Age {profile.age}</div>
          </div>
        </div>

        {/* Risk Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { label: "Diabetes Risk",     risk: risks?.diabetes_risk,     icon: "🩸" },
            { label: "Hypertension Risk", risk: risks?.hypertension_risk, icon: "💓" },
          ].map(({ label, risk, icon }) => {
            const cfg = RISK_CFG[risk] || RISK_CFG.Low;
            return (
              <div key={label} style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}`, borderRadius: 16, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 22 }}>{icon}</span>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{cfg.icon} {risk}</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: 10 }}>{label}</div>
                <div style={{ height: 5, background: "#1e293b", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: 5, width: `${cfg.pct}%`, background: cfg.color, borderRadius: 999, transition: "width 1s ease" }} />
                </div>
                <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 8, lineHeight: 1.5 }}>{RISK_EXPLAIN[risk]}</div>
              </div>
            );
          })}
        </div>

        {/* Risk Factor Grid */}
        <RiskFactors profile={profile} />

        {/* AI Plan */}
        <div style={{ background: "#0f172a", border: "1.5px solid #1e293b", borderRadius: 16, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 30, height: 30, background: "rgba(16,185,129,0.1)", border: "1.5px solid rgba(16,185,129,0.2)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
            <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: "0.95rem" }}>Personalized Health Plan</span>
            <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "#475569", background: "#1e293b", padding: "3px 8px", borderRadius: 999 }}>Powered by Groq</span>
          </div>
          {loadingPlan ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[80, 65, 90].map((w, i) => (
                <div key={i} style={{ height: 12, background: "#1e293b", borderRadius: 6, width: `${w}%`, animation: "pulse 1.5s ease-in-out infinite" }} />
              ))}
              <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: 4 }}>Generating your personalized Indian health plan...</div>
            </div>
          ) : plan ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {plan.map(s => <PlanSection key={s.title} {...s} />)}
            </div>
          ) : null}
        </div>

        {/* Chat */}
        <button onClick={() => setChatOpen(true)} style={{
          width: "100%", padding: "12px 0", background: "#0f172a", border: "1.5px solid #1e293b",
          borderRadius: 12, color: "#94a3b8", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>💬 Ask AI about your results</button>

        <button onClick={() => onNext(risks)} style={{
          width: "100%", padding: "14px 0", background: "#10b981", border: "none",
          borderRadius: 12, color: "white", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer",
        }}>Start Daily Tracking →</button>

        {chatOpen && <ChatModal profile={profile} risks={risks} onClose={() => setChatOpen(false)} />}
      </div>
    </div>
  );
}

function RiskFactors({ profile }) {
  const factors = [
    { label: "BMI",            value: profile.bmi,                                                    ok: profile.bmi < 25,                                    detail: profile.bmi < 25 ? "Normal" : "Above normal" },
    { label: "Activity",       value: ["Sedentary","Light","Moderate","Active"][profile.activity_level], ok: profile.activity_level >= 2,                       detail: profile.activity_level < 2 ? "Too low" : "Good" },
    { label: "Sleep",          value: `${profile.sleep_hours}h`,                                       ok: profile.sleep_hours >= 6 && profile.sleep_hours <= 9, detail: profile.sleep_hours < 6 ? "Too little" : profile.sleep_hours > 9 ? "Too much" : "Optimal" },
    { label: "Diet",           value: `${profile.diet_score}/10`,                                      ok: profile.diet_score >= 6,                              detail: profile.diet_score >= 6 ? "Good" : "Needs work" },
    { label: "Family History", value: profile.family_history ? "Yes" : "No",                          ok: !profile.family_history,                              detail: profile.family_history ? "Genetic risk" : "No risk" },
    { label: "Stress",         value: `${profile.stress_level}/10`,                                    ok: profile.stress_level <= 5,                            detail: profile.stress_level <= 5 ? "Manageable" : "High" },
  ];
  return (
    <div style={{ background: "#0f172a", border: "1.5px solid #1e293b", borderRadius: 16, padding: 18 }}>
      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#f1f5f9", marginBottom: 12 }}>Risk Factor Analysis</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {factors.map(({ label, value, ok, detail }) => (
          <div key={label} style={{ background: ok ? "rgba(16,185,129,0.05)" : "rgba(234,179,8,0.05)", border: `1.5px solid ${ok ? "rgba(16,185,129,0.2)" : "rgba(234,179,8,0.2)"}`, borderRadius: 10, padding: "10px 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: "0.7rem", color: "#64748b" }}>{label}</span>
              <span style={{ fontSize: "0.7rem", color: ok ? "#10b981" : "#eab308" }}>{ok ? "✓" : "!"}</span>
            </div>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#f1f5f9" }}>{value}</div>
            <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: 2 }}>{detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanSection({ title, icon, items }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ border: "1.5px solid #1e293b", borderRadius: 12, overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "11px 14px", background: "#0a0f1e", border: "none", cursor: "pointer",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#f1f5f9" }}>{title}</span>
        </div>
        <span style={{ fontSize: "0.7rem", color: "#475569" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <ul style={{ padding: "12px 14px", margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item, i) => (
            <li key={i} style={{ display: "flex", gap: 8, fontSize: "0.85rem", color: "#94a3b8", lineHeight: 1.5 }}>
              <span style={{ color: "#10b981", flexShrink: 0, marginTop: 2 }}>•</span>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChatModal({ profile, risks, onClose }) {
  const [messages, setMessages] = useState([{ role: "assistant", text: `Hi ${profile.name}! Ask me anything about your health results.` }]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim(); setInput("");
    setMessages(m => [...m, { role: "user", text: msg }]);
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/chat", { message: msg, context: { profile, risks } });
      setMessages(m => [...m, { role: "assistant", text: res.data.reply }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", text: "Could not connect to AI. Make sure backend is running." }]);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200, padding: "0 16px 16px" }}>
      <div style={{ width: "100%", maxWidth: 480, background: "#0f172a", border: "1.5px solid #1e293b", borderRadius: 20, display: "flex", flexDirection: "column", maxHeight: "70vh" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #1e293b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>🤖</span>
            <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: "0.9rem" }}>Health AI Assistant</span>
            <span style={{ fontSize: "0.65rem", color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "2px 8px", borderRadius: 999 }}>Online</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "78%", padding: "10px 14px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", fontSize: "0.85rem", lineHeight: 1.55, background: m.role === "user" ? "#10b981" : "#1e293b", color: m.role === "user" ? "white" : "#cbd5e1" }}>{m.text}</div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: 5, padding: "10px 14px", background: "#1e293b", borderRadius: "16px 16px 16px 4px", width: "fit-content" }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, background: "#64748b", borderRadius: "50%", animation: `bounce 0.8s ${i*0.15}s ease-in-out infinite` }} />)}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: "12px 14px", borderTop: "1px solid #1e293b", display: "flex", gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Ask about your health..." className="input" style={{ flex: 1 }} />
          <button onClick={send} disabled={loading || !input.trim()} style={{
            padding: "10px 16px", background: "#10b981", border: "none", borderRadius: 10,
            color: "white", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", opacity: loading || !input.trim() ? 0.5 : 1,
          }}>Send</button>
        </div>
      </div>
    </div>
  );
}

function parsePlan(text) {
  return [
    { title: "Diet Plan",        icon: "🥗" },
    { title: "Exercise Routine", icon: "🏃" },
    { title: "Lifestyle Tips",   icon: "💡" },
  ].map(({ title, icon }) => {
    const regex = new RegExp(`${title}[:\\s]*([\\s\\S]*?)(?=Diet Plan|Exercise Routine|Lifestyle Tips|$)`, "i");
    const match = text.match(regex);
    const raw = match ? match[1] : text;
    const items = raw.split("\n").map(l => l.replace(/^[-•*\d.]+\s*/, "").trim()).filter(l => l.length > 10).slice(0, 6);
    return { title, icon, items: items.length ? items : [raw.trim().slice(0, 200)] };
  });
}

export function LoadingScreen() {
  const steps = ["Running ML model...", "Calculating risk scores...", "Preparing your report..."];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => Math.min(i + 1, 2)), 1200);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ minHeight: "100vh", background: "#020617", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
      <div style={{ position: "relative", width: 64, height: 64 }}>
        <div style={{ position: "absolute", inset: 0, border: "4px solid rgba(16,185,129,0.15)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", inset: 0, border: "4px solid #10b981", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🩺</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, textAlign: "center" }}>
        {steps.map((s, i) => (
          <div key={s} style={{ fontSize: "0.85rem", color: i === idx ? "#f1f5f9" : i < idx ? "#10b981" : "#334155", transition: "color 0.3s" }}>
            {i < idx ? "✓ " : i === idx ? "→ " : "  "}{s}
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorScreen({ message }) {
  return (
    <div style={{ minHeight: "100vh", background: "#020617", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 32, textAlign: "center" }}>
      <span style={{ fontSize: 40 }}>⚠️</span>
      <div style={{ fontWeight: 700, color: "#f1f5f9" }}>Could not connect to backend</div>
      <div style={{ color: "#64748b", fontSize: "0.85rem" }}>Make sure Flask is running on port 5000</div>
      <code style={{ fontSize: "0.75rem", color: "#ef4444", background: "#0f172a", padding: "8px 14px", borderRadius: 8 }}>{message}</code>
    </div>
  );
}
