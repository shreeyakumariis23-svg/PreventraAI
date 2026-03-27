import { useEffect, useState, useRef } from "react";
import { predictRisk, getRecommendations, askHealthChat } from "./api";

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
  const [simulator, setSimulator] = useState(() => createSimulatorState(profile));
  const [simulatedRisks, setSimulatedRisks] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    predictRisk(profile)
      .then(res => {
        setRisks(res.data);
        setSimulatedRisks(res.data);
        setLoading(false);
        setLoadingPlan(true);
        return getRecommendations({ ...profile, ...res.data })
          .then(planRes => {
            setPlan(parsePlan(planRes.data.recommendations, planRes.data.recommendations_parsed));
            setLoadingPlan(false);
          })
          .catch(() => {
            setLoadingPlan(false);
            setPlan(parsePlan("Lifestyle Tips\n- Recommendations are temporarily unavailable. Keep following the healthy habits shown in your risk factors and daily tracker."));
          });
      })
      .catch(e  => {
        setError(e.message);
        setLoading(false);
        setLoadingPlan(false);
      });
  }, [profile]);

  useEffect(() => {
    setSimulator(createSimulatorState(profile));
  }, [profile]);

  useEffect(() => {
    if (!risks) return;
    if (isSameSimulator(profile, simulator)) {
      setSimulatedRisks(risks);
      return;
    }

    const timer = setTimeout(async () => {
      setSimLoading(true);
      try {
        const res = await predictRisk(buildSimulatedProfile(profile, simulator));
        setSimulatedRisks(res.data);
      } catch {
        setSimulatedRisks(risks);
      } finally {
        setSimLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [profile, risks, simulator]);

  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorScreen message={error} />;

  const explainability = buildExplainability(profile, risks);

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

        <ExplainabilityCard explainability={explainability} />

        <SimulationCard
          profile={profile}
          simulator={simulator}
          onChange={(key, value) => setSimulator((current) => ({ ...current, [key]: value }))}
          currentRisks={risks}
          simulatedRisks={simulatedRisks || risks}
          loading={simLoading}
          onReset={() => setSimulator(createSimulatorState(profile))}
        />

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
      const res = await askHealthChat({ message: msg, context: { profile, risks } });
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

function parsePlan(text, parsedPayload) {
  if (parsedPayload?.sections?.length) {
    const iconMap = {
      "Calorie Target": "🔥",
      "Diet Plan": "🥗",
      "Exercise Routine": "🏃",
      "Lifestyle Tips": "💡",
    };
    return parsedPayload.sections.map((section) => ({
      title: section.title,
      icon: iconMap[section.title] || "•",
      items: (section.items || []).filter(Boolean).slice(0, 6),
    }));
  }

  return [
    { title: "Calorie Target",   icon: "🔥" },
    { title: "Diet Plan",        icon: "🥗" },
    { title: "Exercise Routine", icon: "🏃" },
    { title: "Lifestyle Tips",   icon: "💡" },
  ].map(({ title, icon }) => {
    const regex = new RegExp(`${title}[:\\s]*([\\s\\S]*?)(?=Calorie Target|Diet Plan|Exercise Routine|Lifestyle Tips|$)`, "i");
    const match = text.match(regex);
    const raw = match ? match[1] : text;
    const items = raw
      .split("\n")
      .map((line) => line.replace(/\*\*/g, "").replace(/^[-•*\d.]+\s*/, "").trim())
      .filter((line) => line.length > 10)
      .slice(0, 6);
    return { title, icon, items: items.length ? items : [raw.trim().slice(0, 200)] };
  });
}

function createSimulatorState(profile) {
  return {
    weight: profile.weight,
    sleep_hours: profile.sleep_hours,
    diet_score: profile.diet_score,
    activity_level: profile.activity_level,
  };
}

function isSameSimulator(profile, simulator) {
  return (
    Number(simulator.weight) === Number(profile.weight) &&
    Number(simulator.sleep_hours) === Number(profile.sleep_hours) &&
    Number(simulator.diet_score) === Number(profile.diet_score) &&
    Number(simulator.activity_level) === Number(profile.activity_level)
  );
}

function buildSimulatedProfile(profile, simulator) {
  const bmi = +(Number(simulator.weight) / ((Number(profile.height) / 100) ** 2)).toFixed(1);
  return {
    ...profile,
    weight: Number(simulator.weight),
    sleep_hours: Number(simulator.sleep_hours),
    diet_score: Number(simulator.diet_score),
    activity_level: Number(simulator.activity_level),
    bmi,
  };
}

function buildExplainability(profile, risks) {
  const riskDrivers = (disease) => {
    const drivers = [];
    if (profile.bmi >= (disease === "diabetes" ? 27 : 25)) drivers.push({ label: "BMI above target range", impact: "high" });
    if (profile.activity_level <= 1) drivers.push({ label: "Low physical activity", impact: "medium" });
    if (profile.sleep_hours < 6) drivers.push({ label: "Sleep below 6 hours", impact: "medium" });
    if (profile.family_history) drivers.push({ label: "Family history present", impact: "high" });
    if (profile.diet_score <= 4) drivers.push({ label: "Diet quality needs work", impact: "medium" });
    if (profile.stress_level >= 7 && disease === "hypertension") drivers.push({ label: "High stress load", impact: "medium" });
    if (profile.smoking && disease === "hypertension") drivers.push({ label: "Smoking raises BP strain", impact: "high" });
    if ((profile.conditions || []).some((condition) => condition !== "None")) drivers.push({ label: "Existing conditions add complexity", impact: "medium" });

    if (!drivers.length) drivers.push({ label: "Most core lifestyle markers are in a safer range", impact: "low" });
    return drivers.slice(0, 4);
  };

  return [
    { title: "Diabetes", risk: risks?.diabetes_risk, drivers: riskDrivers("diabetes") },
    { title: "Hypertension", risk: risks?.hypertension_risk, drivers: riskDrivers("hypertension") },
  ];
}

function ExplainabilityCard({ explainability }) {
  return (
    <div style={{ background: "linear-gradient(180deg, rgba(15,23,42,0.96), rgba(8,15,31,0.98))", border: "1.5px solid #1e293b", borderRadius: 18, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>🧠</span>
        <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "#f8fafc" }}>Why These Risks?</span>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {explainability.map((item) => (
          <div key={item.title} style={{ border: "1px solid #1e293b", borderRadius: 14, padding: 14, background: "#0a0f1e" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#f8fafc" }}>{item.title}</div>
              <RiskBadge risk={item.risk} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {item.drivers.map((driver, index) => (
                <div key={`${driver.label}-${index}`} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: driver.impact === "high" ? "#ef4444" : driver.impact === "medium" ? "#eab308" : "#10b981", marginTop: 6, flexShrink: 0 }} />
                  <div style={{ fontSize: "0.8rem", color: "#cbd5e1", lineHeight: 1.55 }}>{driver.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimulationCard({ profile, simulator, onChange, currentRisks, simulatedRisks, loading, onReset }) {
  const projectedProfile = buildSimulatedProfile(profile, simulator);
  const activityLabels = ["Sedentary", "Light", "Moderate", "Active"];

  return (
    <div style={{ background: "linear-gradient(135deg, rgba(14,116,144,0.18), rgba(15,23,42,0.96))", border: "1.5px solid rgba(34,211,238,0.18)", borderRadius: 18, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f8fafc" }}>Risk Scenario Lab</div>
          <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: 2 }}>Try changes and see how your risk could move.</div>
        </div>
        <button onClick={onReset} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(34,211,238,0.18)", background: "#0a0f1e", color: "#67e8f9", fontSize: "0.76rem", fontWeight: 700, cursor: "pointer" }}>
          Reset
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <SimulatorMetric label="Projected BMI" value={projectedProfile.bmi} />
        <SimulatorMetric label="Activity Mode" value={activityLabels[simulator.activity_level]} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        <SimSlider label="Weight" value={simulator.weight} min={Math.max(35, profile.weight - 20)} max={Math.min(180, profile.weight + 20)} step={1} suffix="kg" onChange={(value) => onChange("weight", value)} />
        <SimSlider label="Sleep" value={simulator.sleep_hours} min={4} max={10} step={0.5} suffix="h" onChange={(value) => onChange("sleep_hours", value)} />
        <SimSlider label="Diet Quality" value={simulator.diet_score} min={1} max={10} step={1} suffix="/10" onChange={(value) => onChange("diet_score", value)} />
        <SimSlider label="Activity Level" value={simulator.activity_level} min={0} max={3} step={1} suffix={` · ${activityLabels[simulator.activity_level]}`} onChange={(value) => onChange("activity_level", value)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <ProjectedRiskCard title="Diabetes" current={currentRisks?.diabetes_risk} projected={simulatedRisks?.diabetes_risk} loading={loading} />
        <ProjectedRiskCard title="Hypertension" current={currentRisks?.hypertension_risk} projected={simulatedRisks?.hypertension_risk} loading={loading} />
      </div>
    </div>
  );
}

function SimSlider({ label, value, min, max, step, suffix, onChange }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>{label}</span>
        <span style={{ fontSize: "0.78rem", color: "#67e8f9", fontWeight: 700 }}>{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} style={{ width: "100%", accentColor: "#22d3ee" }} />
    </div>
  );
}

function ProjectedRiskCard({ title, current, projected, loading }) {
  return (
    <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 14, padding: 14 }}>
      <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <RiskBadge risk={current} />
        <span style={{ color: "#475569", fontSize: "0.75rem" }}>→</span>
        <RiskBadge risk={projected} />
      </div>
      <div style={{ fontSize: "0.72rem", color: "#67e8f9", marginTop: 8 }}>
        {loading ? "Updating projection..." : current === projected ? "No change yet" : "Projected improvement/risk shift detected"}
      </div>
    </div>
  );
}

function RiskBadge({ risk }) {
  const cfg = RISK_CFG[risk] || RISK_CFG.Low;
  return (
    <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {risk || "Unknown"}
    </span>
  );
}

function SimulatorMetric({ label, value }) {
  return (
    <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: "0.68rem", color: "#64748b", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "1rem", fontWeight: 700, color: "#f8fafc" }}>{value}</div>
    </div>
  );
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
