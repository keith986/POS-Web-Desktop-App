"use client";

import React, { useEffect, useRef, useState } from "react";

interface StaffSupportTabProps {
  staff: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    admin_id: string;
    shift_role: string | null;
    status: "active" | "inactive";
  };
}

interface SupportMessage {
  id: string;
  sender: "staff" | "admin" | "super_admin";
  message: string;
  title: string | null;
  time: string;
  is_new?: boolean;
}

const labelForSender: Record<string, string> = {
  staff: "You",
  admin: "Admin",
  super_admin: "Customer Care",
};

export default function StaffSupportTab({ staff }: StaffSupportTabProps) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const threadId = staff.id;

  useEffect(() => {
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    if (!threadId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/support?admin_id=${encodeURIComponent(threadId)}`);
      const body = await res.json();
      if (Array.isArray(body)) {
        setMessages(body.map((msg: any) => ({
          id: msg.id,
          sender: msg.sender,
          message: msg.message,
          title: msg.title,
          time: msg.time,
          is_new: msg.is_new,
        })));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 4200);
  };

  const sendMessage = async () => {
    if (!text.trim() || sending || !threadId) return;
    setSending(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_id: threadId,
          sender: "staff",
          title: "Support",
          message: text.trim(),
        }),
      });
      const body = await res.json();
      if (body.success) {
        const newMessage: SupportMessage = {
          id: body.id || `${Date.now()}`,
          sender: "staff",
          message: text.trim(),
          title: "Support",
          time: "just now",
        };
        setMessages(prev => [...prev, newMessage]);
        setText("");
        flash("Message sent to Admin and Customer Care.");
      } else {
        flash(body.error || "Failed to send message.");
      }
    } catch (error) {
      console.error(error);
      flash("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="support-shell">
      <div className="support-header">
        <div>
          <h2>Need help?</h2>
          <p>Chat with your Admin and Customer Care in one place.</p>
        </div>
        <button type="button" className="support-refresh" onClick={fetchMessages} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {notice && <div className="support-notice">{notice}</div>}

      <div className="support-messages">
        {loading && messages.length === 0 ? (
          <div className="support-empty">Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="support-empty">
            <strong>No conversation yet.</strong>
            <p>Send your first message and your Admin or Customer Care will reply here.</p>
          </div>
        ) : (
          messages.map(msg => {
            const isStaff = msg.sender === "staff";
            const senderLabel = labelForSender[msg.sender] || "Support";
            return (
              <div key={msg.id} className={`support-message ${isStaff ? "staff" : "agent"}`}>
                <div className="support-meta">
                  <span>{senderLabel}</span>
                  {msg.is_new ? <span className="support-badge">New</span> : null}
                </div>
                <div className="support-bubble">{msg.message}</div>
                <div className="support-time">{msg.time}</div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="support-input-row">
        <textarea
          className="support-input"
          placeholder="Type your message to Admin / Customer Care…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
        />
        <button type="button" className="support-send" onClick={sendMessage} disabled={!text.trim() || sending}>
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
