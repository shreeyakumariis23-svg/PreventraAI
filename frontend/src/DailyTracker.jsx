import { useState } from "react";
import { getDailyFeedback, getHealthScore, getAlerts } from "./api";

const MOODS = [
  { emoji: "😄", label: "Great", value: 5 },
  { emoji: "🙂", label: "Good",  value: 4 },
  { emoji: "😐", label: "Okay",  value: 3 },
  { emoji: "😔", label: "Low",   value: 2 },
  { emoji: "😩", label: "Awful", value: 1 },
];
const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snacks"];
const MEAL_PH    = { Breakfast: "e.g. Poha, chai", Lunch: "e.g. Dal rice, sabzi", Dinner: "e.g. Roti, paneer", Snacks: "e.g. Fruits, biscuits" };

function todayStr() { return new Date().toLocaleDateString("en-IN"); }
function calcStreak(logs) {
  if (!logs.length) return 0;
  let streak = 0;
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i = 0; i < 30; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    if (logs.some(l => l.date === d.toLocaleDateString("en-IN"))) streak++;
    else if (i > 0) break;
  }
  return streak;
}

export default function DailyTracker({ profile, risks, logs, onLogSaved }) {
  const streak     = calcStreak(logs);
  const todayLogged = logs.some(l => l.date === todayStr());

  const [form, setForm] = useState({ steps: "", sleep: "", diet_score: 5, water: 2, mood: 4, heart_rate: "", meals: { Breakfast: "", Lunch: "", Dinner: "", Snacks: "" } });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const set     = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setMeal = (k, v) => setForm(f => ({ ...f, meals: { ...f.meals, [k]: v } }));

  const foodSummary = Object.entries(form.meals).filter(([,v]) => v.trim()).map(([k,v]) => `${k}: ${v}`).join("; ");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!foodSummary) { alert("Please enter at least one meal."); return; }
    setLoading(true);
    try {
      const payload = { steps: +form.steps, sleep: +form.sleep, diet_score: form.diet_score, food: foodSummary, water: form.water, mood: form.mood, heart_rate: form.heart_rate || null, recommended_steps: 8000 };
      const [scoreRes, feedbackRes, alertsRes] = await Promise.all([getHealthScore(payload), getDailyFeedback(payload), getAlerts(payload)]);
      const log = { date: todayStr(), steps: +form.steps, sleep: +form.sleep, diet_score: form.diet_score, water: form.water, mood: form.mood, heart_rate: form.heart_rate || null, meals: form.meals, health_score: scoreRes.data.health_score, feedback: feedbackRes.data.feedback, alerts: alertsRes.data.alerts };
      setResult(log); onLogSaved(log);
    } catch (error) {
      const message = error?.response?.data?.error || "Could not save today's check-in. Please make sure the backend is running and try again.";
      alert(message);
    } finally { setLoading(false); }
  };

  if (result) return <FeedbackView result={result} streak={streak + 1} onNext={() => setResult(null)} />;

  return (
    <div style={{ background: "#020617", minHeight: "100vh", padding: "20px 16px 90px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#f1f5f9" }}>Daily Check-In</div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(249,115,22,0.1)", border: "1.5px solid rgba(249,115,22,0.2)", borderRadius: 12, padding: "6px 12px" }}>
            <span>🔥</span>
            <span style={{ color: "#f97316", fontWeight: 700, fontSize: "0.9rem" }}>{streak}</span>
            <span style={{ color: "#64748b", fontSize: "0.72rem" }}>day streak</span>
          </div>
        </div>

        {todayLogged && (
          <div style={{ background: "rgba(16,185,129,0.08)", border: "1.5px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#10b981" }}>✓</span>
            <span style={{ color: "#6ee7b7", fontSize: "0.85rem" }}>Already logged today — submit again to update.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Steps */}
          <Section icon="👟" title="Steps Walked" borderColor="rgba(59,130,246,0.25)">
            <input type="number" value={form.steps} onChange={e => set("steps", e.target.value)}
              placeholder="e.g. 7500" min={0} max={60000} required className="input" />
            <ProgressBar value={+form.steps} max={10000} color="#3b82f6" label={`${(+form.steps).toLocaleString()} / 10,000 steps`} />
          </Section>

          {/* Meals */}
          <Section icon="🥗" title="Meals Today" borderColor="rgba(16,185,129,0.25)">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {MEAL_TYPES.map(meal => (
                <div key={meal} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: "0.72rem", color: "#64748b", width: 60, flexShrink: 0 }}>{meal}</span>
                  <input type="text" value={form.meals[meal]} onChange={e => setMeal(meal, e.target.value)}
                    placeholder={MEAL_PH[meal]} className="input input-sm" style={{ flex: 1 }} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Diet Quality</span>
                <span style={{ fontSize: "0.78rem", color: form.diet_score >= 7 ? "#10b981" : form.diet_score >= 4 ? "#eab308" : "#ef4444" }}>
                  {form.diet_score}/10 — {form.diet_score >= 7 ? "Healthy" : form.diet_score >= 4 ? "Average" : "Poor"}
                </span>
              </div>
              <input type="range" min={1} max={10} value={form.diet_score} onChange={e => set("diet_score", +e.target.value)} style={{ width: "100%", accentColor: "#10b981" }} />
            </div>
          </Section>

          {/* Sleep */}
          <Section icon="😴" title="Sleep Hours" borderColor="rgba(168,85,247,0.25)">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input type="number" value={form.sleep} onChange={e => set("sleep", e.target.value)}
                placeholder="hrs" min={0} max={24} step={0.5} required className="input" style={{ width: 90 }} />
              <div style={{ flex: 1 }}>
                <ProgressBar value={+form.sleep} max={9} color={+form.sleep < 6 ? "#ef4444" : "#a855f7"}
                  label={+form.sleep < 6 ? "Too little sleep" : +form.sleep <= 9 ? "Optimal range" : "Oversleeping"} />
              </div>
            </div>
          </Section>

          {/* Water + Heart Rate */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Section icon="💧" title="Water" borderColor="rgba(6,182,212,0.25)">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <input type="number" value={form.water} onChange={e => set("water", +e.target.value)}
                  min={0} max={8} step={0.5} className="input" style={{ width: 70, textAlign: "center" }} />
                <span style={{ color: "#64748b", fontSize: "0.8rem" }}>litres</span>
              </div>
              <WaterDots litres={form.water} />
            </Section>

            <Section icon="❤️" title="Heart Rate" borderColor="rgba(239,68,68,0.25)">
              <input type="number" value={form.heart_rate} onChange={e => set("heart_rate", e.target.value)}
                placeholder="bpm (opt.)" min={40} max={200} className="input" />
              {form.heart_rate && (
                <div style={{ fontSize: "0.72rem", marginTop: 6, color: +form.heart_rate < 60 ? "#3b82f6" : +form.heart_rate <= 100 ? "#10b981" : "#ef4444" }}>
                  {+form.heart_rate < 60 ? "Low — consult doctor" : +form.heart_rate <= 100 ? "Normal range" : "Elevated — rest"}
                </div>
              )}
            </Section>
          </div>

          {/* Mood */}
          <Section icon="🧠" title="How are you feeling?" borderColor="rgba(236,72,153,0.25)">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {MOODS.map(({ emoji, label, value }) => (
                <button key={value} type="button" onClick={() => set("mood", value)} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  padding: "8px 6px", borderRadius: 12, cursor: "pointer", border: "1.5px solid",
                  background: form.mood === value ? "rgba(236,72,153,0.1)" : "transparent",
                  borderColor: form.mood === value ? "rgba(236,72,153,0.4)" : "transparent",
                  transform: form.mood === value ? "scale(1.1)" : "scale(1)", transition: "all 0.2s",
                }}>
                  <span style={{ fontSize: 22 }}>{emoji}</span>
                  <span style={{ fontSize: "0.65rem", color: "#64748b" }}>{label}</span>
                </button>
              ))}
            </div>
          </Section>

          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "14px 0", background: loading ? "#065f46" : "#10b981",
            border: "none", borderRadius: 12, color: "white", fontSize: "0.95rem", fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            {loading ? <><Spinner /> Analyzing with AI...</> : "Get AI Feedback →"}
          </button>
        </form>
      </div>
    </div>
  );
}

