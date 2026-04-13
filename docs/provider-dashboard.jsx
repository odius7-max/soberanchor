import { useState, useEffect } from "react";

const NAVY = "#003366";
const NAVY_DARK = "#002244";
const TEAL = "#2A8A99";
const TEAL_LIGHT = "#3AA5B6";
const GOLD = "#D4A574";
const OFF_WHITE = "#FAFAF8";
const WARM_GRAY = "#F5F3F0";
const BORDER = "#E8E4DF";
const MID = "#888";
const DARK = "#2C2C2C";
const GREEN = "#27AE60";

// Mock data
const MOCK_FACILITY = {
  id: "f1",
  name: "Serenity Ridge Treatment Center",
  facility_type: "treatment",
  address_line1: "2400 Carlsbad Blvd",
  city: "Carlsbad",
  state: "CA",
  zip: "92008",
  phone: "(760) 555-0192",
  email: "info@serenityridge.example.com",
  website: "https://serenityridge.example.com",
  description: "Serenity Ridge is a leading treatment center in coastal Carlsbad, offering comprehensive inpatient and outpatient programs for alcohol and drug addiction. Our dual-diagnosis approach addresses both substance use and co-occurring mental health conditions.",
  listing_tier: "basic",
  is_verified: false,
  is_claimed: true,
  is_featured: false,
  avg_rating: 4.8,
  review_count: 127,
  accepts_insurance: true,
  accepts_private_pay: true,
  categories: ["Alcohol", "Drugs", "Dual-Diagnosis"],
  insurance: ["Blue Cross", "Aetna", "Cigna", "United", "Kaiser", "Medi-Cal"],
  amenities: ["Inpatient", "Outpatient (IOP)", "Detox", "MAT Available", "CBT", "EMDR", "Family Programs"],
};

const MOCK_LEADS = [
  { id: "l1", first_name: "Sarah", phone: "(619) 555-0134", insurance_provider: "Blue Cross", seeking: "inpatient", who_for: "family", status: "new", created_at: "2026-04-09T08:30:00Z" },
  { id: "l2", first_name: "Mike", phone: "(858) 555-0198", insurance_provider: "Aetna", seeking: "outpatient", who_for: "self", status: "new", created_at: "2026-04-08T14:22:00Z" },
  { id: "l3", first_name: "Jessica", phone: "(760) 555-0177", insurance_provider: "United", seeking: "detox", who_for: "family", status: "contacted", created_at: "2026-04-07T09:15:00Z" },
  { id: "l4", first_name: "David", phone: "(949) 555-0145", insurance_provider: "Cigna", seeking: "sober_living", who_for: "self", status: "converted", created_at: "2026-04-05T11:40:00Z" },
  { id: "l5", first_name: "Amy", phone: "(619) 555-0201", insurance_provider: "Kaiser", seeking: "unsure", who_for: "friend", status: "new", created_at: "2026-04-09T10:05:00Z" },
];

const MOCK_STATS = {
  views_this_month: 342,
  views_last_month: 278,
  leads_this_month: 5,
  leads_last_month: 3,
  contact_clicks: 28,
  contact_clicks_last: 19,
};

// ─── Tiny components ───
const Badge = ({ children, color = WARM_GRAY, textColor = DARK, border = BORDER }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: color, border: `1px solid ${border}`, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 500, color: textColor, whiteSpace: "nowrap" }}>
    {children}
  </span>
);

const StatusBadge = ({ status }) => {
  const map = {
    new: { bg: "#E8F5E9", border: "#A5D6A7", color: GREEN, label: "New" },
    contacted: { bg: "#FFF8E1", border: "#FFE082", color: "#F57F17", label: "Contacted" },
    converted: { bg: "#E3F2FD", border: "#90CAF9", color: "#1565C0", label: "Converted" },
    closed: { bg: WARM_GRAY, border: BORDER, color: MID, label: "Closed" },
  };
  const s = map[status] || map.closed;
  return <Badge color={s.bg} border={s.border} textColor={s.color}>{s.label}</Badge>;
};

