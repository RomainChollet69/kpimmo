import { useState, useEffect, useRef } from "react";

const KPIS = [
  { id: "hours", label: "Heures prospectées", icon: "⏱", unit: "h", step: 0.5 },
  { id: "contacts", label: "Contacts joints", icon: "📞", unit: "", step: 1 },
  { id: "prospects", label: "Prospects qualifiés", icon: "🎯", unit: "", step: 1 },
  { id: "rdvSet", label: "RDV pris", icon: "📅", unit: "", step: 1 },
  { id: "rdvMet", label: "RDV honorés", icon: "🤝", unit: "", step: 1 },
  { id: "mandats", label: "Mandats signés", icon: "📝", unit: "", step: 1 },
  { id: "sales", label: "Ventes conclues", icon: "🏠", unit: "", step: 1 },
  { id: "commission", label: "Honoraires perçus", icon: "💰", unit: "€", step: 500 },
];

const LEVELS = {
  debutant: { label: "Débutant", emoji: "🌱", contactsPerHour: 3, contactToProspect: 15, prospectToRdv: 30, rdvSetToMet: 70, rdvToMandat: 20, mandatToSale: 50 },
  intermediaire: { label: "Intermédiaire", emoji: "⚡", contactsPerHour: 4, contactToProspect: 25, prospectToRdv: 45, rdvSetToMet: 80, rdvToMandat: 35, mandatToSale: 65 },
  expert: { label: "Expert", emoji: "🏆", contactsPerHour: 5, contactToProspect: 35, prospectToRdv: 60, rdvSetToMet: 90, rdvToMandat: 50, mandatToSale: 80 },
};

const RATE_LABELS = [
  { id: "contactsPerHour", label: "Contacts joints / heure", unit: "" },
  { id: "contactToProspect", label: "Contact → Prospect", unit: "%" },
  { id: "prospectToRdv", label: "Prospect → RDV pris", unit: "%" },
  { id: "rdvSetToMet", label: "RDV pris → RDV honoré", unit: "%" },
  { id: "rdvToMandat", label: "RDV → Mandat signé", unit: "%" },
  { id: "mandatToSale", label: "Mandat → Vente", unit: "%" },
];

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS_FR = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
const KPI_COLORS = ["#6366f1","#8b5cf6","#a78bfa","#c4b5fd","#7c3aed","#5b21b6","#4c1d95","#fbbf24"];

function formatDate(d) { return DAYS_FR[d.getDay()] + " " + d.getDate() + " " + MONTHS_FR[d.getMonth()]; }
function storageKey(d) { return "af_" + d.toISOString().split("T")[0]; }

function calcGoals(ca, fee, rates) {
  const sY = fee > 0 ? Math.ceil(ca / fee) : 0;
  const sM = Math.ceil(sY / 12);
  const mandats = rates.mandatToSale > 0 ? Math.ceil(sM / (rates.mandatToSale / 100)) : 0;
  const rdvMet = rates.rdvToMandat > 0 ? Math.ceil(mandats / (rates.rdvToMandat / 100)) : 0;
  const rdvSet = rates.rdvSetToMet > 0 ? Math.ceil(rdvMet / (rates.rdvSetToMet / 100)) : 0;
  const prospects = rates.prospectToRdv > 0 ? Math.ceil(rdvSet / (rates.prospectToRdv / 100)) : 0;
  const contacts = rates.contactToProspect > 0 ? Math.ceil(prospects / (rates.contactToProspect / 100)) : 0;
  const hours = rates.contactsPerHour > 0 ? Math.ceil(contacts / rates.contactsPerHour) : 0;
  return { hours, contacts, prospects, rdvSet, rdvMet, mandats, sales: sM, commission: Math.round(ca / 12) };
}

const FONTS = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&family=Outfit:wght@300;400;500;600;700;800;900&display=swap";
const CSS = `
@keyframes fadeIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body, #root { margin: 0; padding: 0; background: #0a0a0f; width: 100%; min-height: 100vh; display: flex; flex-direction: column; align-items: center; }
::-webkit-scrollbar { display: none; }
input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
input[type=number] { -moz-appearance: textfield; }
`;