function FeedbackView({ result, streak, onNext }) {
  const score = result.health_score;
  const ringColor = score >= 75 ? "#10b981" : score >= 50 ? "#eab308" : "#ef4444";
  const C = 2 * Math.PI * 40;
  const dash = (score / 100) * C;

  return (
    <div style={{ background: "#020617", minHeight: "100vh", padding: "20px 16px 90px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#f1f5f9" }}>Today's Report</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(249,115,22,0.1)", border: "1.5px solid rgba(249,115,22,0.2)", borderRadius: 12, padding: "6px 12px" }}>
            <span>🔥</span>
            <span style={{ color: "#f97316", fontWeight: 700, fontSize: "0.85rem" }}>{streak} day streak!</span>
          </div>
        </div>

        {/* Score Ring */}
        <div style={{ background: "#0f172a", border: "1.5px solid #1e293b", borderRadius: 16, padding: 20, display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ position: "relative", width: 96, height: 96, flexShrink: 0 }}>
            <svg width="96" height="96" style={{ transform: "rotate(-90deg)" }} viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="10" />
              <circle cx="50" cy="50" r="40" fill="none" stroke={ringColor} strokeWidth="10"
                strokeDasharray={`${dash} ${C}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 1s ease" }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "1.4rem", fontWeight: 800, color: ringColor }}>{score}</span>
              <span style={{ fontSize: "0.65rem", color: "#64748b" }}>/ 100</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: 10 }}>Daily Health Score</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                ["👟", "Steps", (result.steps||0).toLocaleString()],
                ["🥗", "Diet",  `${result.diet_score}/10`],
                ["😴", "Sleep", `${result.sleep}h`],
                ["💧", "Water", `${result.water}L`],
                ...(result.heart_rate ? [["❤️", "HR", `${result.heart_rate} bpm`]] : []),
                [MOODS.find(m => m.value === result.mood)?.emoji || "🙂", "Mood", MOODS.find(m => m.value === result.mood)?.label || "Good"],
              ].map(([icon, label, value]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: "0.65rem", color: "#64748b", lineHeight: 1 }}>{label}</div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#f1f5f9" }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div style={{ background: "#0f172a", border: "1.5px solid #1e293b", borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Score Breakdown</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Steps (40%)", value: Math.min(result.steps/10000,1)*40, max: 40, color: "#3b82f6" },
              { label: "Diet (40%)",  value: (result.diet_score/10)*40,          max: 40, color: "#10b981" },
              { label: "Sleep (20%)", value: Math.min(result.sleep/8,1)*20,      max: 20, color: "#a855f7" },
            ].map(({ label, value, max, color }) => (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{label}</span>
                  <span style={{ fontSize: "0.78rem", color: "#f1f5f9", fontWeight: 600 }}>{value.toFixed(1)} / {max}</span>
                </div>
                <div style={{ height: 6, background: "#1e293b", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: 6, width: `${(value/max)*100}%`, background: color, borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Feedback */}
        <div style={{ background: "#0f172a", border: "1.5px solid #1e293b", borderRadius: 16, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>🤖</span>
            <span style={{ fontWeight: 700, color: "#10b981", fontSize: "0.875rem" }}>AI Feedback</span>
            <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "#475569" }}>Groq · llama3-70b</span>
          </div>
          <div style={{ fontSize: "0.85rem", color: "#94a3b8", whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{result.feedback}</div>
        </div>

        {/* Alerts */}
        <div style={{ background: "#0f172a", border: "1.5px solid rgba(234,179,8,0.2)", borderRadius: 16, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>🔔</span>
            <span style={{ fontWeight: 700, color: "#eab308", fontSize: "0.875rem" }}>Tomorrow's Suggestions</span>
          </div>
          <div style={{ fontSize: "0.85rem", color: "#94a3b8", whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{result.alerts}</div>
        </div>

        <button onClick={onNext} style={{ width: "100%", padding: "13px 0", background: "#0f172a", border: "1.5px solid #1e293b", borderRadius: 12, color: "#94a3b8", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}>
          Log Another Day
        </button>
      </div>
    </div>
  );
}

function Section({ icon, title, borderColor, children }) {
  return (
    <div style={{ background: "#0f172a", border: `1.5px solid ${borderColor || "#1e293b"}`, borderRadius: 16, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#f1f5f9" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function ProgressBar({ value, max, color, label }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ height: 6, background: "#1e293b", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: 6, width: `${pct}%`, background: color, borderRadius: 999, transition: "width 0.4s ease" }} />
      </div>
      <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function WaterDots({ litres }) {
  const filled = Math.round(litres * 2);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: i < filled ? "#06b6d4" : "#1e293b", transition: "background 0.2s" }} />
      ))}
    </div>
  );
}

function Spinner() {
  return <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />;
}
