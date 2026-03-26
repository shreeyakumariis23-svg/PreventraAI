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

export default function NavBar({ active, onNavigate, logs = [] }) {
  const streak      = calcStreak(logs);
  const todayLogged = logs.some(l => l.date === new Date().toLocaleDateString("en-IN"));

  const tabs = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "track",     icon: "📝", label: "Track",   dot: !todayLogged },
    { id: "profile",   icon: "👤", label: "Profile", badge: streak > 0 ? `🔥${streak}` : null },
  ];

  return (
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
            {/* Icon + dot */}
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

            {/* Active underline */}
            {isActive && (
              <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 24, height: 2, background: "#10b981", borderRadius: 999 }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}