const StatCard = ({ label, value, prev, icon }) => {
  const pctChange = prev > 0 ? Math.round(((value - prev) / prev) * 100) : 0;
  const up = pctChange >= 0;
  return (
    <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "24px 20px", flex: "1 1 200px", minWidth: 180 }}>
      <div style={{ fontSize: 13, color: MID, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 18 }}>{icon}</span> {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: NAVY, fontFamily: "'Cormorant Garamond', Georgia, serif", lineHeight: 1 }}>{value}</div>
      {prev !== undefined && (
        <div style={{ fontSize: 12, color: up ? GREEN : "#E53935", marginTop: 6, fontWeight: 500 }}>
          {up ? "↑" : "↓"} {Math.abs(pctChange)}% vs last month
        </div>
      )}
    </div>
  );
};

const Btn = ({ children, variant = "navy", size = "md", full, onClick, style: sx }) => {
  const styles = {
    navy: { background: NAVY, color: "#fff", border: "none" },
    teal: { background: TEAL, color: "#fff", border: "none" },
    gold: { background: GOLD, color: "#fff", border: "none" },
    outline: { background: "none", color: NAVY, border: `1.5px solid ${NAVY}` },
    ghost: { background: "none", color: TEAL, border: "none", padding: "6px 2px" },
  };
  const sizes = { sm: { padding: "7px 14px", fontSize: 13 }, md: { padding: "11px 24px", fontSize: 14 }, lg: { padding: "14px 32px", fontSize: 16 } };
  return (
    <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 8, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif", letterSpacing: "0.01em", width: full ? "100%" : "auto", justifyContent: full ? "center" : "flex-start", transition: "all 0.2s", ...styles[variant], ...sizes[size], ...sx }}>
      {children}
    </button>
  );
};

const Tab = ({ active, children, onClick }) => (
  <button onClick={onClick} style={{ background: active ? `${TEAL}12` : "none", color: active ? TEAL : DARK, border: "none", padding: "10px 20px", borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "'Outfit', sans-serif", transition: "all 0.2s" }}>
    {children}
  </button>
);

const Input = ({ label, value, onChange, type = "text", placeholder, multiline, disabled }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>{label}</label>
    {multiline ? (
      <textarea value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} rows={4} style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${BORDER}`, borderRadius: 8, fontSize: 14, fontFamily: "'Outfit', sans-serif", background: disabled ? WARM_GRAY : "#fff", outline: "none", resize: "vertical" }} />
    ) : (
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${BORDER}`, borderRadius: 8, fontSize: 14, fontFamily: "'Outfit', sans-serif", background: disabled ? WARM_GRAY : "#fff", outline: "none" }} />
    )}
  </div>
);

