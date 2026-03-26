import { useState } from "react";

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

export default function NavBar({ active, onNavigate, logs = [], onLogout }) {
  const streak      = calcStreak(logs);
  const todayLogged = logs.some(l => l.date === new Date().toLocaleDateString("en-IN"));
  const [showConfirm, setShowConfirm] = useState(false);

  const tabs = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "track",     icon: "📝", label: "Track",   dot: !todayLogged },
    { id: "profile",   icon: "👤", label: "Profile", badge: streak > 0 ? `🔥${streak}` : null },
  ];

  return (
    <>
      {/* ── Logout confirm modal ── */}
      {showConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(2,6,23,0.85)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          padding: "0 16px 24px",
        }}>
          <div style={{
            width: "100%", maxWidth: 420,
            background: "#0f172a", border: "1.5px solid #1e293b",
            borderRadius: 20, padding: "24px 20px",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
          }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: "rgba(239,68,68,0.1)", border: "1.5px solid rgba(239,68,68,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.5rem", margin: "0 auto 12px",
              }}>🚪</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>Sign out?</div>
              <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Your health data stays saved locally. You can sign back in anytime.</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12,
                  background: "#1e293b", border: "1.5px solid #334155",
                  color: "#94a3b8", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
                }}
              >Cancel</button>
              <button
                onClick={() => { setShowConfirm(false); onLogout(); }}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12,
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  border: "none", color: "white",
                  fontSize: "0.875rem", fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(239,68,68,0.3)",
                }}
              >Sign Out</button>
            </div>
          </div>
        </div>
      )}

      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(2,6,23,0.97)", backdropFilter: "blur(12px)",
        borderTop: "1px solid #1e293b",
        display: "flex", flexDirection: "row",
        zIndex: 100,
      }}>
        {tabs.map(({ id, icon, label, dot, badge }) => {
          const isActive = active === id;
          return (
            <button key={id} onClick={() => onNavigate(id)} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 3, padding: "10px 0 13px",
              background: "none", border: "none", cursor: "pointer",
              color: isActive ? "#10b981" : "#475569",
              fontSize: "0.65rem", fontWeight: 500,
              position: "relative", transition: "color 0.2s",
            }}>
              <div style={{ position: "relative" }}>
                <span style={{ fontSize: "1.3rem", lineHeight: 1 }}>{icon}</span>
                {dot && (
                  <div style={{ position: "absolute", top: -2, right: -4, width: 8, height: 8, background: "#ef4444", borderRadius: "50%", border: "2px solid #020617" }} />
                )}
              </div>
              <span>{label}</span>
              {badge && (
                <span style={{ fontSize: "0.6rem", color: "#f97316", fontWeight: 700 }}>{badge}</span>
              )}
              {isActive && (
                <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 24, height: 2, background: "#10b981", borderRadius: 999 }} />
              )}
            </button>
          );
        })}

        {/* Logout button */}
        <button
          onClick={() => setShowConfirm(true)}
          style={{
            width: 48, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 3, padding: "10px 0 13px",
            background: "none", border: "none", borderLeft: "1px solid #1e293b",
            cursor: "pointer", color: "#475569", fontSize: "0.65rem",
            fontWeight: 500, transition: "color 0.2s", flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "1.3rem", lineHeight: 1 }}>🚪</span>
          <span>Logout</span>
        </button>
      </nav>
    </>
  );
}
