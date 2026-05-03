"use client";

import React, { useState } from "react";

/*
  ─────────────────────────────────────────────────────
  WeeklyRevenueChart — drop-in SVG bar chart

  Replace this block in AdminDashboard:
  ┌─────────────────────────────────────────────────┐
  │  <div style={{ padding: "1.25rem" }}>           │
  │    {weeklyRevenue.length === 0 ? ...            │
  │     : (                                          │
  │      <div style={{ display:"flex", ...height:140│
  │        {weeklyRevenue.map(...)}                  │
  │      </div>                                      │
  │    )}                                            │
  │  </div>                                          │
  └─────────────────────────────────────────────────┘

  With:
    <WeeklyRevenueChart data={data.weekly_revenue} formatCurrency={usd} />
  ─────────────────────────────────────────────────────
*/

interface WeeklyBar {
  day:     string;
  revenue: number;
}

interface Props {
  data:           WeeklyBar[];
  formatCurrency: (n: number) => string;
}

export default function WeeklyRevenueChart({ data, formatCurrency }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: "center", color: "#9a9a8e", fontSize: 13, padding: "2rem" }}>
        No revenue data this week.
      </div>
    );
  }

  /* ── Layout constants ── */
  const W         = 520;
  const H         = 200;
  const PAD_L     = 52;   // Y-axis labels
  const PAD_R     = 12;
  const PAD_T     = 20;
  const PAD_B     = 36;   // X-axis labels
  const chartW    = W - PAD_L - PAD_R;
  const chartH    = H - PAD_T - PAD_B;

  const maxVal    = Math.max(...data.map(d => d.revenue), 1);
  const gap       = 10;
  const barW      = (chartW - gap * (data.length - 1)) / data.length;
  const todayIdx  = data.length - 1;

  /* ── Y-axis ticks ── */
  const TICK_COUNT = 4;
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => {
    const frac = i / TICK_COUNT;
    return {
      value: maxVal * frac,
      y:     PAD_T + chartH - chartH * frac,
    };
  });

  /* ── Friendly Y label ── */
  const yLabel = (v: number) => {
    if (v === 0)      return "0";
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000)    return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
    return v.toFixed(0);
  };

  return (
    <div style={{ padding: "1.25rem" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: "block", overflow: "visible" }}
        aria-label="Weekly revenue bar chart"
      >
        {/* ── Grid lines + Y labels ── */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD_L}       y1={t.y}
              x2={W - PAD_R}   y2={t.y}
              stroke={i === 0 ? "#e2e0d8" : "#f0ede6"}
              strokeWidth="1"
            />
            <text
              x={PAD_L - 8} y={t.y + 4}
              textAnchor="end"
              fontSize="10"
              fill="#c8c6bc"
              fontFamily="inherit"
            >
              {yLabel(t.value)}
            </text>
          </g>
        ))}

        {/* ── Bars ── */}
        {data.map((d, i) => {
          const x      = PAD_L + i * (barW + gap);
          const barH   = Math.max((d.revenue / maxVal) * chartH, d.revenue > 0 ? 4 : 0);
          const y      = PAD_T + chartH - barH;
          const isToday = i === todayIdx;
          const isHov   = hovered === i;

          /* Colour: today = accent, hovered = mid, rest = light grey */
          const fill = isToday
            ? "#d4522a"
            : isHov
              ? "#ea7a52"
              : "#e2e0d8";

          return (
            <g key={d.day}>
              {/* Invisible full-height hit area */}
              <rect
                x={x}       y={PAD_T}
                width={barW} height={chartH}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />

              {/* Bar body */}
              <rect
                x={x}       y={y}
                width={barW} height={barH}
                rx="3"      ry="3"
                fill={fill}
                style={{ transition: "fill 0.12s, y 0.3s, height 0.3s" }}
              />

              {/* Value label above bar — always show today's, show others on hover */}
              {(isToday || isHov) && d.revenue > 0 && (
                <text
                  x={x + barW / 2}
                  y={Math.max(y - 6, PAD_T + 10)}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="600"
                  fill={isToday ? "#d4522a" : "#4a4a40"}
                  fontFamily="inherit"
                >
                  {formatCurrency(d.revenue)}
                </text>
              )}

              {/* Tooltip on hover (non-today) */}
              {isHov && !isToday && d.revenue > 0 && (
                <g>
                  <rect
                    x={x + barW / 2 - 38} y={y - 32}
                    width={76} height={21}
                    rx="6"
                    fill="#1e1e1a"
                    opacity="0.92"
                  />
                  {/* Tooltip arrow */}
                  <polygon
                    points={`${x + barW / 2 - 5},${y - 11} ${x + barW / 2 + 5},${y - 11} ${x + barW / 2},${y - 4}`}
                    fill="#1e1e1a"
                    opacity="0.92"
                  />
                  <text
                    x={x + barW / 2} y={y - 17}
                    textAnchor="middle"
                    fontSize="9" fill="#fff"
                    fontFamily="inherit"
                    fontWeight="500"
                  >
                    {formatCurrency(d.revenue)}
                  </text>
                </g>
              )}

              {/* X-axis label — today gets a dark pill */}
              {isToday ? (
                <g>
                  <rect
                    x={x + barW / 2 - 14}
                    y={PAD_T + chartH + 6}
                    width={28} height={16}
                    rx="8"
                    fill="#d4522a"
                  />
                  <text
                    x={x + barW / 2}
                    y={PAD_T + chartH + 18}
                    textAnchor="middle"
                    fontSize="9" fill="#fff"
                    fontFamily="inherit"
                    fontWeight="600"
                  >
                    {d.day}
                  </text>
                </g>
              ) : (
                <text
                  x={x + barW / 2}
                  y={PAD_T + chartH + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fill={isHov ? "#4a4a40" : "#9a9a8e"}
                  fontFamily="inherit"
                >
                  {d.day}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* ── Legend row ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8, paddingLeft: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9a9a8e" }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: "#141410" }} />
          Today
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9a9a8e" }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: "#e2e0d8" }} />
          Previous days
        </div>
      </div>
    </div>
  );
}