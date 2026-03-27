import { useState, useEffect } from "react";
import Login from "./Login";
import Register from "./Register";
import ProfileSetup from "./ProfileSetup";
import RiskResults from "./RiskResults";
import DailyTracker from "./DailyTracker";
import Dashboard from "./Dashboard";
import NavBar from "./NavBar";
import "./index.css";

const STORAGE_PREFIX = "preventra_data";

function storageKeyForUser(email) {
  return `${STORAGE_PREFIX}:${String(email || "").trim().toLowerCase()}`;
}

function loadState(email) {
  if (!email) return {};
  try { return JSON.parse(localStorage.getItem(storageKeyForUser(email))) || {}; } catch { return {}; }
}

function saveState(email, data) {
  if (!email) return;
  localStorage.setItem(storageKeyForUser(email), JSON.stringify(data));
}

export default function App() {
  // ── Auth state ──────────────────────────────────────────────────────────
  const [authUser, setAuthUser] = useState(null);
  const [authScreen, setAuthScreen] = useState("login"); // "login" | "register"

  // ── App state ───────────────────────────────────────────────────────────
  const [screen, setScreen] = useState("setup");
  const [profile, setProfile] = useState(null);
  const [risks, setRisks]     = useState(null);
  const [logs, setLogs]       = useState([]);
  const [tab, setTab]         = useState("dashboard");

  useEffect(() => {
    saveState(authUser?.email, { profile, risks, logs });
  }, [authUser, profile, risks, logs]);

  // ── Auth handlers ────────────────────────────────────────────────────────
  const handleAuthSuccess = (user) => {
    setAuthUser(user);
    const saved = loadState(user.email);
    setProfile(saved.profile || null);
    setRisks(saved.risks || null);
    setLogs(saved.logs || []);
    setScreen(saved.profile ? (saved.risks ? "app" : "results") : "setup");
    setTab("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("preventra_token");
    localStorage.removeItem("preventra_user");
    setAuthUser(null);
    setAuthScreen("login");
    setProfile(null);
    setRisks(null);
    setLogs([]);
    setScreen("setup");
    setTab("dashboard");
  };

  // ── App handlers ─────────────────────────────────────────────────────────
  const handleProfileSubmit = (data) => { setProfile(data); setScreen("results"); };
  const handleRiskDone = (riskData) => { setRisks(riskData); setScreen("app"); setTab("dashboard"); };
  const handleLogSaved = (log) => {
    setLogs((prev) => {
      const filtered = prev.filter((l) => l.date !== log.date);
      return [...filtered, log];
    });
  };
  const handleReset = () => {
    if (authUser?.email) localStorage.removeItem(storageKeyForUser(authUser.email));
    setProfile(null); setRisks(null); setLogs([]);
    setScreen("setup");
  };

  // ── Auth gate ─────────────────────────────────────────────────────────────
  if (!authUser) {
    if (authScreen === "register")
      return <Register onSuccess={handleAuthSuccess} onGoLogin={() => setAuthScreen("login")} />;
    return <Login onSuccess={handleAuthSuccess} onGoRegister={() => setAuthScreen("register")} />;
  }

  // ── Post-auth app screens ─────────────────────────────────────────────────
  if (screen === "setup")   return <ProfileSetup onSubmit={handleProfileSubmit} authUser={authUser} />;
  if (screen === "results") return <RiskResults profile={profile} onNext={handleRiskDone} />;

  return (
    <div className="pb-16 bg-slate-950 min-h-screen">
      {tab === "dashboard" && (
        <Dashboard logs={logs} profile={profile} risks={risks} onTrack={() => setTab("track")} />
      )}
      {tab === "track" && (
        <DailyTracker profile={profile} risks={risks} logs={logs} onLogSaved={handleLogSaved} />
      )}
      {tab === "profile" && (
        <ProfileView
          profile={profile} risks={risks} logs={logs} authUser={authUser}
          onReset={handleReset} onReanalyze={() => setScreen("results")} onLogout={handleLogout}
        />
      )}
      <NavBar active={tab} onNavigate={setTab} logs={logs} onLogout={handleLogout} />
    </div>
  );
}

// ── Redesigned Profile View ──────────────────────────────────────────────────
function ProfileView({ profile, risks, logs, authUser, onReset, onReanalyze, onLogout }) {
  const bmi = profile.bmi;
  const bmiMeta =
    bmi < 18.5 ? { label: "Underweight", color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.25)" } :
    bmi < 25   ? { label: "Normal",       color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)" } :
    bmi < 30   ? { label: "Overweight",   color: "#eab308", bg: "rgba(234,179,8,0.1)",  border: "rgba(234,179,8,0.25)"  } :
                 { label: "Obese",         color: "#ef4444", bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.25)"  };

  const activityLabel = ["Sedentary", "Lightly Active", "Moderately Active", "Very Active"][profile.activity_level];

  const stats = [
    { icon: "📅", label: "Days Logged",   value: logs.length,              color: "#6366f1" },
    { icon: "💤", label: "Sleep",          value: `${profile.sleep_hours}h`, color: "#a855f7" },
    { icon: "💧", label: "Water / day",    value: `${profile.water_litres}L`, color: "#06b6d4" },
    { icon: "😰", label: "Stress Level",   value: `${profile.stress_level}/10`, color: "#f97316" },
  ];

  const infoRows = [
    { label: "Age",            value: `${profile.age} years` },
    { label: "Gender",         value: profile.gender },
    { label: "Height",         value: `${profile.height} cm` },
    { label: "Weight",         value: `${profile.weight} kg` },
    { label: "Activity",       value: activityLabel },
    { label: "Smoking",        value: profile.smoking ? "Smoker" : "Non-smoker" },
    { label: "Alcohol",        value: profile.alcohol ? "Occasional" : "None" },
    { label: "Family History", value: profile.family_history ? "Yes" : "No" },
    { label: "Conditions",     value: (profile.conditions || ["None"]).join(", ") },
  ];

  const riskMeta = (r) =>
    r === "Low"    ? { color: "#10b981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)",  bar: 25 } :
    r === "Medium" ? { color: "#eab308", bg: "rgba(234,179,8,0.1)",   border: "rgba(234,179,8,0.25)",   bar: 60 } :
                     { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)",   bar: 90 };

  return (
    <div style={{ minHeight: "100vh", background: "#020617", paddingBottom: 100 }}>

      {/* ── Header banner ── */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #0a1628 100%)",
        borderBottom: "1px solid #1e293b", padding: "28px 20px 24px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)", borderRadius: "50%" }} />

        {/* Account badge */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ fontSize: "0.7rem", color: "#475569", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 999, padding: "4px 10px" }}>
            ✉️ {authUser?.email}
          </div>
          <button onClick={onLogout} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "5px 12px", color: "#f87171", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
            Sign out
          </button>
        </div>

        {/* Avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 68, height: 68, borderRadius: 20,
            background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))",
            border: "2px solid rgba(16,185,129,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.8rem", fontWeight: 800, color: "#10b981", flexShrink: 0,
            boxShadow: "0 0 20px rgba(16,185,129,0.15)",
          }}>
            {profile.name?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.01em" }}>{profile.name}</div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>{profile.age} yrs · {profile.gender} · {activityLabel}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: bmiMeta.color }}>{bmi}</div>
              <div style={{ background: bmiMeta.bg, border: `1px solid ${bmiMeta.border}`, borderRadius: 999, padding: "2px 10px", fontSize: "0.7rem", fontWeight: 700, color: bmiMeta.color }}>
                {bmiMeta.label}
              </div>
              <div style={{ fontSize: "0.68rem", color: "#475569" }}>BMI</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px" }}>

        {/* ── Stats row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {stats.map(({ icon, label, value, color }) => (
            <div key={label} style={{ background: "#0f172a", border: "1.5px solid #1e293b", borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontSize: "1.3rem", marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: "0.7rem", color: "#475569", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Risk Assessment ── */}
        {risks && (
          <div style={{ background: "#0f172a", border: "1.5px solid #1e293b", borderRadius: 16, padding: "18px", marginBottom: 16 }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
              Risk Assessment
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Diabetes Risk",     risk: risks.diabetes_risk,     icon: "🩸" },
                { label: "Hypertension Risk", risk: risks.hypertension_risk, icon: "💓" },
              ].map(({ label, risk, icon }) => {
                const m = riskMeta(risk);
                return (
                  <div key={label}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "1.1rem" }}>{icon}</span>
                        <span style={{ fontSize: "0.85rem", color: "#cbd5e1", fontWeight: 500 }}>{label}</span>
                      </div>
                      <div style={{ background: m.bg, border: `1px solid ${m.border}`, borderRadius: 999, padding: "3px 12px", fontSize: "0.75rem", fontWeight: 700, color: m.color }}>
                        {risk}
                      </div>
                    </div>
                    <div style={{ height: 5, background: "#1e293b", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${m.bar}%`, background: m.color, borderRadius: 999, transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Health Details ── */}
        <div style={{ background: "#0f172a", border: "1.5px solid #1e293b", borderRadius: 16, padding: "18px", marginBottom: 16 }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
            Health Profile
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {infoRows.map(({ label, value }, i) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0",
                borderBottom: i < infoRows.length - 1 ? "1px solid #0f1f35" : "none",
              }}>
                <span style={{ fontSize: "0.82rem", color: "#64748b" }}>{label}</span>
                <span style={{ fontSize: "0.82rem", color: "#e2e8f0", fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Actions ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={onReanalyze} style={{
            width: "100%", padding: "13px 0", borderRadius: 12, border: "1.5px solid rgba(16,185,129,0.3)",
            background: "rgba(16,185,129,0.06)", color: "#10b981", fontSize: "0.875rem",
            fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
          }}>
            🔄 Re-analyze Risk
          </button>
          <button onClick={onReset} style={{
            width: "100%", padding: "13px 0", borderRadius: 12, border: "1.5px solid #1e293b",
            background: "#0f172a", color: "#64748b", fontSize: "0.875rem",
            fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
          }}>
            🗑️ Reset All Data
          </button>
        </div>
      </div>
    </div>
  );
}
