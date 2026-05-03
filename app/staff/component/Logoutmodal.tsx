"use client";


interface LogoutModalProps {
  open:     boolean;
  onCancel: () => void;
  message?: string;
}

function IcoLogout() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

const css = `
  @keyframes lmFadeIn  { from { opacity: 0 }                        to { opacity: 1 } }
  @keyframes lmSlideUp { from { opacity: 0; transform: translate(-50%,-46%) } to { opacity: 1; transform: translate(-50%,-50%) } }

  .lm-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(3px);
    z-index: 2000;
    animation: lmFadeIn 0.2s ease;
  }

  .lm-card {
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%,-50%);
    background: #ffffff;
    border: 1px solid #e2e0d8;
    border-radius: 16px;
    padding: 1.75rem;
    width: 100%; max-width: 380px;
    z-index: 2001;
    box-shadow: 0 24px 60px rgba(0,0,0,0.16);
    font-family: 'DM Sans', sans-serif;
    animation: lmSlideUp 0.22s cubic-bezier(.4,0,.2,1);
  }

  .lm-icon-wrap {
    width: 48px; height: 48px; border-radius: 50%;
    background: #fef2f2;
    border: 1px solid #fecaca;
    display: flex; align-items: center; justify-content: center;
    color: #dc2626;
    margin-bottom: 1rem;
  }

  .lm-title {
    font-size: 16px; font-weight: 600; color: #141410;
    margin-bottom: 6px;
  }

  .lm-message {
    font-size: 13px; color: #9a9a8e;
    line-height: 1.65; margin-bottom: 1.5rem;
  }

  .lm-actions {
    display: flex; gap: 8px;
  }

  .lm-btn-cancel {
    flex: 1; padding: 10px 0;
    background: #fff; color: #4a4a40;
    border: 1px solid #c8c6bc; border-radius: 9px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px; cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .lm-btn-cancel:hover { background: #f5f4f0; border-color: #9a9a8e; }

  .lm-btn-confirm {
    flex: 1; padding: 10px 0;
    background: #dc2626; color: #fff;
    border: none; border-radius: 9px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px; font-weight: 500; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 7px;
    transition: background 0.15s, transform 0.1s;
  }
  .lm-btn-confirm:hover  { background: #b91c1c; }
  .lm-btn-confirm:active { transform: scale(0.98); }
`;

export default function LogoutModal({ open, onCancel, message }: LogoutModalProps) {

  if (!open) return null;

const handleLogout = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("read_notifs");
  window.location.href = "https://pos.upendoapps.com?logout=true";
};

  const defaultMessage = "You'll be signed out of your account. Make sure any unsaved changes are saved before leaving.";

  return (
    <>
      <style>{css}</style>

      {/* Overlay — click to cancel */}
      <div className="lm-overlay" onClick={onCancel} />

      {/* Modal card */}
      <div className="lm-card">
        <div className="lm-icon-wrap">
          <IcoLogout />
        </div>

        <div className="lm-title">Sign out of your account?</div>
        <div className="lm-message">{message ?? defaultMessage}</div>

        <div className="lm-actions">
          <button className="lm-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="lm-btn-confirm" onClick={handleLogout}>
            <IcoLogout /> Yes, sign out
          </button>
        </div>
      </div>
    </>
  );
}