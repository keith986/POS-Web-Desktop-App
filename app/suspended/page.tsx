"use client";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --bg: #f5f4f0; --ink: #141410; --muted: #9a9a8e; --border: #e2e0d8; }
  body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--ink); }
  body::before { content: ''; position: fixed; inset: 0; background-image: linear-gradient(rgba(0,0,0,0.032) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.032) 1px, transparent 1px); background-size: 40px 40px; pointer-events: none; z-index: 0; }
  .page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; position: relative; z-index: 1; }
  .card { background: #fff; border: 1px solid var(--border); border-radius: 20px; padding: 3rem 2.5rem; width: 100%; max-width: 460px; text-align: center; box-shadow: 0 4px 32px rgba(0,0,0,0.07); }
  .icon { width: 72px; height: 72px; border-radius: 50%; background: #fffbeb; border: 1px solid #fde68a; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: #d97706; }
  h1 { font-size: 22px; font-weight: 700; margin-bottom: 10px; letter-spacing: -0.5px; }
  .sub { font-size: 14px; color: var(--muted); line-height: 1.7; margin-bottom: 2rem; }
  .info-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem; text-align: left; }
  .info-row { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: #92400e; line-height: 1.5; }
  .info-row + .info-row { margin-top: 10px; }
  .divider { border: none; border-top: 1px solid var(--border); margin: 1.5rem 0; }
  .store-name { font-size: 13px; color: var(--muted); margin-bottom: 1.5rem; }
  .store-name strong { color: var(--ink); }
  .btn-outline { display: inline-flex; align-items: center; gap: 7px; padding: 10px 24px; background: none; border: 1px solid #c8c6bc; border-radius: 9px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #4a4a40; cursor: pointer; text-decoration: none; transition: all 0.15s; }
  .btn-outline:hover { border-color: var(--ink); color: var(--ink); background: #f5f4f0; }
  .footer { margin-top: 1.5rem; font-size: 11px; color: #c8c6bc; line-height: 1.6; }
`;

export default function SuspendedPage() {
  // Get staff info from localStorage
  const getStaff = () => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem("user") ?? "null"); }
    catch { return null; }
  };

  const staff = typeof window !== "undefined" ? getStaff() : null;

  const handleSignOut = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("read_notifs");
    window.location.href = "https://pos.upendoapps.com?logout=true";
  };

  return (
    <>
      <style>{css}</style>
      <div className="page">
        <div className="card">

          {/* Icon */}
          <div className="icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>

          <h1>Store Access Suspended</h1>
          <p className="sub">
            Your store subscription has expired or has not been activated.
            You cannot access the dashboard until your administrator renews the subscription.
          </p>

          {staff?.store_name && (
            <p className="store-name">
              Store: <strong>{staff.store_name}</strong>
            </p>
          )}

          {/* Info box */}
          <div className="info-box">
            <div className="info-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>Your access has been temporarily restricted because the store subscription is inactive.</span>
            </div>
            <div className="info-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 1h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16z"/>
              </svg>
              <span>Please contact your store administrator to resolve this issue.</span>
            </div>
            <div className="info-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              <span>Once the subscription is renewed, you will be able to access your dashboard immediately.</span>
            </div>
          </div>

          <hr className="divider" />

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <button className="btn-outline" onClick={handleSignOut}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
              Sign out
            </button>
          </div>

          <p className="footer">
            POStore · pos.upendoapps.com<br />
            If you believe this is an error, contact support.
          </p>
        </div>
      </div>
    </>
  );
}