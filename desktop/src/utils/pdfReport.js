import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const MARGIN = 40;
const PAGE_W = 595.28; // A4 pt, portrait
const CONTENT_W = PAGE_W - MARGIN * 2;

/**
 * Build a PDF made of a title, optional subtitle, and an ordered list of sections.
 * Each section is one of:
 *   { type: "table", title, head: [...], body: [[...]] }
 *   { type: "chart", title, image: dataUrl, height }
 *   { type: "text", title, lines: ["..."] }
 *   { type: "stats", items: [{ label, value }] }
 */
export function buildPdfReport({ title, subtitle, sections = [], filename }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = MARGIN;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text(title, MARGIN, y);
  y += 22;

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(subtitle, MARGIN, y);
    y += 20;
  }

  doc.setDrawColor(230, 230, 230);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 20;

  const ensureSpace = (needed) => {
    if (y + needed > 800) {
      doc.addPage();
      y = MARGIN;
    }
  };

  sections.forEach((section) => {
    if (section.title) {
      ensureSpace(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text(section.title, MARGIN, y);
      y += 16;
    }

    if (section.type === "stats") {
      ensureSpace(50);
      const boxW = CONTENT_W / section.items.length;
      section.items.forEach((item, i) => {
        const x = MARGIN + i * boxW;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(232, 93, 47);
        doc.text(String(item.value), x, y + 16);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text(item.label, x, y + 30);
      });
      y += 50;
    }

    if (section.type === "chart") {
      const h = section.height || 220;
      ensureSpace(h + 20);
      doc.addImage(section.image, "PNG", MARGIN, y, CONTENT_W, h);
      y += h + 20;
    }

    if (section.type === "text") {
      ensureSpace(section.lines.length * 14 + 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      section.lines.forEach((line) => {
        doc.text(line, MARGIN, y);
        y += 14;
      });
      y += 6;
    }

    if (section.type === "table") {
      ensureSpace(60);
      autoTable(doc, {
        startY: y,
        head: [section.head],
        body: section.body,
        margin: { left: MARGIN, right: MARGIN },
        styles: { fontSize: 8.5, cellPadding: 5, textColor: [50, 50, 50] },
        headStyles: { fillColor: [232, 93, 47], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 247, 244] },
      });
      y = doc.lastAutoTable.finalY + 24;
    }
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(`Generated ${new Date().toLocaleString()}`, MARGIN, 820);
    doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN - 60, 820);
  }

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
