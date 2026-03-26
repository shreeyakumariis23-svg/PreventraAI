import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  AreaChart, Area,
} from "recharts";

const MOODS = { 5: "😄", 4: "🙂", 3: "😐", 2: "😔", 1: "😩" };

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

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening";
}

const RISK_COLOR = { Low: "#10b981", Medium: "#eab308", High: "#ef4444" };
const RISK_BG    = { Low: "rgba(16,185,129,0.08)",  Medium: "rgba(234,179,8,0.08)",  High: "rgba(239,68,68,0.08)" };
const RISK_BORDER= { Low: "rgba(16,185,129,0.25)",  Medium: "rgba(234,179,8,0.25)",  High: "rgba(239,68,68,0.25)" };

export default function Dashboard({ logs, profile, risks, onTrack }) {
  const recent = logs.slice(-7);
  const avg    = key => recent.length ? +(recent.reduce((s,l) => s + (l[key]||0), 0) / recent.length).toFixed(1) : 0;
  const latest = logs[logs.length - 1];
  const streak = calcStreak(logs);

  const radarData = [
    { subject: "Steps", A: Math.min((avg("steps")/10000)*100, 100) },
    { subject: "Diet",  A: avg("diet_score")*10 },
    { subject: "Sleep", A: Math.min((avg("sleep")/8)*100, 100) },
    { subject: "Water", A: Math.min((avg("water")/3)*100, 100) },
    { subject: "Mood",  A: avg("mood")*20 },
  ];

  return (
    <div style={{ background: "#020617", minHeight: "100vh", padding: "20px 16px 90px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#f1f5f9" }}>Good {greeting()}, {profile.name.split(" ")[0]} 👋</div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</div>
          </div>
          <button onClick={onTrack} style={{ padding: "9px 16px", background: "#10b981", border: "none", borderRadius: 10, color: "white", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}>
            + Log Today
          </button>
        </div>

        {/* Streak + Score */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
          <div style={{ background: "rgba(249,115,22,0.08)", border: "1.5px solid rgba(249,115,22,0.2)", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
            <span style={{ fontSize: 26 }}>🔥</span>
            <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "#f97316" }}>{streak}</span>
            <span style={{ fontSize: "0.7rem", color: "#64748b" }}>day streak</span>
          </div>
          <div style={{ background: "#0f172a", border: "1.5px solid #1e293b", borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: 4 }}>Latest Health Score</div>
            {latest ? (
              <>
                <div style={{ fontSize: "2.2rem", fontWeight: 800, color: latest.health_score >= 75 ? "#10b981" : latest.health_score >= 50 ? "#eab308" : "#ef4444", lineHeight: 1 }}>
                  {latest.health_score}<span style={{ fontSize: "1rem", color: "#475569", fontWeight: 400 }}>/100</span>
                </div>
                <div style={{ fontSize: "0.7rem", color: "#475569", marginTop: 4 }}>{latest.date}</div>
              </>
            ) : <div style={{ fontSize: "0.875rem", color: "#475569", marginTop: 4 }}>No logs yet</div>}
          </div>
        </div>

        {/* Risk Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { label: "Diabetes Risk",     risk: risks?.diabetes_risk,     icon: "🩸" },
            { label: "Hypertension Risk", risk: risks?.hypertension_risk, icon: "💓" },
          ].map(({ label, risk, icon }) => (
            <div key={label} style={{ background: RISK_BG[risk], border: `1.5px solid ${RISK_BORDER[risk]}`, borderRadius: 14, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{label}</span>
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: RISK_COLOR[risk] }}>{risk}</div>
            </div>
          ))}
        </div>

        {logs.length === 0 ? (
          <EmptyState onTrack={onTrack} />
        ) : (
          <>
            {/* Weekly Averages */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
              {[
                { icon: "👟", label: "Avg Steps", value: avg("steps").toLocaleString() },
                { icon: "🥗", label: "Avg Diet",  value: `${avg("diet_score")}/10` },
                { icon: "😴", label: "Avg Sleep", value: `${avg("sleep")}h` },
                { icon: "💧", label: "Avg Water", value: `${avg("water")}L` },
              ].map(({ icon, label, value }) => (
                <div key={label} style={{ background: "#0f172a", border: "1.5px solid #1e293b", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 18 }}>{icon}</div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f1f5f9", marginTop: 4 }}>{value}</div>
                  <div style={{ fontSize: "0.65rem", color: "#64748b", marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Health Score Trend */}
            <ChartCard title="Health Score Trend" sub="Last 7 days">
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={recent}>
                  <defs>
                    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} />
                  <YAxis domain={[0,100]} tick={{ fill: "#475569", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} labelStyle={{ color: "#64748b" }} itemStyle={{ color: "#10b981" }} />
                  <Area type="monotone" dataKey="health_score" stroke="#10b981" strokeWidth={2} fill="url(#sg)" dot={{ fill: "#10b981", r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Steps + Sleep */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <ChartCard title="Daily Steps">
                <ResponsiveContainer width="100%" height={110}>
                  <BarChart data={recent} barSize={10}>
                    <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 9 }} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} labelStyle={{ color: "#64748b" }} itemStyle={{ color: "#3b82f6" }} />
                    <Bar dataKey="steps" fill="#3b82f6" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Sleep Hours">
                <ResponsiveContainer width="100%" height={110}>
                  <BarChart data={recent} barSize={10}>
                    <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 9 }} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} labelStyle={{ color: "#64748b" }} itemStyle={{ color: "#a855f7" }} />
                    <Bar dataKey="sleep" fill="#a855f7" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Wellness Radar */}
            <ChartCard title="Wellness Overview" sub="Avg across all metrics">
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 11 }} />
                  <Radar dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.12} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Mood Timeline */}
            {recent.some(l => l.mood) && (
              <ChartCard title="Mood Timeline">
                <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
                  {recent.map((l, i) => (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 22 }}>{MOODS[l.mood] || "🙂"}</span>
                      <span style={{ fontSize: "0.65rem", color: "#475569" }}>{l.date?.split("/")[0]}</span>
                    </div>
                  ))}
                </div>
              </ChartCard>
            )}

            {/* Latest AI Feedback */}
            {latest?.feedback && (
              <div style={{ background: "#0f172a", border: "1.5px solid #1e293b", borderRadius: 16, padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 16 }}>🤖</span>
                  <span style={{ fontWeight: 700, color: "#10b981", fontSize: "0.875rem" }}>Latest AI Feedback</span>
                  <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "#475569" }}>{latest.date}</span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "#94a3b8", whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{latest.feedback}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, sub, children }) {
  return (
    <div style={{ background: "#0f172a", border: "1.5px solid #1e293b", borderRadius: 16, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#f1f5f9" }}>{title}</span>
        {sub && <span style={{ fontSize: "0.7rem", color: "#475569" }}>{sub}</span>}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ onTrack }) {
  return (
    <div style={{ background: "#0f172a", border: "1.5px solid #1e293b", borderRadius: 16, padding: "40px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 40 }}>📊</span>
      <div style={{ fontWeight: 700, color: "#f1f5f9" }}>No data yet</div>
      <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Start logging your daily habits to see trends and AI insights.</div>
      <button onClick={onTrack} style={{ marginTop: 8, padding: "10px 24px", background: "#10b981", border: "none", borderRadius: 10, color: "white", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer" }}>
        Log Your First Day
      </button>
    </div>
  );
}