function AnimNum({ value, suffix }) {
  const [d, setD] = useState(value);
  const p = useRef(value);
  useEffect(() => {
    if (p.current === value) return;
    const s = p.current, diff = value - s, t0 = performance.now();
    const tick = n => { const r = Math.min((n - t0) / 400, 1); setD(s + diff * (1 - Math.pow(1 - r, 3))); if (r < 1) requestAnimationFrame(tick); else p.current = value; };
    requestAnimationFrame(tick);
  }, [value]);
  if (suffix === "€") return <span>{Math.round(d).toLocaleString("fr-FR")} €</span>;
  if (suffix === "h") return <span>{d.toFixed(1)}h</span>;
  return <span>{Math.round(d)}</span>;
}

function Ring({ progress, size = 36, stroke = 3, color = "#6366f1" }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(progress, 1))} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(.4,0,.2,1)" }} />
    </svg>
  );
}

function Stepper({ kpi, value, onChange }) {
  const [pr, setPr] = useState(null);
  const ref = useRef(null), vRef = useRef(value);
  useEffect(() => { vRef.current = value; }, [value]);
  const start = dir => {
    setPr(dir); onChange(Math.max(0, value + dir * kpi.step));
    ref.current = setTimeout(() => { ref.current = setInterval(() => onChange(Math.max(0, vRef.current + dir * kpi.step)), 120); }, 400);
  };
  const end = () => { setPr(null); clearTimeout(ref.current); clearInterval(ref.current); };
  const fmt = kpi.unit === "€" ? value.toLocaleString("fr-FR") : kpi.unit === "h" ? value.toFixed(1) : value;
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
        <span style={{ fontSize: 22 }}>{kpi.icon}</span>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{kpi.label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onPointerDown={() => start(-1)} onPointerUp={end} onPointerLeave={end}
          style={{ width: 40, height: 40, borderRadius: 12, background: pr === -1 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
        <div style={{ minWidth: 56, textAlign: "center", fontSize: 20, fontWeight: 700, color: "#fff", fontFamily: "'DM Mono', monospace" }}>{fmt}</div>
        <button onPointerDown={() => start(1)} onPointerUp={end} onPointerLeave={end}
          style={{ width: 40, height: 40, borderRadius: 12, background: pr === 1 ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", color: "#a78bfa", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
      </div>
    </div>
  );
}

function Streak({ n }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, background: n > 0 ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.04)", border: "1px solid " + (n > 0 ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.06)"), borderRadius: 10, padding: "6px 10px" }}>
      <span style={{ fontSize: 16 }}>🔥</span>
      <span style={{ fontSize: 15, fontWeight: 800, color: n > 0 ? "#fbbf24" : "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace" }}>{n}</span>
    </div>
  );
}

function Btn({ children, on, disabled, style, ...p }) {
  return <button disabled={disabled} style={{ padding: 16, borderRadius: 14, border: "none", fontSize: 16, fontWeight: 700, cursor: disabled ? "default" : "pointer", fontFamily: "'Outfit', sans-serif", background: on ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "rgba(255,255,255,0.04)", color: on ? "#fff" : "rgba(255,255,255,0.2)", boxShadow: on ? "0 8px 30px rgba(99,102,241,0.3)" : "none", ...style }} {...p}>{children}</button>;
}

