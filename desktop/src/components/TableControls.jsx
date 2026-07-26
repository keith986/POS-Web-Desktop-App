import React from "react";
import { ChevronUpIcon, ChevronDownIcon, ChevronsUpDownIcon, ChevronLeftIcon, ChevronRightIcon } from "./Icons";

/**
 * A clickable <th> that toggles asc/desc sort on a given key and shows
 * the current sort direction. Drop-in replacement for a plain <th>.
 */
export function SortTh({ label, sortKey, sort, onSort, style, ...rest }) {
  const active = sort?.key === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", ...style }}
      {...rest}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        {label}
        <span style={{ display: "inline-flex", opacity: active ? 1 : 0.35, color: active ? "var(--accent)" : "inherit" }}>
          {active ? (sort.dir === "asc" ? <ChevronUpIcon size={11} /> : <ChevronDownIcon size={11} />) : <ChevronsUpDownIcon size={11} />}
        </span>
      </span>
    </th>
  );
}

/** Generic multi-key sorter. accessor(row, key) may be supplied for computed columns. */
export function sortRows(rows, sort, accessor) {
  if (!sort?.key) return rows;
  const dir = sort.dir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    let av = accessor ? accessor(a, sort.key) : a[sort.key];
    let bv = accessor ? accessor(b, sort.key) : b[sort.key];
    if (av == null) av = "";
    if (bv == null) bv = "";
    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}

/** Toggle helper for sort state: click same key flips direction, new key starts asc. */
export function toggleSort(sort, key) {
  if (sort?.key === key) {
    return { key, dir: sort.dir === "asc" ? "desc" : "asc" };
  }
  return { key, dir: "asc" };
}

/**
 * Pagination bar with page-size selector, prev/next, and numbered pages.
 * Renders nothing when there is nothing to page through.
 */
export function Pagination({ page, pageSize, totalItems, onPageChange, onPageSizeChange, pageSizeOptions = [5, 10, 25, 50] }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const clampedPage = Math.min(Math.max(1, page), totalPages);
  if (totalItems === 0) return null;

  const start = (clampedPage - 1) * pageSize + 1;
  const end = Math.min(clampedPage * pageSize, totalItems);

  const pageNumbers = [];
  const windowSize = 1;
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= clampedPage - windowSize && p <= clampedPage + windowSize)) {
      pageNumbers.push(p);
    } else if (pageNumbers[pageNumbers.length - 1] !== "…") {
      pageNumbers.push("…");
    }
  }

  return (
    <div className="pagination">
      <div className="pagination-info">
        Showing <strong>{start}</strong>–<strong>{end}</strong> of <strong>{totalItems}</strong>
      </div>
      <div className="pagination-controls">
        {onPageSizeChange && (
          <select
            className="pagination-size"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        )}
        <button
          type="button"
          className="pagination-btn"
          disabled={clampedPage <= 1}
          onClick={() => onPageChange(clampedPage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeftIcon size={13} />
        </button>
        {pageNumbers.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
          ) : (
            <button
              type="button"
              key={p}
              className={`pagination-btn ${p === clampedPage ? "pagination-btn-active" : ""}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          className="pagination-btn"
          disabled={clampedPage >= totalPages}
          onClick={() => onPageChange(clampedPage + 1)}
          aria-label="Next page"
        >
          <ChevronRightIcon size={13} />
        </button>
      </div>
    </div>
  );
}

/** A <select> styled to match the app's search/filter inputs. */
export function FilterSelect({ value, onChange, options, style, ...rest }) {
  return (
    <select className="filter-select" value={value} onChange={(e) => onChange(e.target.value)} style={style} {...rest}>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}
