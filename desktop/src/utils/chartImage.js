import Chart from "chart.js/auto";

/**
 * Renders a Chart.js chart off-screen and resolves to a PNG data URL.
 * Used to embed bar/line/pie charts into generated PDF reports.
 */
export function renderChartImage({ type = "bar", labels, datasets, options = {}, width = 760, height = 360 }) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    // Chart.js needs the canvas attached to get correct devicePixelRatio behavior in some environments
    canvas.style.position = "fixed";
    canvas.style.left = "-9999px";
    document.body.appendChild(canvas);

    const chart = new Chart(canvas.getContext("2d"), {
      type,
      data: { labels, datasets },
      options: {
        responsive: false,
        animation: false,
        plugins: {
          legend: { display: datasets.length > 1, labels: { font: { size: 12 } } },
          title: { display: false },
        },
        scales: type === "pie" || type === "doughnut" ? {} : {
          y: { beginAtZero: true, ticks: { font: { size: 11 } } },
          x: { ticks: { font: { size: 11 } } },
        },
        ...options,
      },
    });

    // Give Chart.js a tick to finish its synchronous draw before exporting
    setTimeout(() => {
      const dataUrl = canvas.toDataURL("image/png", 1.0);
      chart.destroy();
      document.body.removeChild(canvas);
      resolve(dataUrl);
    }, 50);
  });
}

/** A palette of theme-consistent colors for chart series. */
export const CHART_COLORS = ["#e85d2f", "#6366f1", "#22c55e", "#3b82f6", "#f6a536", "#a855f7", "#06b6d4", "#ef4444"];
