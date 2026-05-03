'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'

export default function TenantPage() {
  const params = useParams()
  const tenant = params.tenant as string

  useEffect(() => {

    /* ── 1. Check for ?session= param (coming fresh from login page) ── */
    const urlParams    = new URLSearchParams(window.location.search);
    const sessionParam = urlParams.get('session');

    if (sessionParam) {
      try {
        const user = JSON.parse(decodeURIComponent(sessionParam));

        /* Clean the URL immediately */
        window.history.replaceState({}, '', window.location.pathname);

        /* Seed this subdomain's localStorage */
        localStorage.setItem('user', JSON.stringify(user));

        /* Redirect straight to dashboard with session param
           so dashboard can also seed its localStorage */
        const encoded = encodeURIComponent(JSON.stringify(user));
        const dest    = user.role === 'staff' ? 'staff' : 'admin';
        window.location.href = `/${dest}/dashboard?session=${encoded}`;
        return;
      } catch {
        localStorage.removeItem('user');
        window.location.href = 'https://pos.upendoapps.com';
        return;
      }
    }

    /* ── 2. Returning user — read localStorage ── */
    const stored = localStorage.getItem('user');

    if (!stored) {
      window.location.href = 'https://pos.upendoapps.com';
      return;
    }

    let user: Record<string, string>;
    try {
      user = JSON.parse(stored);
    } catch {
      localStorage.removeItem('user');
      window.location.href = 'https://pos.upendoapps.com';
      return;
    }

    /* Wrong subdomain for this user */
    if (user.domain !== tenant) {
      window.location.href = user.domain
        ? `https://${user.domain}.upendoapps.com`
        : 'https://pos.upendoapps.com';
      return;
    }

    /* ── 3. Verify session + fetch plan from server ── */
    fetch('/api/auth/verify-session', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user_id: user.id, role: user.role }),
    })
      .then(r => r.json())
      .then(data => {
        if (!data.valid) {
          localStorage.removeItem('user');
          localStorage.removeItem('read_notifs');
          window.location.href = 'https://pos.upendoapps.com?unauthorized=true';
          return;
        }

        if (data.payment_status !== 'active') {
          localStorage.removeItem('user');
          localStorage.removeItem('read_notifs');
          window.location.href = 'https://pos.upendoapps.com?unpaid=true';
          return;
        }

        /* ✅ Merge plan returned by server into user object */
        const userWithPlan = {
          ...user,
          role: user.role,
          plan: data.plan ?? user.plan ?? 'starter',
        };

        /* Update localStorage with latest plan */
        localStorage.setItem('user', JSON.stringify(userWithPlan));

        /* Pass to dashboard via session param */
        const encoded = encodeURIComponent(JSON.stringify(userWithPlan));
        const dest    = (userWithPlan.role as string) === 'staff' ? 'staff' : 'admin';
        window.location.href = `/${dest}/dashboard?session=${encoded}`;
      })
      .catch(() => {
        /* Network error — allow through with whatever plan we have */
        const userWithPlan = {
          ...user,
          role: user.role,
          plan: user.plan ?? 'starter',
        };
        const encoded = encodeURIComponent(JSON.stringify(userWithPlan));
        const dest    = (userWithPlan.role as string) === 'staff' ? 'staff' : 'admin';
        window.location.href = `/${dest}/dashboard?session=${encoded}`;
      });

  }, [tenant]);

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      height:         '100vh',
      fontFamily:     "'DM Sans', sans-serif",
      gap:            14,
    }}>
      <div style={{
        width:          44,
        height:         44,
        background:     '#141410',
        borderRadius:   10,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        color:          '#fff',
        fontSize:       18,
        fontWeight:     500,
      }}>
        P
      </div>
      <div style={{
        width:       20,
        height:      20,
        border:      '2px solid #e2e0d8',
        borderTopColor: '#141410',
        borderRadius: '50%',
        animation:   'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ fontSize: 14, color: '#9a9a8e' }}>Loading your store…</p>
    </div>
  );
}