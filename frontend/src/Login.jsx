import { useState } from "react";
import { loginUser } from "./api";

export default function Login({ onSuccess, onGoRegister }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await loginUser(form);
      localStorage.setItem("preventra_token", res.data.token);
      localStorage.setItem("preventra_user", JSON.stringify({ name: res.data.name, email: res.data.email }));
      onSuccess({ name: res.data.name, email: res.data.email });
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.blob1} />
      <div style={styles.blob2} />

      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>🩺</div>
          <div style={styles.logoText}>Preventra<span style={styles.logoAccent}>AI</span></div>
          <div style={styles.logoSub}>Your AI-powered health companion</div>
        </div>

        <div style={styles.headingWrap}>
          <div style={styles.heading}>Welcome back 👋</div>
          <div style={styles.subheading}>Sign in to continue your health journey</div>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <span style={{ marginRight: 6 }}>⚠️</span>{error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <InputField
            icon="✉️" label="Email" type="email" placeholder="you@example.com"
            value={form.email} onChange={(v) => set("email", v)} required
          />
          <InputField
            icon="🔒" label="Password" type={showPass ? "text" : "password"}
            placeholder="Your password" value={form.password}
            onChange={(v) => set("password", v)} required
            suffix={
              <button type="button" onClick={() => setShowPass((s) => !s)} style={styles.eyeBtn}>
                {showPass ? "🙈" : "👁️"}
              </button>
            }
          />

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? <span style={styles.spinner} /> : null}
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        <div style={styles.dividerRow}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <div style={styles.dividerLine} />
        </div>

        <div style={styles.switchRow}>
          Don't have an account?{" "}
          <button onClick={onGoRegister} style={styles.linkBtn}>Create one</button>
        </div>

        {/* Feature pills */}
        <div style={styles.pillsRow}>
          {["🤖 AI Risk Analysis", "📊 Daily Tracking", "💬 Health Chat"].map((f) => (
            <div key={f} style={styles.pill}>{f}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InputField({ icon, label, type, placeholder, value, onChange, required, suffix }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={styles.label}>{label}</label>
      <div style={{ ...styles.inputWrap, ...(focused ? styles.inputWrapFocused : {}) }}>
        <span style={styles.inputIcon}>{icon}</span>
        <input
          type={type} placeholder={placeholder} value={value} required={required}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={styles.input}
        />
        {suffix}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh", background: "#020617",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "20px 16px", position: "relative", overflow: "hidden",
  },
  blob1: {
    position: "absolute", top: -100, left: -80, width: 400, height: 400,
    background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)",
    borderRadius: "50%", pointerEvents: "none",
  },
  blob2: {
    position: "absolute", bottom: -120, right: -60, width: 350, height: 350,
    background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)",
    borderRadius: "50%", pointerEvents: "none",
  },
  card: {
    width: "100%", maxWidth: 420, background: "rgba(15,23,42,0.9)",
    border: "1.5px solid #1e293b", borderRadius: 24, padding: "32px 28px",
    backdropFilter: "blur(20px)", position: "relative", zIndex: 1,
    boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
  },
  logoWrap: { textAlign: "center", marginBottom: 28 },
  logoIcon: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 60, height: 60, background: "rgba(16,185,129,0.1)",
    border: "1.5px solid rgba(16,185,129,0.25)", borderRadius: 18,
    fontSize: 26, marginBottom: 12,
  },
  logoText: { fontSize: "1.6rem", fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em" },
  logoAccent: { color: "#10b981" },
  logoSub: { fontSize: "0.78rem", color: "#475569", marginTop: 4 },
  headingWrap: { marginBottom: 22 },
  heading: { fontSize: "1.25rem", fontWeight: 700, color: "#f1f5f9" },
  subheading: { fontSize: "0.8rem", color: "#64748b", marginTop: 3 },
  errorBox: {
    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
    borderRadius: 10, padding: "10px 14px", fontSize: "0.82rem", color: "#f87171",
    marginBottom: 4,
  },
  label: { display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: 6, fontWeight: 500 },
  inputWrap: {
    display: "flex", alignItems: "center", gap: 10,
    background: "#0a0f1e", border: "1.5px solid #1e293b",
    borderRadius: 12, padding: "0 14px", transition: "border-color 0.2s, box-shadow 0.2s",
  },
  inputWrapFocused: { borderColor: "#10b981", boxShadow: "0 0 0 3px rgba(16,185,129,0.1)" },
  inputIcon: { fontSize: "1rem", flexShrink: 0 },
  input: {
    flex: 1, background: "transparent", border: "none", outline: "none",
    color: "#f1f5f9", fontSize: "0.875rem", padding: "12px 0",
  },
  eyeBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "1rem", padding: 0 },
  submitBtn: {
    width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "white", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    boxShadow: "0 4px 20px rgba(16,185,129,0.3)", transition: "opacity 0.2s",
    marginTop: 4,
  },
  spinner: {
    width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "white", borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
  dividerRow: { display: "flex", alignItems: "center", gap: 10, margin: "20px 0" },
  dividerLine: { flex: 1, height: 1, background: "#1e293b" },
  dividerText: { fontSize: "0.75rem", color: "#475569" },
  switchRow: { textAlign: "center", fontSize: "0.82rem", color: "#64748b", marginBottom: 20 },
  linkBtn: {
    background: "none", border: "none", color: "#10b981", fontWeight: 600,
    cursor: "pointer", fontSize: "0.82rem", padding: 0, marginLeft: 4,
  },
  pillsRow: { display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 4 },
  pill: {
    fontSize: "0.7rem", color: "#475569", background: "#0f172a",
    border: "1px solid #1e293b", borderRadius: 999, padding: "4px 10px",
  },
};
