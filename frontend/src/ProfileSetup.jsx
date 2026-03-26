import { useState } from "react";

const STEP_LABELS = ["Basic Info", "Lifestyle", "Medical"];
const CONDITIONS = ["None", "Pre-diabetes", "High Cholesterol", "Thyroid", "PCOD/PCOS", "Heart Disease"];
const ACTIVITY_OPTIONS = [
  { label: "Sedentary",         sub: "Desk job, no exercise",    value: 0 },
  { label: "Lightly Active",    sub: "Walk occasionally",        value: 1 },
  { label: "Moderately Active", sub: "Exercise 3–4x/week",       value: 2 },
  { label: "Very Active",       sub: "Daily intense workout",    value: 3 },
];

export default function ProfileSetup({ onSubmit }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "", age: "", gender: "Male", height: "", weight: "",
    family_history: 0, diet_score: 5, activity_level: 0,
    sleep_hours: 7, water_litres: 2, stress_level: 3,
    smoking: 0, alcohol: 0, conditions: ["None"],
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const bmi = form.height && form.weight
    ? +(form.weight / ((form.height / 100) ** 2)).toFixed(1) : null;
  const bmiLabel = !bmi ? "" : bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese";
  const bmiColor = !bmi ? "" : bmi < 18.5 ? "blue" : bmi < 25 ? "green" : bmi < 30 ? "yellow" : "red";

  const toggleCondition = (c) => {
    if (c === "None") { set("conditions", ["None"]); return; }
    const cur = form.conditions.filter(x => x !== "None");
    set("conditions", cur.includes(c) ? (cur.filter(x => x !== c).length ? cur.filter(x => x !== c) : ["None"]) : [...cur, c]);
  };

  const next = (e) => { e.preventDefault(); setStep(s => s + 1); };
  const back = () => setStep(s => s - 1);
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, bmi, age: +form.age, height: +form.height, weight: +form.weight });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#020617", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px" }}>
      <div style={{ width: "100%", maxWidth: "460px" }}>

        {/* Logo */}
        <div className="text-center mb-4" style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, background: "rgba(16,185,129,0.1)", border: "1.5px solid rgba(16,185,129,0.2)", borderRadius: 18, marginBottom: 12 }}>
            <span style={{ fontSize: 28 }}>🩺</span>
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#f1f5f9" }}>Preventra AI</div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 4 }}>AI-powered preventive healthcare</div>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          {STEP_LABELS.map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", flex: 1 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
                background: i < step ? "#10b981" : i === step ? "rgba(16,185,129,0.15)" : "#0f172a",
                border: i === step ? "1.5px solid #10b981" : i < step ? "none" : "1.5px solid #1e293b",
                color: i < step ? "white" : i === step ? "#10b981" : "#475569",
              }}>
                {i < step ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: "0.72rem", marginLeft: 6, color: i === step ? "#10b981" : "#475569", whiteSpace: "nowrap" }}>{s}</span>
              {i < STEP_LABELS.length - 1 && (
                <div style={{ flex: 1, height: 1, background: i < step ? "#10b981" : "#1e293b", margin: "0 8px" }} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: "#0f172a", border: "1.5px solid #1e293b", borderRadius: 20, padding: "24px 20px" }}>

          {/* ── Step 0: Basic Info ── */}
          {step === 0 && (
            <form onSubmit={next}>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#f1f5f9", marginBottom: 20 }}>Basic Information</div>

              <Field label="Full Name" type="text" value={form.name} onChange={v => set("name", v)} placeholder="Your full name" required />

              <div style={{ marginBottom: 16 }}>
                <label className="label">Gender</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Male", "Female", "Other"].map(g => (
                    <button key={g} type="button" onClick={() => set("gender", g)} style={{
                      flex: 1, padding: "9px 0", borderRadius: 10, fontSize: "0.85rem", fontWeight: 600,
                      border: "1.5px solid", cursor: "pointer", transition: "all 0.2s",
                      background: form.gender === g ? "#10b981" : "#0f172a",
                      borderColor: form.gender === g ? "#10b981" : "#1e293b",
                      color: form.gender === g ? "white" : "#64748b",
                    }}>{g}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                <Field label="Age" type="number" value={form.age} onChange={v => set("age", v)} placeholder="yrs" min={10} max={100} required />
                <Field label="Height (cm)" type="number" value={form.height} onChange={v => set("height", v)} placeholder="cm" min={100} max={250} required />
                <Field label="Weight (kg)" type="number" value={form.weight} onChange={v => set("weight", v)} placeholder="kg" min={20} max={300} required />
              </div>

              {bmi && (
                <div style={{ background: "#0a0f1e", border: "1.5px solid #1e293b", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Your BMI</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 800, color: bmiColor === "green" ? "#10b981" : bmiColor === "yellow" ? "#eab308" : bmiColor === "red" ? "#ef4444" : "#3b82f6" }}>{bmi}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, padding: "4px 12px", borderRadius: 999, background: "#1e293b", color: bmiColor === "green" ? "#10b981" : bmiColor === "yellow" ? "#eab308" : bmiColor === "red" ? "#ef4444" : "#3b82f6" }}>{bmiLabel}</div>
                    <div style={{ fontSize: "0.7rem", color: "#475569", marginTop: 4 }}>Healthy: 18.5–24.9</div>
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary">Continue →</button>
            </form>
          )}

          {/* ── Step 1: Lifestyle ── */}
          {step === 1 && (
            <form onSubmit={next}>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#f1f5f9", marginBottom: 20 }}>Lifestyle Habits</div>

              <div style={{ marginBottom: 16 }}>
                <label className="label">Activity Level</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {ACTIVITY_OPTIONS.map(({ label, sub, value }) => (
                    <button key={value} type="button" onClick={() => set("activity_level", value)} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 14px", borderRadius: 12, cursor: "pointer", transition: "all 0.2s",
                      background: form.activity_level === value ? "rgba(16,185,129,0.08)" : "#0a0f1e",
                      border: `1.5px solid ${form.activity_level === value ? "rgba(16,185,129,0.4)" : "#1e293b"}`,
                      textAlign: "left",
                    }}>
                      <div>
                        <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#f1f5f9" }}>{label}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>{sub}</div>
                      </div>
                      {form.activity_level === value && <span style={{ color: "#10b981", fontSize: "1.1rem" }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <Slider label="Diet Quality" value={form.diet_score} min={1} max={10} onChange={v => set("diet_score", v)}
                hint={form.diet_score <= 3 ? "Poor — mostly junk" : form.diet_score <= 6 ? "Average — mixed diet" : "Good — balanced"} color="#10b981" />
              <Slider label="Average Sleep" value={form.sleep_hours} min={3} max={12} onChange={v => set("sleep_hours", v)}
                hint={`${form.sleep_hours} hrs/night`} color="#a855f7" />
              <Slider label="Daily Water Intake" value={form.water_litres} min={0.5} max={5} step={0.5} onChange={v => set("water_litres", v)}
                hint={`${form.water_litres}L/day`} color="#06b6d4" />
              <Slider label="Stress Level" value={form.stress_level} min={1} max={10} onChange={v => set("stress_level", v)}
                hint={form.stress_level <= 3 ? "Low" : form.stress_level <= 6 ? "Moderate" : "High"} color="#f97316" />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                <Toggle label="Smoking" value={form.smoking} onChange={v => set("smoking", v)} options={["Non-smoker", "Smoker"]} />
                <Toggle label="Alcohol" value={form.alcohol} onChange={v => set("alcohol", v)} options={["None", "Occasional"]} />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={back} className="btn btn-secondary">← Back</button>
                <button type="submit" className="btn btn-primary">Continue →</button>
              </div>
            </form>
          )}

          {/* ── Step 2: Medical ── */}
          {step === 2 && (
            <form onSubmit={handleSubmit}>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#f1f5f9", marginBottom: 20 }}>Medical History</div>

              <div style={{ marginBottom: 16 }}>
                <label className="label">Family History of Diabetes / Hypertension</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["No", "Yes"].map((opt, i) => (
                    <button key={opt} type="button" onClick={() => set("family_history", i)} style={{
                      flex: 1, padding: "11px 0", borderRadius: 12, fontSize: "0.875rem", fontWeight: 600,
                      border: "1.5px solid", cursor: "pointer", transition: "all 0.2s",
                      background: form.family_history === i ? "#10b981" : "#0a0f1e",
                      borderColor: form.family_history === i ? "#10b981" : "#1e293b",
                      color: form.family_history === i ? "white" : "#64748b",
                    }}>{opt}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="label">Existing Conditions <span style={{ color: "#475569" }}>(select all that apply)</span></label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {CONDITIONS.map(c => (
                    <button key={c} type="button" onClick={() => toggleCondition(c)} style={{
                      padding: "9px 12px", borderRadius: 10, fontSize: "0.8rem", fontWeight: 500,
                      textAlign: "left", cursor: "pointer", transition: "all 0.2s",
                      background: form.conditions.includes(c) ? "rgba(16,185,129,0.08)" : "#0a0f1e",
                      border: `1.5px solid ${form.conditions.includes(c) ? "rgba(16,185,129,0.4)" : "#1e293b"}`,
                      color: form.conditions.includes(c) ? "#10b981" : "#94a3b8",
                    }}>{c}</button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div style={{ background: "#0a0f1e", border: "1.5px solid #1e293b", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Summary</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {[["Name", form.name], ["Age", `${form.age} yrs`], ["BMI", `${bmi} (${bmiLabel})`], ["Activity", ACTIVITY_OPTIONS[form.activity_level].label], ["Sleep", `${form.sleep_hours}h`], ["Water", `${form.water_litres}L`]].map(([k, v]) => (
                    <div key={k} style={{ fontSize: "0.78rem" }}>
                      <span style={{ color: "#475569" }}>{k}: </span>
                      <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={back} className="btn btn-secondary">← Back</button>
                <button type="submit" className="btn btn-primary">Analyze My Health →</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, onChange, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="label">{label}</label>
      <input {...props} onChange={e => onChange(e.target.value)} className="input" />
    </div>
  );
}

function Slider({ label, value, min, max, step = 1, onChange, hint, color }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{label}</span>
        <span style={{ fontSize: "0.8rem", color: "#f1f5f9" }}>{hint}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ width: "100%", accentColor: color }} />
    </div>
  );
}

function Toggle({ label, value, onChange, options }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div style={{ display: "flex", gap: 6 }}>
        {options.map((opt, i) => (
          <button key={opt} type="button" onClick={() => onChange(i)} style={{
            flex: 1, padding: "8px 0", borderRadius: 8, fontSize: "0.75rem", fontWeight: 600,
            border: "1.5px solid", cursor: "pointer", transition: "all 0.2s",
            background: value === i ? "#10b981" : "#0a0f1e",
            borderColor: value === i ? "#10b981" : "#1e293b",
            color: value === i ? "white" : "#64748b",
          }}>{opt}</button>
        ))}
      </div>
    </div>
  );
}