// ─── ONBOARDING ───
function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [ca, setCa] = useState("");
  const [fee, setFee] = useState("");
  const [level, setLevel] = useState(null);
  const [done, setDone] = useState(false);

  const rates = level ? { ...LEVELS[level] } : null;
  const goals = rates && ca && fee ? calcGoals(+ca, +fee, rates) : null;
  const iStyle = { width: "100%", padding: "16px 20px", borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 24, fontWeight: 700, fontFamily: "'DM Mono', monospace", textAlign: "center", outline: "none" };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#fff", fontFamily: "'DM Sans', sans-serif", padding: "0 20px", display: "flex", flexDirection: "column", width: "100%", maxWidth: 430, margin: "0 auto" }}>
      <link href={FONTS} rel="stylesheet" />
      <div style={{ padding: "40px 0 20px", textAlign: "center", width: "100%" }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, margin: "0 auto 16px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, fontFamily: "'Outfit'", color: "#fff", letterSpacing: -1 }}>K</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, fontFamily: "'Outfit'", background: "linear-gradient(135deg, #e0e7ff, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>KPImmo</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 4 }}>Configurons vos objectifs</p>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, margin: "20px 0 32px" }}>
        {[0,1,2].map(i => <div key={i} style={{ width: step >= i ? 24 : 8, height: 8, borderRadius: 4, background: step >= i ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "rgba(255,255,255,0.1)", transition: "all 0.4s" }} />)}
      </div>

      {!done ? (
        <div style={{ flex: 1 }}>
          {step === 0 && (
            <div style={{ animation: "fadeIn 0.4s both" }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px", fontFamily: "'Outfit'" }}>Quel est votre objectif de CA annuel ?</h2>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "0 0 24px" }}>Le chiffre d'affaires que vous visez cette année</p>
              <div style={{ position: "relative" }}>
                <input type="number" value={ca} onChange={e => setCa(e.target.value)} placeholder="60000" style={iStyle} />
                <span style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", fontSize: 16 }}>€/an</span>
              </div>
              <Btn on={!!ca} disabled={!ca} onClick={() => setStep(1)} style={{ width: "100%", marginTop: 24 }}>Continuer</Btn>
            </div>
          )}
          {step === 1 && (
            <div style={{ animation: "fadeIn 0.4s both" }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px", fontFamily: "'Outfit'" }}>Honoraire moyen par vente ?</h2>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "0 0 24px" }}>Votre commission moyenne sur une transaction</p>
              <div style={{ position: "relative" }}>
                <input type="number" value={fee} onChange={e => setFee(e.target.value)} placeholder="5000" style={iStyle} />
                <span style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", fontSize: 16 }}>€</span>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                <button onClick={() => setStep(0)} style={{ flex: 1, padding: 16, borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Retour</button>
                <Btn on={!!fee} disabled={!fee} onClick={() => setStep(2)} style={{ flex: 2 }}>Continuer</Btn>
              </div>
            </div>
          )}
          {step === 2 && (
            <div style={{ animation: "fadeIn 0.4s both" }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px", fontFamily: "'Outfit'" }}>Votre niveau d'expérience ?</h2>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "0 0 24px" }}>Cela ajuste les taux de conversion estimés</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(LEVELS).map(([k, v]) => (
                  <button key={k} onClick={() => setLevel(k)} style={{ padding: "18px 20px", borderRadius: 14, border: "1.5px solid " + (level === k ? "#6366f1" : "rgba(255,255,255,0.08)"), background: level === k ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.03)", color: "#fff", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ fontSize: 28 }}>{v.emoji}</span>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Outfit'" }}>{v.label}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{k === "debutant" ? "Moins de 2 ans" : k === "intermediaire" ? "2 à 5 ans" : "Plus de 5 ans"}</div>
                    </div>
                    {level === k && <span style={{ marginLeft: "auto", color: "#6366f1", fontSize: 20 }}>✓</span>}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: 16, borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Retour</button>
                <Btn on={!!level} disabled={!level} onClick={() => setDone(true)} style={{ flex: 2 }}>Voir mes objectifs</Btn>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, animation: "fadeIn 0.4s both" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px", fontFamily: "'Outfit'" }}>Vos objectifs mensuels</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "0 0 20px" }}>Calculés pour atteindre {(+ca).toLocaleString("fr-FR")} € / an</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {KPIS.map((kpi, i) => (
              <div key={kpi.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", animation: "fadeIn 0.35s " + (i * 0.04) + "s both" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{kpi.icon}</span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{kpi.label}</span>
                </div>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#a78bfa", fontFamily: "'DM Mono'" }}>
                  {kpi.unit === "€" ? goals[kpi.id].toLocaleString("fr-FR") + " €" : kpi.unit === "h" ? goals[kpi.id] + "h" : goals[kpi.id]}
                </span>
              </div>
            ))}
          </div>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 16, textAlign: "center" }}>Modifiables à tout moment dans les réglages ⚙️</p>
          <Btn on onClick={() => onComplete({ ca: +ca, fee: +fee, level, rates: { ...LEVELS[level] }, goals })} style={{ width: "100%", marginTop: 20, marginBottom: 40 }}>🚀 C'est parti !</Btn>
        </div>
      )}
      <style>{CSS}</style>
    </div>
  );
}

// ─── SETTINGS ───
function Settings({ config, onSave, onClose }) {
  const [ca, setCa] = useState("" + config.ca);
  const [fee, setFee] = useState("" + config.fee);
  const [level, setLevel] = useState(config.level);
  const [rates, setRates] = useState({ ...config.rates });
  const [custom, setCustom] = useState(false);

  const goals = calcGoals(+ca, +fee, rates);
  const chgLevel = l => { setLevel(l); if (!custom) setRates({ ...LEVELS[l] }); };
  const chgRate = (id, v) => { setCustom(true); setRates(p => ({ ...p, [id]: +v })); };
  const save = () => { onSave({ ca: +ca, fee: +fee, level, rates, goals }); onClose(); };
  const iStyle = { width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'DM Mono'", textAlign: "center", outline: "none" };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#fff", fontFamily: "'DM Sans'", padding: "0 16px 40px", width: "100%", maxWidth: 430, margin: "0 auto" }}>
      <link href={FONTS} rel="stylesheet" />
      <div style={{ padding: "16px 4px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 24, position: "sticky", top: 0, background: "#0a0a0f", zIndex: 10 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#a78bfa", fontSize: 15, fontWeight: 600, cursor: "pointer", padding: 8 }}>← Retour</button>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: "'Outfit'" }}>Objectifs</h2>
        <button onClick={save} style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#a78bfa", fontSize: 14, fontWeight: 700, cursor: "pointer", padding: "8px 16px", borderRadius: 10 }}>Sauver</button>
      </div>

      <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>CA annuel visé</label>
      <div style={{ position: "relative", margin: "8px 0 24px" }}>
        <input type="number" value={ca} onChange={e => setCa(e.target.value)} style={iStyle} />
        <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>€/an</span>
      </div>

      <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>Honoraire moyen / vente</label>
      <div style={{ position: "relative", margin: "8px 0 24px" }}>
        <input type="number" value={fee} onChange={e => setFee(e.target.value)} style={iStyle} />
        <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>€</span>
      </div>

      <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>Niveau</label>
      <div style={{ display: "flex", gap: 8, margin: "8px 0 24px" }}>
        {Object.entries(LEVELS).map(([k, v]) => (
          <button key={k} onClick={() => chgLevel(k)} style={{ flex: 1, padding: "12px 8px", borderRadius: 12, border: "1.5px solid " + (level === k ? "#6366f1" : "rgba(255,255,255,0.08)"), background: level === k ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.03)", color: "#fff", cursor: "pointer", textAlign: "center" }}>
            <div style={{ fontSize: 20 }}>{v.emoji}</div>
            <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4 }}>{v.label}</div>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>Taux de conversion</label>
        {custom && <button onClick={() => { setCustom(false); setRates({ ...LEVELS[level] }); }} style={{ background: "none", border: "none", color: "#6366f1", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Réinitialiser</button>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {RATE_LABELS.map(r => (
          <div key={r.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", flex: 1 }}>{r.label}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="number" value={rates[r.id]} onChange={e => chgRate(r.id, e.target.value)} style={{ width: 56, padding: "6px 8px", borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "#a78bfa", fontSize: 15, fontWeight: 700, textAlign: "center", fontFamily: "'DM Mono'", outline: "none" }} />
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, width: 16 }}>{r.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 16, padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", color: "#a78bfa", fontFamily: "'Outfit'", textTransform: "uppercase", letterSpacing: 1 }}>Objectifs mensuels calculés</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {KPIS.map(kpi => (
            <div key={kpi.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{kpi.icon} {kpi.label.split(" ")[0]}</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#fff", fontFamily: "'DM Mono'" }}>
                {kpi.unit === "€" ? goals[kpi.id].toLocaleString("fr-FR") + "€" : goals[kpi.id]}{kpi.unit === "h" ? "h" : ""}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Btn on onClick={save} style={{ width: "100%" }}>Enregistrer les modifications</Btn>
      <style>{CSS}</style>
    </div>
  );
}

// ─── MAIN APP ───
export default function KPImmo() {
  const [config, setConfig] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [settings, setSettings] = useState(false);
  const [selDate, setSelDate] = useState(new Date());
  const [logs, setLogs] = useState({});
  const [streak, setStreak] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!config) return;
    setLogs({}); setStreak(0);
  }, [config]);

  if (!config) return <Onboarding onComplete={setConfig} />;
  if (settings) return <Settings config={config} onSave={setConfig} onClose={() => setSettings(false)} />;

  const tk = storageKey(selDate);
  const tl = logs[tk] || KPIS.reduce((a, k) => ({ ...a, [k.id]: 0 }), {});
  const goals = config.goals;

  const monthly = KPIS.reduce((a, kpi) => {
    let t = 0;
    Object.entries(logs).forEach(([k, l]) => {
      const d = new Date(k.replace("af_", ""));
      if (d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear()) t += l[kpi.id] || 0;
    });
    a[kpi.id] = kpi.unit === "h" ? +t.toFixed(1) : t;
    return a;
  }, {});

  const upd = (id, v) => {
    setLogs(p => {
      const cl = p[tk] || KPIS.reduce((a, k) => ({ ...a, [k.id]: 0 }), {});
      return { ...p, [tk]: { ...cl, [id]: Math.max(0, v) } };
    });
  };

  const navDate = dir => {
    const d = new Date(selDate); d.setDate(d.getDate() + dir);
    if (d <= new Date()) setSelDate(d);
  };

  const hasAct = Object.values(tl).some(v => v > 0);
  const submit = () => {
    if (hasAct) { setStreak(s => s + 1); setToast("🔥 Série prolongée !"); setTimeout(() => setToast(null), 2000); }
  };

  return (
    <div style={{ fontFamily: "'DM Sans'", background: "#0a0a0f", minHeight: "100vh", width: "100%", maxWidth: 430, margin: "0 auto", color: "#fff", position: "relative" }}>
      <link href={FONTS} rel="stylesheet" />

      <div style={{ position: "fixed", top: -100, right: -100, width: 300, height: 300, background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: -50, left: -50, width: 250, height: 250, background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      {toast && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", background: "rgba(99,102,241,0.9)", backdropFilter: "blur(10px)", padding: "12px 24px", borderRadius: 14, zIndex: 100, fontSize: 15, fontWeight: 700, animation: "fadeIn 0.3s both", boxShadow: "0 8px 30px rgba(99,102,241,0.4)" }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ padding: "16px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 10, background: "rgba(10,10,15,0.85)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, fontFamily: "'Outfit'", color: "#fff", letterSpacing: -1 }}>K</div>
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Outfit'", background: "linear-gradient(135deg, #e0e7ff, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>KPImmo</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Streak n={streak} />
          <button onClick={() => setSettings(true)} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "0 0 100px", opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(10px)", transition: "all 0.5s" }}>

        {tab === "dashboard" && (
          <div style={{ padding: "20px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, fontFamily: "'Outfit'" }}>{MONTHS_FR[new Date().getMonth()]} {new Date().getFullYear()}</h2>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.04)", padding: "6px 12px", borderRadius: 8 }}>Ce mois</div>
            </div>

            {Object.keys(logs).length === 0 ? (
              <div style={{ animation: "fadeIn 0.5s both", textAlign: "center", padding: "40px 20px" }}>
                <div style={{ width: 80, height: 80, borderRadius: 24, margin: "0 auto 24px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>🚀</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px", fontFamily: "'Outfit'", background: "linear-gradient(135deg, #e0e7ff, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Prêt à démarrer !</h3>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, lineHeight: 1.6, margin: "0 0 8px" }}>
                  Votre objectif : <strong style={{ color: "#a78bfa" }}>{config.goals.sales} vente{config.goals.sales > 1 ? "s" : ""} / mois</strong> pour atteindre {config.ca.toLocaleString("fr-FR")} € de CA annuel.
                </p>
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, lineHeight: 1.6, margin: "0 0 32px" }}>
                  Commencez par enregistrer votre première journée de prospection dans le journal.
                </p>
                <button onClick={() => setTab("log")} style={{ padding: "16px 32px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit'", boxShadow: "0 8px 30px rgba(99,102,241,0.3)", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  📝 Ouvrir le journal
                </button>

                <div style={{ marginTop: 40, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 20, textAlign: "left" }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 14px", color: "rgba(255,255,255,0.5)", fontFamily: "'Outfit'", textTransform: "uppercase", letterSpacing: 1 }}>Vos objectifs mensuels</h4>
                  {KPIS.map((kpi, i) => (
                    <div key={kpi.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < KPIS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{kpi.icon}</span>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{kpi.label}</span>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono'" }}>
                        {kpi.unit === "€" ? goals[kpi.id].toLocaleString("fr-FR") + " €" : goals[kpi.id]}{kpi.unit === "h" ? "h" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              {KPIS.map((kpi, i) => {
                const t = monthly[kpi.id], g = goals[kpi.id] || 1, p = t / g, pct = Math.round(p * 100), c = KPI_COLORS[i];
                return (
                  <div key={kpi.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 16, position: "relative", overflow: "hidden", animation: "fadeIn 0.4s " + (i * 0.05) + "s both" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>{kpi.label}</span>
                      <Ring progress={p} color={c} />
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'DM Mono'", lineHeight: 1 }}>
                      <AnimNum value={t} suffix={kpi.unit} />
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ color: pct >= 100 ? "#34d399" : pct >= 50 ? "#fbbf24" : "rgba(255,255,255,0.3)", fontWeight: 600 }}>{pct}%</span>
                      <span>/ {kpi.unit === "€" ? g.toLocaleString("fr-FR") + "€" : g}{kpi.unit === "h" ? "h" : ""}</span>
                    </div>
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, " + c + ", transparent)", opacity: 0.4 }} />
                  </div>
                );
              })}
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 16px", color: "rgba(255,255,255,0.5)", fontFamily: "'Outfit'", textTransform: "uppercase", letterSpacing: 1 }}>KPIs de conversion</h3>
              {[
                { l: "Contacts / Heure", v: monthly.hours > 0 ? (monthly.contacts / monthly.hours).toFixed(1) : "—" },
                { l: "Taux de qualification", v: monthly.contacts > 0 ? Math.round(monthly.prospects / monthly.contacts * 100) + "%" : "—" },
                { l: "Taux de RDV", v: monthly.prospects > 0 ? Math.round(monthly.rdvSet / monthly.prospects * 100) + "%" : "—" },
                { l: "Taux de closing", v: monthly.mandats > 0 ? Math.round(monthly.sales / monthly.mandats * 100) + "%" : "—" },
              ].map((x, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{x.l}</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#a78bfa", fontFamily: "'DM Mono'" }}>{x.v}</span>
                </div>
              ))}
            </div>
              </>
            )}
          </div>
        )}

        {tab === "log" && (
          <div style={{ padding: "20px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <button onClick={() => navDate(-1)} style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Outfit'" }}>{formatDate(selDate)}</div>
                {selDate.toDateString() === new Date().toDateString() && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Aujourd'hui</div>}
              </div>
              <button onClick={() => navDate(1)} style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: selDate.toDateString() === new Date().toDateString() ? "rgba(255,255,255,0.15)" : "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: selDate.toDateString() === new Date().toDateString() ? "none" : "auto" }}>›</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {KPIS.map((kpi, i) => (
                <div key={kpi.id} style={{ animation: "fadeIn 0.35s " + (i * 0.04) + "s both" }}>
                  <Stepper kpi={kpi} value={tl[kpi.id] || 0} onChange={v => upd(kpi.id, v)} />
                </div>
              ))}
            </div>

            <Btn on={hasAct} disabled={!hasAct} onClick={submit} style={{ width: "100%", marginTop: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              🔥 Valider & prolonger la série
            </Btn>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "rgba(10,10,15,0.92)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-around", alignItems: "flex-end", padding: "10px 0 28px", zIndex: 20 }}>
        <button onClick={() => setTab("dashboard")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: tab === "dashboard" ? "#a78bfa" : "rgba(255,255,255,0.3)", padding: "4px 16px", flex: 1 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
          <span style={{ fontSize: 10, fontWeight: 600 }}>Dashboard</span>
          {tab === "dashboard" && <div style={{ width: 4, height: 4, borderRadius: 2, background: "#6366f1" }} />}
        </button>

        <div style={{ flex: 1, display: "flex", justifyContent: "center", position: "relative" }}>
          <button onClick={() => setTab("log")} style={{ position: "absolute", bottom: 12, width: 56, height: 56, borderRadius: 28, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 24px rgba(99,102,241,0.4), 0 0 0 4px rgba(10,10,15,0.9)", transform: tab === "log" ? "scale(1.08)" : "scale(1)", transition: "transform 0.25s" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>

        <button onClick={() => setSettings(true)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.3)", padding: "4px 16px", flex: 1 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/><path d="M16 16l2 2"/></svg>
          <span style={{ fontSize: 10, fontWeight: 600 }}>Objectifs</span>
        </button>
      </div>

      <style>{CSS}</style>
    </div>
  );
}
