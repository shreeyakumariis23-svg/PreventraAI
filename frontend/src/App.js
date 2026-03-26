import { useState, useEffect } from "react";
import ProfileSetup from "./ProfileSetup";
import RiskResults from "./RiskResults";
import DailyTracker from "./DailyTracker";
import Dashboard from "./Dashboard";
import NavBar from "./NavBar";
import "./index.css";

const STORAGE_KEY = "preventra_data";

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}
function saveState(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function App() {
  const saved = loadState();
  const [screen, setScreen] = useState(saved.profile ? "app" : "setup");
  const [profile, setProfile] = useState(saved.profile || null);
  const [risks, setRisks]     = useState(saved.risks || null);
  const [logs, setLogs]       = useState(saved.logs || []);
  const [tab, setTab]         = useState("dashboard");

  useEffect(() => {
    saveState({ profile, risks, logs });
  }, [profile, risks, logs]);

  const handleProfileSubmit = (data) => {
    setProfile(data);
    setScreen("results");
  };

  const handleRiskDone = (riskData) => {
    setRisks(riskData);
    setScreen("app");
    setTab("dashboard");
  };

  const handleLogSaved = (log) => {
    setLogs((prev) => {
      // Replace today's log if it exists
      const filtered = prev.filter((l) => l.date !== log.date);
      return [...filtered, log];
    });
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProfile(null); setRisks(null); setLogs([]);
    setScreen("setup");
  };

  if (screen === "setup")   return <ProfileSetup onSubmit={handleProfileSubmit} />;
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
        <ProfileView profile={profile} risks={risks} logs={logs} onReset={handleReset}
          onReanalyze={() => setScreen("results")} />
      )}
      <NavBar active={tab} onNavigate={setTab} logs={logs} />
    </div>
  );
}

function ProfileView({ profile, risks, logs, onReset, onReanalyze }) {
  const bmiColor = profile.bmi < 18.5 ? "text-blue-400" : profile.bmi < 25 ? "text-emerald-400" : profile.bmi < 30 ? "text-yellow-400" : "text-red-400";
  const bmiLabel = profile.bmi < 18.5 ? "Underweight" : profile.bmi < 25 ? "Normal" : profile.bmi < 30 ? "Overweight" : "Obese";

  const fields = [
    ["Age", `${profile.age} yrs`],
    ["Gender", profile.gender],
    ["Height", `${profile.height} cm`],
    ["Weight", `${profile.weight} kg`],
    ["Activity", ["Sedentary", "Lightly Active", "Moderately Active", "Very Active"][profile.activity_level]],
    ["Sleep", `${profile.sleep_hours}h/night`],
    ["Water", `${profile.water_litres}L/day`],
    ["Stress", `${profile.stress_level}/10`],
    ["Smoking", profile.smoking ? "Smoker" : "Non-smoker"],
    ["Alcohol", profile.alcohol ? "Occasional" : "None"],
    ["Family History", profile.family_history ? "Yes" : "No"],
    ["Conditions", (profile.conditions || ["None"]).join(", ")],
  ];

  return (
    <div className="min-h-screen bg-slate-950 p-4 max-w-lg mx-auto py-6 space-y-4">
      <h2 className="text-xl font-bold text-white">My Profile</h2>

      {/* Avatar + BMI */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-2xl font-bold text-emerald-400">
            {profile.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-white font-bold text-lg">{profile.name}</p>
            <p className="text-slate-500 text-sm">{profile.age} yrs · {profile.gender}</p>
            <p className="text-slate-500 text-xs mt-0.5">{logs.length} days logged</p>
          </div>
          <div className="ml-auto text-right">
            <p className={`text-2xl font-bold ${bmiColor}`}>{profile.bmi}</p>
            <p className={`text-xs ${bmiColor}`}>{bmiLabel}</p>
            <p className="text-slate-600 text-xs">BMI</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {fields.map(([label, value]) => (
            <div key={label} className="bg-slate-800/50 rounded-xl p-2.5">
              <p className="text-slate-500 text-xs">{label}</p>
              <p className="text-white text-sm font-medium mt-0.5 truncate">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Summary */}
      {risks && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="font-semibold text-white text-sm mb-3">Disease Risk</h3>
          <div className="space-y-3">
            {[
              { label: "Diabetes", risk: risks.diabetes_risk, icon: "🩸" },
              { label: "Hypertension", risk: risks.hypertension_risk, icon: "💓" },
            ].map(({ label, risk, icon }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{icon}</span>
                  <span className="text-slate-300 text-sm">{label}</span>
                </div>
                <span className={`text-sm font-semibold px-3 py-1 rounded-full
                  ${risk === "Low" ? "bg-emerald-500/10 text-emerald-400" : risk === "Medium" ? "bg-yellow-500/10 text-yellow-400" : "bg-red-500/10 text-red-400"}`}>
                  {risk}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={onReanalyze}
        className="w-full py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-medium rounded-xl transition-colors">
        Re-analyze Risk
      </button>
      <button onClick={onReset}
        className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 font-medium rounded-xl transition-colors">
        Reset All Data
      </button>
    </div>
  );
}
