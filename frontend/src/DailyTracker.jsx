import { useState } from "react";
import { getDailyFeedback, getHealthScore, getAlerts } from "./api";
import { parseAlertsInsight, parseFeedbackInsight } from "./insightParsers";

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
      const log = {
        date: todayStr(),
        steps: +form.steps,
        sleep: +form.sleep,
        diet_score: form.diet_score,
        water: form.water,
        mood: form.mood,
        heart_rate: form.heart_rate || null,
        meals: form.meals,
        health_score: scoreRes.data.health_score,
        feedback: feedbackRes.data.feedback,
        feedback_parsed: parseFeedbackInsight(feedbackRes.data.feedback, feedbackRes.data.feedback_parsed),
        alerts: alertsRes.data.alerts,
        alerts_parsed: parseAlertsInsight(alertsRes.data.alerts, alertsRes.data.alerts_parsed),
        warnings: buildUrgencyFlags({
          health_score: scoreRes.data.health_score,
          sleep: +form.sleep,
          water: form.water,
          steps: +form.steps,
          heart_rate: form.heart_rate || null,
          mood: form.mood,
        }, risks),
      };
      setResult(log); onLogSaved(log);
    } catch (error) {
      const message = error?.response?.data?.error || "Could not save today's check-in. Please make sure the backend is running and try again.";
      alert(message);
    } finally { setLoading(false); }
  };

  if (result) return <FeedbackView result={result} streak={streak + 1} risks={risks} onNext={() => setResult(null)} />;

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