// ─── Tier upgrade card ───
const TierCard = ({ tier, price, features, current, recommended }) => (
  <div style={{ background: "#fff", border: `${recommended ? 2 : 1}px solid ${recommended ? TEAL : BORDER}`, borderRadius: 14, padding: 24, flex: "1 1 220px", position: "relative", opacity: current ? 0.7 : 1 }}>
    {recommended && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: TEAL, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 20, letterSpacing: 1, textTransform: "uppercase" }}>Recommended</div>}
    <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{tier}</div>
    <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 36, fontWeight: 700, color: NAVY, marginBottom: 4 }}>
      {price === 0 ? "Free" : `$${price}`}<span style={{ fontSize: 14, fontWeight: 400, color: MID }}>{price > 0 ? "/mo" : ""}</span>
    </div>
    <div style={{ borderTop: `1px solid ${BORDER}`, margin: "16px 0", paddingTop: 16 }}>
      {features.map((f, i) => (
        <div key={i} style={{ fontSize: 14, color: DARK, lineHeight: 2, display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span style={{ color: GREEN, flexShrink: 0 }}>✓</span> {f}
        </div>
      ))}
    </div>
    {current ? (
      <Btn variant="outline" full disabled style={{ opacity: 0.5 }}>Current Plan</Btn>
    ) : (
      <Btn variant={recommended ? "teal" : "outline"} full>Upgrade</Btn>
    )}
  </div>
);

// ─── Main Dashboard ───
export default function ProviderDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [facility, setFacility] = useState(MOCK_FACILITY);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [leadFilter, setLeadFilter] = useState("all");

  const startEdit = () => { setEditData({ ...facility }); setEditing(true); };
  const cancelEdit = () => { setEditing(false); };
  const saveEdit = () => { setFacility({ ...editData }); setEditing(false); };

  const filteredLeads = leadFilter === "all" ? MOCK_LEADS : MOCK_LEADS.filter(l => l.status === leadFilter);

  const seekingLabel = (s) => ({ inpatient: "Inpatient", outpatient: "Outpatient", detox: "Detox", sober_living: "Sober Living", therapy: "Therapy", unsure: "Not sure yet" }[s] || s);
  const whoLabel = (w) => ({ self: "Themselves", family: "Family member", friend: "Friend", professional: "Client" }[w] || w);
  const timeAgo = (d) => {
    const diff = (Date.now() - new Date(d).getTime()) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", background: OFF_WHITE, minHeight: "100vh", color: DARK }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{ background: "#fff", borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="28" height="28" viewBox="0 0 64 64" fill="none">
              <path d="M32 8a6 6 0 1 1 0 12 6 6 0 0 1 0-12z" stroke={NAVY} strokeWidth="2.5"/>
              <path d="M32 20v32" stroke={NAVY} strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M20 44c0 6.627 5.373 12 12 12s12-5.373 12-12" stroke={NAVY} strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M24 36h16" stroke={NAVY} strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 700, color: NAVY }}>SoberAnchor</span>
            <Badge color={`${TEAL}15`} border={`${TEAL}30`} textColor={TEAL}>Provider Portal</Badge>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 13, color: MID }}>Serenity Ridge Treatment Center</div>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${TEAL}, ${NAVY})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 600 }}>SR</div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 24px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 32, flexWrap: "wrap" }}>
          <Tab active={activeTab === "overview"} onClick={() => setActiveTab("overview")}>📊 Overview</Tab>
          <Tab active={activeTab === "listing"} onClick={() => setActiveTab("listing")}>📋 My Listing</Tab>
          <Tab active={activeTab === "leads"} onClick={() => setActiveTab("leads")}>📩 Leads</Tab>
          <Tab active={activeTab === "plan"} onClick={() => setActiveTab("plan")}>⭐ Plan & Billing</Tab>
        </div>

        {/* ─── OVERVIEW TAB ─── */}
        {activeTab === "overview" && (
          <div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 32, fontWeight: 600, color: NAVY, marginBottom: 8 }}>Welcome back</h1>
            <p style={{ color: MID, fontSize: 15, marginBottom: 28 }}>Here's how your listing is performing this month.</p>

            {/* Stats row */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
              <StatCard icon="👁" label="Listing Views" value={MOCK_STATS.views_this_month} prev={MOCK_STATS.views_last_month} />
              {facility.listing_tier !== "basic" ? (
                <StatCard icon="📩" label="New Leads" value={MOCK_STATS.leads_this_month} prev={MOCK_STATS.leads_last_month} />
              ) : (
                <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "24px 20px", flex: "1 1 200px", minWidth: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: MID, marginBottom: 4 }}>📩 Lead Capture</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: TEAL, cursor: "pointer" }} onClick={() => setActiveTab("plan")}>Upgrade to unlock →</div>
                </div>
              )}
              <StatCard icon="📞" label="Contact Clicks" value={MOCK_STATS.contact_clicks} prev={MOCK_STATS.contact_clicks_last} />
            </div>

            {/* Listing tier CTA */}
            {facility.listing_tier === "basic" && (
              <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4a5e 100%)`, borderRadius: 14, padding: 32, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20, marginBottom: 32 }}>
                <div>
                  <div style={{ color: GOLD, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Upgrade Your Listing</div>
                  <div style={{ color: "#fff", fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Get more visibility, more leads.</div>
                  <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>Featured badge, top placement, photos, analytics, and more.</div>
                </div>
                <Btn variant="gold" size="lg" onClick={() => setActiveTab("plan")}>View Plans →</Btn>
              </div>
            )}

            {/* Recent leads */}
            {facility.listing_tier !== "basic" ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, color: NAVY, fontWeight: 600 }}>Recent Leads</h2>
                  <Btn variant="ghost" onClick={() => setActiveTab("leads")}>View all →</Btn>
                </div>
                <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
                  {MOCK_LEADS.slice(0, 3).map((lead, i) => (
                    <div key={lead.id} style={{ padding: "16px 20px", borderBottom: i < 2 ? `1px solid ${BORDER}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: NAVY }}>{lead.first_name}</div>
                        <div style={{ fontSize: 13, color: MID }}>Looking for {seekingLabel(lead.seeking)} · For {whoLabel(lead.who_for)} · {lead.insurance_provider}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 12, color: MID }}>{timeAgo(lead.created_at)}</span>
                        <StatusBadge status={lead.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ background: `${TEAL}08`, border: `1px solid ${TEAL}20`, borderRadius: 14, padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: NAVY, marginBottom: 4 }}>📩 Want leads delivered to your inbox?</div>
                  <div style={{ fontSize: 14, color: MID }}>Upgrade to Enhanced to add a contact form to your listing and start receiving leads.</div>
                </div>
                <Btn variant="teal" size="sm" onClick={() => setActiveTab("plan")}>Learn More →</Btn>
              </div>
            )}
          </div>
        )}

        {/* ─── LISTING TAB ─── */}
        {activeTab === "listing" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 32, fontWeight: 600, color: NAVY, marginBottom: 4 }}>My Listing</h1>
                <p style={{ color: MID, fontSize: 15 }}>Edit how your facility appears in the SoberAnchor directory.</p>
              </div>
              {!editing ? (
                <Btn variant="teal" onClick={startEdit}>✏️ Edit Listing</Btn>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn variant="outline" onClick={cancelEdit}>Cancel</Btn>
                  <Btn variant="teal" onClick={saveEdit}>Save Changes</Btn>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "start" }}>
              {/* Left column — listing details */}
              <div>
                {/* Preview card */}
                <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24, marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TEAL, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Listing Preview</div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ width: 120, height: 120, borderRadius: 12, background: `${TEAL}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, flexShrink: 0 }}>🏥</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {facility.is_featured && <Badge color={`${GOLD}15`} border={`${GOLD}40`} textColor="#9A7B54">Featured</Badge>}
                      <h3 style={{ fontSize: 20, color: NAVY, fontWeight: 600, fontFamily: "'Cormorant Garamond', Georgia, serif", margin: "4px 0" }}>{facility.name}</h3>
                      <div style={{ fontSize: 13, color: MID }}>📍 {facility.city}, {facility.state} · {facility.facility_type === "treatment" ? "Treatment Center" : facility.facility_type}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                        {facility.categories.map(c => <Badge key={c}>{c}</Badge>)}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>
                        {[1,2,3,4,5].map(s => <span key={s} style={{ color: s <= Math.round(facility.avg_rating) ? GOLD : "#ddd", fontSize: 14 }}>★</span>)}
                        <span style={{ fontSize: 13, color: MID, marginLeft: 4 }}>({facility.review_count})</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Edit form */}
                <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TEAL, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Facility Details</div>
                  <Input label="Facility Name" value={editing ? editData.name : facility.name} disabled={!editing} onChange={e => setEditData({...editData, name: e.target.value})} />
                  <Input label="Description" value={editing ? editData.description : facility.description} disabled={!editing} multiline onChange={e => setEditData({...editData, description: e.target.value})} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Input label="Phone" value={editing ? editData.phone : facility.phone} disabled={!editing} onChange={e => setEditData({...editData, phone: e.target.value})} />
                    <Input label="Email" value={editing ? editData.email : facility.email} disabled={!editing} onChange={e => setEditData({...editData, email: e.target.value})} />
                  </div>
                  <Input label="Website" value={editing ? editData.website : facility.website} disabled={!editing} onChange={e => setEditData({...editData, website: e.target.value})} />
                  <Input label="Street Address" value={editing ? editData.address_line1 : facility.address_line1} disabled={!editing} onChange={e => setEditData({...editData, address_line1: e.target.value})} />
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
                    <Input label="City" value={editing ? editData.city : facility.city} disabled={!editing} onChange={e => setEditData({...editData, city: e.target.value})} />
                    <Input label="State" value={editing ? editData.state : facility.state} disabled={!editing} onChange={e => setEditData({...editData, state: e.target.value})} />
                    <Input label="ZIP" value={editing ? editData.zip : facility.zip} disabled={!editing} onChange={e => setEditData({...editData, zip: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* Right column — side panels */}
              <div>
                {/* Listing tier */}
                <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TEAL, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Your Plan</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: NAVY, textTransform: "capitalize" }}>{facility.listing_tier}</div>
                      <div style={{ fontSize: 13, color: MID }}>Free forever</div>
                    </div>
                    <Btn variant="outline" size="sm" onClick={() => setActiveTab("plan")}>Upgrade</Btn>
                  </div>
                </div>

                {/* Status */}
                <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TEAL, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Listing Status</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                      <span style={{ color: MID }}>Claimed</span>
                      <span style={{ color: GREEN, fontWeight: 600 }}>✓ Yes</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                      <span style={{ color: MID }}>Verified</span>
                      <span style={{ color: facility.is_verified ? GREEN : "#E53935", fontWeight: 600 }}>{facility.is_verified ? "✓ Yes" : "✗ Pending"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                      <span style={{ color: MID }}>Featured</span>
                      <span style={{ color: facility.is_featured ? GOLD : MID, fontWeight: 600 }}>{facility.is_featured ? "★ Yes" : "— No"}</span>
                    </div>
                  </div>
                </div>

                {/* Services */}
                <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TEAL, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Services & Amenities</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {facility.amenities.map(a => <Badge key={a}>{a}</Badge>)}
                    {editing && <button style={{ background: `${TEAL}12`, border: `1px dashed ${TEAL}`, borderRadius: 20, padding: "4px 12px", fontSize: 12, color: TEAL, fontWeight: 600, cursor: "pointer" }}>+ Add</button>}
                  </div>
                </div>

                {/* Insurance */}
                <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TEAL, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Insurance Accepted</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {facility.insurance.map(ins => <Badge key={ins}>{ins}</Badge>)}
                    {editing && <button style={{ background: `${TEAL}12`, border: `1px dashed ${TEAL}`, borderRadius: 20, padding: "4px 12px", fontSize: 12, color: TEAL, fontWeight: 600, cursor: "pointer" }}>+ Add</button>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── LEADS TAB ─── */}
        {activeTab === "leads" && (
          <div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 32, fontWeight: 600, color: NAVY, marginBottom: 4 }}>Leads</h1>
            <p style={{ color: MID, fontSize: 15, marginBottom: 24 }}>People who've requested information about your facility.</p>

            {facility.listing_tier === "basic" ? (
              <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 48, textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📩</div>
                <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 26, color: NAVY, marginBottom: 8 }}>Unlock Lead Capture</h2>
                <p style={{ color: MID, fontSize: 15, lineHeight: 1.6, maxWidth: 480, margin: "0 auto 24px" }}>
                  Upgrade to Enhanced to add a "Contact This Facility" form to your listing. Leads are delivered straight to your inbox — no middleman, no fulfillment work.
                </p>
                <Btn variant="teal" size="lg" onClick={() => setActiveTab("plan")}>View Plans & Upgrade →</Btn>
              </div>
            ) : (
              <>
                {/* Filter chips */}
                <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                  {[["all", "All"], ["new", "New"], ["contacted", "Contacted"], ["converted", "Converted"], ["closed", "Closed"]].map(([val, label]) => (
                    <button key={val} onClick={() => setLeadFilter(val)} style={{ background: leadFilter === val ? NAVY : WARM_GRAY, color: leadFilter === val ? "#fff" : DARK, border: `1px solid ${leadFilter === val ? NAVY : BORDER}`, borderRadius: 20, padding: "7px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>
                      {label} {val === "new" && `(${MOCK_LEADS.filter(l => l.status === "new").length})`}
                    </button>
                  ))}
                </div>

                {/* Lead cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {filteredLeads.map(lead => (
                    <div key={lead.id} style={{ background: "#fff", border: `1px solid ${lead.status === "new" ? `${GREEN}40` : BORDER}`, borderRadius: 14, padding: "20px 24px", borderLeft: lead.status === "new" ? `4px solid ${GREEN}` : `4px solid transparent` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                            <span style={{ fontSize: 18, fontWeight: 600, color: NAVY }}>{lead.first_name}</span>
                            <StatusBadge status={lead.status} />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "4px 24px", fontSize: 14, color: DARK }}>
                            <div><span style={{ color: MID }}>Phone:</span> {lead.phone}</div>
                            <div><span style={{ color: MID }}>Insurance:</span> {lead.insurance_provider}</div>
                            <div><span style={{ color: MID }}>Looking for:</span> {seekingLabel(lead.seeking)}</div>
                            <div><span style={{ color: MID }}>Who for:</span> {whoLabel(lead.who_for)}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                          <span style={{ fontSize: 12, color: MID }}>{timeAgo(lead.created_at)}</span>
                          <div style={{ display: "flex", gap: 6 }}>
                            {lead.status === "new" && <Btn variant="teal" size="sm">Mark Contacted</Btn>}
                            {lead.status === "contacted" && <Btn variant="outline" size="sm">Mark Converted</Btn>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredLeads.length === 0 && (
                  <div style={{ textAlign: "center", padding: 48, color: MID, fontSize: 15 }}>
                    No {leadFilter} leads yet.
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── PLAN TAB ─── */}
        {activeTab === "plan" && (
          <div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 32, fontWeight: 600, color: NAVY, marginBottom: 4 }}>Plan & Billing</h1>
            <p style={{ color: MID, fontSize: 15, marginBottom: 32 }}>Choose the right plan to grow your visibility and leads.</p>

            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 40 }}>
              <TierCard
                tier="Basic"
                price={0}
                current={facility.listing_tier === "basic"}
                features={["Listed in directory", "Basic listing info", "Phone & website visible", "1 photo"]}
              />
              <TierCard
                tier="Enhanced"
                price={149}
                recommended
                current={facility.listing_tier === "enhanced"}
                features={["Everything in Basic", "Lead capture form & inbox 📩", "Featured badge ⭐", "Verified badge ✓", "Up to 10 photos", "Respond to reviews", "Basic analytics dashboard"]}
              />
              <TierCard
                tier="Premium"
                price={399}
                current={facility.listing_tier === "premium"}
                features={["Everything in Enhanced", "Top-of-results placement", "Unlimited photos", "Full analytics dashboard", "Event posting", "Priority support"]}
              />
            </div>

            <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24 }}>
              <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, color: NAVY, marginBottom: 12 }}>Frequently Asked Questions</h3>
              {[
                ["How do leads work?", "Enhanced and Premium listings include a \"Contact This Facility\" form. When someone submits it, their info appears in your Leads inbox. Basic listings show your phone and website so people can reach you directly, but don't include lead capture or tracking."],
                ["Can I cancel anytime?", "Yes. No contracts, no hidden fees. Downgrade to Basic (free) whenever you want and your listing stays active."],
                ["What's the Featured badge?", "Enhanced and Premium listings get a gold \"Featured\" badge that appears on your listing card in search results, making it stand out from basic listings."],
              ].map(([q, a], i) => (
                <div key={i} style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : "none", padding: "16px 0" }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: NAVY, marginBottom: 4 }}>{q}</div>
                  <div style={{ fontSize: 14, color: MID, lineHeight: 1.6 }}>{a}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
