"use client";

import React, { useEffect, useRef, useState } from "react";

interface SupportMessage {
  id:     string;
  sender: "admin" | "super_admin";
  message: string;
  title:   string | null;
  time:    string;
  is_new?: boolean;
}

export default function AdminSupportPage() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text,     setText]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [sending,  setSending]  = useState(false);
  const [notice,   setNotice]   = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [adminId,  setAdminId]  = useState<string | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);

  /* ── Auth ── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const parsed = JSON.parse(localStorage.getItem("user") ?? "null");
      setAdminId(parsed?.id ?? null);
    } catch { setAdminId(null); }
  }, []);

  /* ── Fetch messages ── */
  const fetchMessages = async () => {
    if (!adminId) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/support?admin_id=${encodeURIComponent(adminId)}`);
      const body = await res.json();
      if (Array.isArray(body)) setMessages(body);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchMessages(); }, [adminId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Auto-scroll to bottom on new message ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const flash = (text: string, type: "success" | "error" | "info" = "info") => {
    setNotice({ text, type });
    window.setTimeout(() => setNotice(null), 4500);
  };

  /* ── Send message ── */
  const send = async () => {
    if (!adminId || !text.trim() || sending) return;
    const payload = { admin_id: adminId, sender: "admin", message: text.trim(), title: "Support" };
    setSending(true);
    try {
      const res  = await fetch("/api/support", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const body = await res.json();
      if (body.success) {
        setText("");
        setMessages(prev => [...prev, {
          id:      body.id || Date.now().toString(),
          sender:  "admin",
          message: payload.message,
          title:   payload.title,
          time:    "just now",
        }]);
      } else {
        flash(body.error || "Send failed", "error");
      }
    } catch (err) {
      console.error(err);
      flash("Send failed", "error");
    } finally { setSending(false); }
  };

  /* ── Enter to send ── */
  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const dater = new Intl.DateTimeFormat("en-US", {
    month: "long", day: "numeric", year: "numeric",
  }).format(new Date());

  if (!adminId) {
    return (
      <div style={{ padding: "2rem", color: "#9a9a8e", fontSize: 14 }}>
        Please log in as admin to use Support.
      </div>
    );
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .msg-bubble { animation: fadeUp 0.2s ease; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .send-btn:hover:not(:disabled) { background: #2a2a22 !important; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(20,20,16,0.2); }
        .send-btn:active:not(:disabled) { transform: translateY(0); }
        .refresh-btn:hover { border-color: #141410 !important; color: #141410 !important; }
        .msg-input:focus { border-color: #141410 !important; box-shadow: 0 0 0 3px rgba(20,20,16,0.07) !important; outline: none; }
      `}</style>

      {/* ── Header — matches subscription page exactly ── */}
      <header className="header">
        <div className="header-title">Support</div>
        <div className="header-date">{dater}</div>
        <button
          className="refresh-btn"
          onClick={fetchMessages}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "7px 14px",
            background: "#fff", color: "#4a4a40",
            border: "1px solid #c8c6bc", borderRadius: 7,
            fontFamily: "inherit", fontSize: 13, fontWeight: 500,
            cursor: "pointer", transition: "all 0.15s",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </header>
      {notice && (
        <div style={{ margin: "0 0 1rem", padding: "1rem 1.25rem", borderRadius: 12, background: notice.type === "success" ? "#ecfdf5" : "#fef2f2", border: notice.type === "success" ? "1px solid #bbf7d0" : "1px solid #fecaca", color: notice.type === "success" ? "#166534" : "#991b1b" }}>
          {notice.text}
        </div>
      )}

      <main className="main">

        {/* ── Info strip — mirrors subscription stat cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
          {[
            {
              label: "Support Channel",
              value: "Live Chat",
              sub:   "Direct line to our Customer Care",
            },
            {
              label: "Messages",
              value: loading ? "…" : String(messages.length),
              sub:   "Total in this thread",
            },
            {
              label: "Status",
              value: (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f0fdf4", borderRadius: 100, padding: "5px 13px", fontSize: 12, fontWeight: 500, color: "#16a34a" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a" }} />
                  Online
                </span>
              ),
              sub: "Customer Care is reachable",
            },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, padding: "1.1rem 1.25rem" }}>
              <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>{s.label}</div>
              <div style={{ marginBottom: 4, fontSize: 22, fontWeight: 500, letterSpacing: "-0.5px", color: "#141410" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#9a9a8e" }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Chat card ── */}
        <div style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>

          {/* Card header */}
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Super Admin avatar */}
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#141410", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>SA</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#141410" }}>POStore Support</div>
                <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 1 }}>Customer Care · typically replies within a few hours</div>
              </div>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 100, padding: "3px 10px", fontSize: 11, fontWeight: 500, color: "#16a34a" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#16a34a" }} />
              Active
            </div>
          </div>

          {/* Message thread */}
          <div style={{ minHeight: 320, maxHeight: "55vh", overflowY: "auto", padding: "1.25rem", display: "flex", flexDirection: "column", gap: 10, background: "#fafaf8" }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, gap: 10, color: "#9a9a8e", fontSize: 13 }}>
                <div style={{ width: 16, height: 16, border: "2px solid #e2e0d8", borderTopColor: "#141410", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                Loading messages…
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            ) : messages.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 12, padding: "2rem 0", color: "#9a9a8e" }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#c8c6bc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#4a4a40", marginBottom: 4 }}>No messages yet</div>
                  <div style={{ fontSize: 12 }}>Send the first message to get help from Super Admin.</div>
                </div>
              </div>
            ) : (
              messages.map(msg => {
                const isAdmin = msg.sender === "admin";
                return (
                  <div key={msg.id} className="msg-bubble" style={{ alignSelf: isAdmin ? "flex-end" : "flex-start", maxWidth: "78%", display: "flex", flexDirection: "column", gap: 4 }}>
                    {/* Sender label */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: isAdmin ? "flex-end" : "flex-start" }}>
                            <div style={{ fontSize: 10, fontWeight: 500, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.4px", paddingLeft: isAdmin ? 0 : 4, paddingRight: isAdmin ? 4 : 0, textAlign: isAdmin ? "right" : "left" }}>
                              {isAdmin ? "You" : "Super Admin"}
                            </div>
                            {msg.is_new ? <div style={{ background: "#ef4444", color: "#fff", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>New</div> : null}
                          </div>
                    {/* Bubble */}
                    <div style={{
                      padding: "10px 14px",
                      borderRadius: isAdmin ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      background: isAdmin ? "#141410" : "#fff",
                      color:      isAdmin ? "#fff"    : "#141410",
                      border:     isAdmin ? "none"    : "1px solid #e2e0d8",
                      fontSize: 13, lineHeight: 1.55, wordBreak: "break-word", whiteSpace: "pre-wrap",
                      boxShadow: isAdmin ? "0 2px 8px rgba(20,20,16,0.15)" : "0 1px 4px rgba(0,0,0,0.06)",
                    }}>
                      {msg.message}
                    </div>
                    {/* Timestamp */}
                    <div style={{ fontSize: 10, color: "#c8c6bc", textAlign: isAdmin ? "right" : "left", paddingLeft: isAdmin ? 0 : 4, paddingRight: isAdmin ? 4 : 0 }}>
                      {msg.time}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid #e2e0d8", background: "#fff", display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea
              className="msg-input"
              rows={2}
              placeholder="Write a message to Super Admin… (Enter to send, Shift+Enter for new line)"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKey}
              style={{
                flex: 1, resize: "none",
                border: "1px solid #c8c6bc", borderRadius: 10,
                padding: "9px 12px", fontSize: 13,
                fontFamily: "inherit", color: "#141410",
                background: "#f5f4f0", lineHeight: 1.5,
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
            />
            <button
              className="send-btn"
              onClick={send}
              disabled={sending || !text.trim()}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "10px 18px", flexShrink: 0,
                background: sending || !text.trim() ? "#9a9a8e" : "#141410",
                color: "#fff", border: "none", borderRadius: 9,
                fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                cursor: sending || !text.trim() ? "not-allowed" : "pointer",
                transition: "all 0.15s",
              }}
            >
              {sending ? (
                <>
                  <div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  Sending…
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  Send
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Help card ── */}
        <div style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, padding: "1.1rem 1.25rem", display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "#f5f4f0", border: "1px solid #e2e0d8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#4a4a40" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#141410", marginBottom: 4 }}>Need help faster?</div>
            <div style={{ fontSize: 12, color: "#9a9a8e", lineHeight: 1.6 }}>
              For urgent issues, include your store domain and admin ID in your message.
              Super Admin typically responds within a few hours during business hours (EAT).
            </div>
          </div>
        </div>

      </main>
    </>
  );
}