function FeedbackView({ result, streak, risks, onNext }) {
  const score = result.health_score;
  const ringColor = score >= 75 ? "#10b981" : score >= 50 ? "#eab308" : "#ef4444";
  const C = 2 * Math.PI * 40;
  const dash = (score / 100) * C;
  const feedback = parseFeedbackInsight(result.feedback, result.feedback_parsed);
  const alerts = parseAlertsInsight(result.alerts, result.alerts_parsed);
  const [activePanel, setActivePanel] = useState("wins");
  const [openSection, setOpenSection] = useState("wins");
  const tomorrowItems = alerts.suggestions.length ? alerts.suggestions : feedback.tomorrow_plan;
  const warnings = result.warnings || buildUrgencyFlags(result, risks);

  return (
    <div style={{ background: "radial-gradient(circle at top, #132238 0%, #020617 45%, #020617 100%)", minHeight: "100vh", padding: "20px 16px 90px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)", backgroundSize: "28px 28px", maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 85%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 70, right: -20, width: 150, height: 150, background: "radial-gradient(circle, rgba(34,197,94,0.2), transparent 70%)", filter: "blur(10px)", pointerEvents: "none" }} />
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

        <InsightHero headline={feedback.headline} score={score} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <MiniStatCard title="What Went Well" value={feedback.wins.length} tint="linear-gradient(135deg, rgba(16,185,129,0.18), rgba(16,185,129,0.06))" color="#34d399" icon="▲" />
          <MiniStatCard title="Focus Areas" value={feedback.focus_areas.length} tint="linear-gradient(135deg, rgba(59,130,246,0.18), rgba(59,130,246,0.06))" color="#60a5fa" icon="◎" />
        </div>

        <SignalRail
          items={[
            { label: score >= 75 ? "Performance strong" : score >= 50 ? "Performance improving" : "Performance at risk", tone: score >= 75 ? "green" : score >= 50 ? "yellow" : "red" },
            { label: `${feedback.watchouts.length || 0} watchpoint${feedback.watchouts.length === 1 ? "" : "s"}`, tone: feedback.watchouts.length ? "yellow" : "green" },
            { label: `${tomorrowItems.length || 0} next moves ready`, tone: "blue" },
          ]}
        />

        {!!warnings.length && <UrgencyPanel warnings={warnings} />}

        {/* AI Feedback */}
        <div style={{ background: "linear-gradient(180deg, rgba(15,23,42,0.94), rgba(8,15,31,0.98))", border: "1.5px solid #1e293b", borderRadius: 20, padding: 18, boxShadow: "0 16px 40px rgba(2,6,23,0.35)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>🤖</span>
            <span style={{ fontWeight: 700, color: "#10b981", fontSize: "0.875rem" }}>AI Feedback</span>
            <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "#475569" }}>Groq · llama3-70b</span>
          </div>
          <InsightTabs active={activePanel} onChange={setActivePanel} />
          <div style={{ marginTop: 14, marginBottom: 16 }}>
            {activePanel === "wins" && <InsightList items={feedback.wins} color="#34d399" emptyText={result.feedback} />}
            {activePanel === "focus" && <InsightList items={feedback.focus_areas} color="#60a5fa" emptyText={result.feedback} />}
            {activePanel === "watch" && <InsightList items={feedback.watchouts} color="#f59e0b" emptyText="No major warnings were highlighted today." />}
            {activePanel === "tomorrow" && <InsightChecklist items={tomorrowItems} />}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <InsightAccordionCard
              title="Wins Snapshot"
              subtitle="Signals worth repeating"
              color="#34d399"
              toneBg="rgba(16,185,129,0.08)"
              open={openSection === "wins"}
              onToggle={() => setOpenSection((current) => current === "wins" ? "" : "wins")}
              items={feedback.wins}
            />
            <InsightAccordionCard
              title="Focus Zone"
              subtitle="Highest-impact adjustments"
              color="#60a5fa"
              toneBg="rgba(59,130,246,0.08)"
              open={openSection === "focus"}
              onToggle={() => setOpenSection((current) => current === "focus" ? "" : "focus")}
              items={feedback.focus_areas}
            />
            <InsightAccordionCard
              title="Watch Layer"
              subtitle="Things to keep an eye on"
              color="#f59e0b"
              toneBg="rgba(245,158,11,0.08)"
              open={openSection === "watch"}
              onToggle={() => setOpenSection((current) => current === "watch" ? "" : "watch")}
              items={feedback.watchouts.length ? feedback.watchouts : ["No major warnings were highlighted today."]}
            />
          </div>
        </div>

        {/* Alerts */}
        <div style={{ background: "linear-gradient(135deg, rgba(120,53,15,0.22), rgba(15,23,42,0.96))", border: "1.5px solid rgba(234,179,8,0.2)", borderRadius: 20, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>🔔</span>
            <span style={{ fontWeight: 700, color: "#eab308", fontSize: "0.875rem" }}>Tomorrow's Suggestions</span>
            <span style={{ marginLeft: "auto" }}><SignalBadge label="Interactive" tone="yellow" /></span>
          </div>
          <div style={{ fontSize: "0.82rem", color: "#fef3c7", lineHeight: 1.55, marginBottom: 12 }}>{alerts.headline}</div>
          <SuggestionCards items={tomorrowItems} />
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

function InsightHero({ headline, score }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(14,165,233,0.1), rgba(250,204,21,0.08))",
      border: "1.5px solid rgba(16,185,129,0.2)",
      borderRadius: 22,
      padding: 20,
      position: "relative",
      overflow: "hidden",
      boxShadow: "0 20px 45px rgba(8,15,31,0.28)",
    }}>
      <div style={{ position: "absolute", top: -40, right: -20, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.12), transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: -20, left: -10, width: 100, height: 100, borderRadius: "50%", background: "radial-gradient(circle, rgba(250,204,21,0.16), transparent 70%)" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <div style={{ fontSize: "0.7rem", color: "#bbf7d0", textTransform: "uppercase", letterSpacing: "0.12em" }}>Today's Insight</div>
        <SignalBadge label={score >= 75 ? "Trending Up" : score >= 50 ? "Stabilizing" : "Recover Mode"} tone={score >= 75 ? "green" : score >= 50 ? "blue" : "red"} />
      </div>
      <TypePulseText text={headline} />
      <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(15,23,42,0.55)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999, padding: "6px 12px" }}>
        <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Momentum score</span>
        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#f8fafc" }}>{score >= 75 ? "Strong" : score >= 50 ? "Improving" : "Needs attention"}</span>
      </div>
    </div>
  );
}

function MiniStatCard({ title, value, tint, color, icon }) {
  return (
    <div style={{ background: tint, border: `1.5px solid ${color}33`, borderRadius: 16, padding: 14, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 10, right: 12, color: `${color}88`, fontSize: "1.2rem", fontWeight: 800 }}>{icon}</div>
      <div style={{ fontSize: "1.35rem", fontWeight: 800, color }}>{String(value).padStart(2, "0")}</div>
      <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 4 }}>{title}</div>
    </div>
  );
}

