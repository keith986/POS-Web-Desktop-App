"use client";

import React, { useEffect, useState } from "react";

interface SupportMessage {
  id: string;
  sender: "admin" | "super_admin";
  message: string;
  title: string | null;
  time: string;
}

export default function AdminSupportPage() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("user");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      setAdminId(parsed?.id ?? null);
    } catch {
      setAdminId(null);
    }
  }, []);

  const fetchMessages = async () => {
    if (!adminId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/support?admin_id=${encodeURIComponent(adminId)}`);
      const body = await res.json();
      if (Array.isArray(body)) setMessages(body);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchMessages(); }, [adminId]);

  const send = async () => {
    if (!adminId || !text.trim()) return;
    const payload = { admin_id: adminId, sender: "admin", message: text.trim(), title: "Support" };
    try {
      const res = await fetch('/api/support', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (body.success) {
        setText("");
        setMessages(prev => [...prev, { id: body.id || Date.now().toString(), sender: 'admin', message: payload.message, title: payload.title, time: 'just now' }]);
      } else {
        alert(body.error || 'Send failed');
      }
    } catch (err) {
      console.error(err);
      alert('Send failed');
    }
  };

  if (!adminId) return (<div style={{ padding: 24 }}>Please login as admin to use Support.</div>);

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Support Chat</h2>
          <div style={{ color: '#6b7280', fontSize: 13 }}>Send messages to Super Admin and see replies here.</div>
        </div>
        <button onClick={fetchMessages} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}>Refresh</button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, minHeight: 260, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ padding: 24, color: '#9ca3af' }}>Loading messages…</div>
        ) : messages.length === 0 ? (
          <div style={{ padding: 24, color: '#9ca3af' }}>No messages yet — send the first message.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ alignSelf: msg.sender === 'admin' ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: 12, borderRadius: 14, background: msg.sender === 'admin' ? '#dbeafe' : '#f3f4f6', color: '#111827' }}>
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.message}</div>
                <div style={{ marginTop: 6, fontSize: 11, color: '#6b7280' }}>{msg.time}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Write a message to Super Admin..." style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', minHeight: 46 }} />
        <button onClick={send} style={{ padding: '12px 18px', background: '#d4522a', color: '#fff', border: 'none', borderRadius: 8 }}>Send</button>
      </div>
    </div>
  );
}