function InsightTabs({ active, onChange }) {
  const tabs = [
    { id: "wins", label: "Wins" },
    { id: "focus", label: "Focus" },
    { id: "watch", label: "Watch" },
    { id: "tomorrow", label: "Tomorrow" },
  ];

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            border: active === tab.id ? "1px solid rgba(16,185,129,0.35)" : "1px solid #1e293b",
            background: active === tab.id ? "rgba(16,185,129,0.1)" : "#0a0f1e",
            color: active === tab.id ? "#6ee7b7" : "#94a3b8",
            fontSize: "0.76rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function InsightList({ items, color, emptyText }) {
  if (!items?.length) {
    return <div style={{ fontSize: "0.84rem", color: "#94a3b8", lineHeight: 1.65 }}>{emptyText}</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item, index) => (
        <div key={`${item}-${index}`} style={{ display: "flex", gap: 10, padding: "12px 12px", borderRadius: 14, background: "#0a0f1e", border: "1px solid #1e293b" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, marginTop: 6, boxShadow: `0 0 14px ${color}` }} />
          <div style={{ fontSize: "0.84rem", color: "#cbd5e1", lineHeight: 1.6 }}>{item}</div>
        </div>
      ))}
    </div>
  );
}

function InsightChecklist({ items }) {
  const [done, setDone] = useState([]);
  const toggle = (index) => {
    setDone((current) => (current.includes(index) ? current.filter((value) => value !== index) : [...current, index]));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item, index) => {
        const checked = done.includes(index);
        return (
          <button
            key={`${item}-${index}`}
            type="button"
            onClick={() => toggle(index)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              width: "100%",
              padding: "12px 14px",
              borderRadius: 14,
              border: checked ? "1px solid rgba(16,185,129,0.35)" : "1px solid #1e293b",
              background: checked ? "rgba(16,185,129,0.08)" : "#0a0f1e",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: checked ? "1px solid rgba(16,185,129,0.45)" : "1px solid #334155",
              background: checked ? "#10b981" : "transparent",
              color: checked ? "#052e16" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.72rem",
              fontWeight: 800,
              flexShrink: 0,
              marginTop: 1,
            }}>✓</span>
            <span style={{ fontSize: "0.84rem", color: checked ? "#ecfdf5" : "#cbd5e1", lineHeight: 1.55 }}>{item}</span>
          </button>
        );
      })}
    </div>
  );
}

function SuggestionCards({ items }) {
  const [selected, setSelected] = useState(null);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {items.map((item, index) => (
        <button
          key={`${item}-${index}`}
          type="button"
          onClick={() => setSelected((current) => current === index ? null : index)}
          style={{
            background: selected === index || index === 0 ? "linear-gradient(135deg, rgba(234,179,8,0.18), rgba(249,115,22,0.09))" : "#0a0f1e",
            border: selected === index ? "1px solid rgba(251,191,36,0.4)" : "1px solid rgba(234,179,8,0.18)",
            borderRadius: 16,
            padding: 14,
            textAlign: "left",
            cursor: "pointer",
            transition: "transform 0.2s ease, border-color 0.2s ease, background 0.2s ease",
            transform: selected === index ? "translateY(-2px)" : "translateY(0)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
            <div style={{ fontSize: "0.68rem", color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Move {index + 1}
            </div>
            <SignalBadge label={selected === index ? "Expanded" : "Tap"} tone="yellow" />
          </div>
          <div style={{ fontSize: "0.84rem", color: "#fde68a", lineHeight: 1.6 }}>{item}</div>
          {selected === index && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(251,191,36,0.14)", fontSize: "0.74rem", color: "#fef3c7", lineHeight: 1.55 }}>
              Why this matters: this is one of the clearest next-day actions the AI found from your latest health signals.
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function SignalRail({ items }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map((item, index) => (
        <SignalBadge key={`${item.label}-${index}`} label={item.label} tone={item.tone} />
      ))}
    </div>
  );
}

function buildUrgencyFlags(result, risks) {
  const warnings = [];

  if (result.heart_rate && +result.heart_rate >= 120) {
    warnings.push({
      level: "high",
      title: "Elevated heart rate",
      detail: `Your logged heart rate was ${result.heart_rate} bpm. Rest, recheck, and seek medical advice if it stays high or you feel unwell.`,
    });
  }
  if ((result.sleep || 0) < 4) {
    warnings.push({
      level: "medium",
      title: "Very low sleep",
      detail: "Sleep under 4 hours can affect recovery, blood pressure, and glucose control. Prioritize rest tonight.",
    });
  }
  if ((result.health_score || 0) < 35) {
    warnings.push({
      level: "medium",
      title: "Health score dropped sharply",
      detail: "Today’s habits suggest you may need a reset day focused on hydration, sleep, and light movement.",
    });
  }
  if ((result.steps || 0) < 2000 && (result.water || 0) < 1.5) {
    warnings.push({
      level: "medium",
      title: "Low movement and hydration",
      detail: "This combo can worsen fatigue and recovery. Add short walks and increase water steadily.",
    });
  }
  if (risks?.diabetes_risk === "High" || risks?.hypertension_risk === "High") {
    warnings.push({
      level: "info",
      title: "High baseline risk detected",
      detail: "Because one of your risk scores is already high, be more consistent with meals, sleep, and exercise this week.",
    });
  }

  return warnings.slice(0, 3);
}

function UrgencyPanel({ warnings }) {
  const palette = {
    high: { border: "rgba(239,68,68,0.28)", bg: "linear-gradient(135deg, rgba(127,29,29,0.38), rgba(15,23,42,0.96))", color: "#fca5a5", label: "Priority Flag" },
    medium: { border: "rgba(245,158,11,0.28)", bg: "linear-gradient(135deg, rgba(120,53,15,0.28), rgba(15,23,42,0.96))", color: "#fcd34d", label: "Watch Closely" },
    info: { border: "rgba(59,130,246,0.28)", bg: "linear-gradient(135deg, rgba(30,64,175,0.22), rgba(15,23,42,0.96))", color: "#93c5fd", label: "Health Note" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {warnings.map((warning, index) => {
        const tone = palette[warning.level] || palette.info;
        return (
          <div key={`${warning.title}-${index}`} style={{ border: `1.5px solid ${tone.border}`, background: tone.bg, borderRadius: 18, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
              <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#f8fafc" }}>{warning.title}</div>
              <span style={{ fontSize: "0.68rem", color: tone.color, border: `1px solid ${tone.border}`, borderRadius: 999, padding: "4px 9px", fontWeight: 700 }}>
                {tone.label}
              </span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#cbd5e1", lineHeight: 1.55 }}>{warning.detail}</div>
          </div>
        );
      })}
    </div>
  );
}

function SignalBadge({ label, tone }) {
  const palette = {
    green: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.26)", color: "#6ee7b7" },
    blue: { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.26)", color: "#93c5fd" },
    yellow: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.26)", color: "#fcd34d" },
    red: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.26)", color: "#fca5a5" },
  }[tone] || { bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.26)", color: "#cbd5e1" };

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "7px 11px",
      borderRadius: 999,
      background: palette.bg,
      border: `1px solid ${palette.border}`,
      color: palette.color,
      fontSize: "0.72rem",
      fontWeight: 700,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: palette.color, boxShadow: `0 0 14px ${palette.color}` }} />
      {label}
    </span>
  );
}

function TypePulseText({ text }) {
  return (
    <div style={{ fontSize: "1rem", lineHeight: 1.6, color: "#f8fafc", fontWeight: 600, maxWidth: 360 }}>
      {text}
    </div>
  );
}

function InsightAccordionCard({ title, subtitle, color, toneBg, open, onToggle, items }) {
  return (
    <div style={{ borderRadius: 16, border: `1px solid ${color}26`, background: toneBg, overflow: "hidden" }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          padding: "14px 14px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          textAlign: "left",
        }}
      >
        <div>
          <div style={{ fontSize: "0.84rem", color: "#f8fafc", fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 3 }}>{subtitle}</div>
        </div>
        <div style={{ color, fontSize: "0.78rem", fontWeight: 700 }}>{open ? "Hide" : "Open"}</div>
      </button>
      {open && (
        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item, index) => (
            <div key={`${title}-${index}`} style={{ display: "flex", gap: 9, padding: "10px 12px", background: "rgba(2,6,23,0.35)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, marginTop: 7, flexShrink: 0 }} />
              <span style={{ fontSize: "0.82rem", color: "#e2e8f0", lineHeight: 1.55 }}>{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
