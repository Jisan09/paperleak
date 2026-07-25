const DATA_URL = "data/paper_leaks.csv";
const COLORS = ["#b9433f", "#2f6f9f", "#4f7d54", "#b8872f", "#257d7a", "#7357a6", "#7a6a55", "#d06f38"];
const STATUS_COLORS = {
  Confirmed: "#b9433f",
  Alleged: "#b8872f",
  Suspected: "#2f6f9f",
  Denied: "#62676f"
};

const stateMeta = {
  "Andaman & Nicobar Islands": { code: "IN-AN", label: "Andaman and Nicobar Islands" },
  "Andhra Pradesh": { code: "IN-AP", label: "Andhra Pradesh" },
  "Arunachal Pradesh": { code: "IN-AR", label: "Arunachal Pradesh" },
  Assam: { code: "IN-AS", label: "Assam" },
  Bihar: { code: "IN-BR", label: "Bihar" },
  Chandigarh: { code: "IN-CH", label: "Chandigarh" },
  Chhattisgarh: { code: "IN-CT", label: "Chhattisgarh" },
  "Dadra and Nagar Haveli": { code: "IN-DN", label: "Dadra and Nagar Haveli" },
  "Daman and Diu": { code: "IN-DD", label: "Daman and Diu" },
  Delhi: { code: "IN-DL", label: "Delhi" },
  Goa: { code: "IN-GA", label: "Goa" },
  Gujarat: { code: "IN-GJ", label: "Gujarat" },
  Haryana: { code: "IN-HR", label: "Haryana" },
  "Himachal Pradesh": { code: "IN-HP", label: "Himachal Pradesh" },
  "Jammu & Kashmir": { code: "IN-JK", label: "Jammu and Kashmir" },
  Jharkhand: { code: "IN-JH", label: "Jharkhand" },
  Karnataka: { code: "IN-KA", label: "Karnataka" },
  Kerala: { code: "IN-KL", label: "Kerala" },
  Lakshadweep: { code: "IN-LD", label: "Lakshadweep" },
  "Madhya Pradesh": { code: "IN-MP", label: "Madhya Pradesh" },
  Maharashtra: { code: "IN-MH", label: "Maharashtra" },
  Manipur: { code: "IN-MN", label: "Manipur" },
  Meghalaya: { code: "IN-ML", label: "Meghalaya" },
  Mizoram: { code: "IN-MZ", label: "Mizoram" },
  Nagaland: { code: "IN-NL", label: "Nagaland" },
  Odisha: { code: "IN-OR", label: "Odisha" },
  Puducherry: { code: "IN-PY", label: "Puducherry" },
  Punjab: { code: "IN-PB", label: "Punjab" },
  Rajasthan: { code: "IN-RJ", label: "Rajasthan" },
  Sikkim: { code: "IN-SK", label: "Sikkim" },
  "Tamil Nadu": { code: "IN-TN", label: "Tamil Nadu" },
  Telangana: { code: "IN-TG", label: "Telangana" },
  Tripura: { code: "IN-TR", label: "Tripura" },
  Uttarakhand: { code: "IN-UT", label: "Uttarakhand" },
  "Uttar Pradesh": { code: "IN-UP", label: "Uttar Pradesh" },
  "West Bengal": { code: "IN-WB", label: "West Bengal" }
};

let allRows = [];
let filteredRows = [];
let googleChartsReady = false;
let googleChartsUnavailable = false;
const codeToState = Object.fromEntries(Object.entries(stateMeta).map(([state, meta]) => [meta.code, state]));

const els = {
  search: document.getElementById("searchInput"),
  era: document.getElementById("eraFilter"),
  year: document.getElementById("yearFilter"),
  status: document.getElementById("statusFilter"),
  body: document.getElementById("bodyFilter"),
  state: document.getElementById("stateFilter"),
  action: document.getElementById("actionFilter"),
  confidence: document.getElementById("confidenceFilter"),
  reset: document.getElementById("resetFilters"),
  export: document.getElementById("exportCsv"),
  tooltip: document.getElementById("tooltip")
};

if (window.google && google.charts) {
  google.charts.load("current", { packages: ["geochart"] });
  google.charts.setOnLoadCallback(drawVisualization);
} else {
  googleChartsUnavailable = true;
}

fetch(DATA_URL)
  .then((response) => response.text())
  .then((csv) => {
    allRows = parseCsv(csv).map(normalizeRow);
    filteredRows = [...allRows];
    setupFilters();
    bindEvents();
    render();
  })
  .catch((error) => {
    document.body.innerHTML = `<main><section class="panel empty">Could not load ${DATA_URL}: ${error.message}</section></main>`;
  });

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (quoted && char === '"' && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const headers = rows.shift();
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function normalizeRow(row) {
  const date = new Date(`${row.date}T00:00:00`);
  return {
    ...row,
    year: date.getFullYear(),
    normalizedState: normalizeState(row.area),
    actionParts: splitActions(row.action_taken),
    arrestsNum: toNumber(row.arrests),
    convictionsNum: toNumber(row.convictions),
    affectedNum: toNumber(row.aspirants_affected),
    deathsNum: toNumber(row.linked_deaths)
  };
}

function normalizeState(area) {
  const base = area.replace(/\s*\(.+?\)/g, "").trim();
  if (base.includes("All India")) return "All India";
  if (base.includes("Bihar")) return "Bihar";
  if (base.includes("Jharkhand")) return "Jharkhand";
  if (base.includes("Uttar Pradesh")) return "Uttar Pradesh";
  if (base.includes("Uttarakhand")) return "Uttarakhand";
  if (base.includes("Rajasthan")) return "Rajasthan";
  if (base.includes("Punjab")) return "Punjab";
  if (base.includes("Haryana")) return "Haryana";
  if (base.includes("Delhi")) return "Delhi";
  if (base.includes("Tamil Nadu")) return "Tamil Nadu";
  if (base.includes("Andaman")) return "Andaman & Nicobar Islands";
  return base;
}

function toNumber(value) {
  const cleaned = String(value || "").replace(/[^0-9.]/g, "");
  return cleaned ? Number(cleaned) : 0;
}

function setupFilters() {
  fillSelect(els.era, "All eras", unique(allRows.map((row) => row.era)));
  fillSelect(els.year, "All years", unique(allRows.map((row) => String(row.year))).sort());
  fillSelect(els.status, "All statuses", unique(allRows.map((row) => row.leak_status)));
  fillSelect(els.body, "All body types", unique(allRows.map((row) => row.body_type)));
  fillSelect(els.state, "All states / areas", unique(allRows.map((row) => row.normalizedState)).sort());
  fillSelect(els.action, "All actions", unique(allRows.flatMap((row) => row.actionParts)).sort());
  fillSelect(els.confidence, "All confidence", unique(allRows.map((row) => row.confidence)));
}

function fillSelect(select, allLabel, values) {
  select.innerHTML = [`<option value="">${allLabel}</option>`, ...values.map((value) => `<option>${escapeHtml(value)}</option>`)].join("");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function bindEvents() {
  [els.search, els.era, els.year, els.status, els.body, els.state, els.action, els.confidence].forEach((el) => el.addEventListener("input", applyFilters));
  els.reset.addEventListener("click", () => {
    els.search.value = "";
    els.era.value = "";
    els.year.value = "";
    els.status.value = "";
    els.body.value = "";
    els.state.value = "";
    els.action.value = "";
    els.confidence.value = "";
    applyFilters();
  });
  els.export.addEventListener("click", exportFilteredCsv);
  window.addEventListener("resize", debounce(render, 120));
}

function applyFilters() {
  const term = els.search.value.trim().toLowerCase();
  filteredRows = allRows.filter((row) => {
    const haystack = [row.exam_name, row.conducting_body, row.area, row.action_taken, row.note, row.source_name].join(" ").toLowerCase();
    return (!term || haystack.includes(term)) &&
      (!els.era.value || row.era === els.era.value) &&
      (!els.year.value || String(row.year) === els.year.value) &&
      (!els.status.value || row.leak_status === els.status.value) &&
      (!els.body.value || row.body_type === els.body.value) &&
      (!els.state.value || row.normalizedState === els.state.value) &&
      (!els.action.value || row.actionParts.includes(els.action.value)) &&
      (!els.confidence.value || row.confidence === els.confidence.value);
  });
  render();
}

function render() {
  renderKpis();
  renderYearChart();
  renderDonut("statusChart", countBy(filteredRows, "leak_status"), STATUS_COLORS, "status");
  renderMap();
  renderStateBars();
  renderRankedBars("bodyChart", countBy(filteredRows, "body_type"), 4, "#4f7d54", "body");
  renderRankedBars("eraChart", countBy(filteredRows, "era"), 4, "#b8872f", "era");
  renderRankedBars("confidenceChart", countBy(filteredRows, "confidence"), 4, "#257d7a", "confidence");
  renderRankedBars("actionChart", actionCounts(filteredRows), Number.POSITIVE_INFINITY, "#b9433f", "action");
  renderAffectedYearChart();
  renderRankedBars("bodyNameChart", countBy(filteredRows, "conducting_body"), Number.POSITIVE_INFINITY, "#7357a6", "search");
  renderRankedBars("arrestsStateChart", sumBy(filteredRows, "normalizedState", "arrestsNum"), Number.POSITIVE_INFINITY, "#b8872f", "state");
  renderRankedBars("affectedStateChart", sumBy(filteredRows, "normalizedState", "affectedNum"), Number.POSITIVE_INFINITY, "#4f7d54", "state");
  renderTable();
}

function drawVisualization() {
  googleChartsReady = true;
  if (filteredRows.length) renderMap();
}

function renderKpis() {
  setText("kpiIncidents", formatNumber(filteredRows.length));
  setText("kpiConfirmed", formatNumber(filteredRows.filter((row) => row.leak_status === "Confirmed").length));
  setText("kpiArrests", formatNumber(sum(filteredRows, "arrestsNum")));
  setText("kpiAffected", formatNumber(sum(filteredRows, "affectedNum")));
  setText("kpiDeaths", formatNumber(sum(filteredRows, "deathsNum")));
  setText("recordCount", `Showing ${formatNumber(filteredRows.length)} of ${formatNumber(allRows.length)} records`);
  const years = filteredRows.map((row) => row.year);
  setText("lastUpdated", years.length ? `${Math.min(...years)}-${Math.max(...years)} | ${allRows.length} records` : "No records selected");
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + row[key], 0);
}

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    const value = row[key] || "Unknown";
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function sumBy(rows, key, metricKey) {
  return rows.reduce((counts, row) => {
    const value = row[key] || "Unknown";
    counts[value] = (counts[value] || 0) + row[metricKey];
    return counts;
  }, {});
}

function actionCounts(rows) {
  return rows.reduce((counts, row) => {
    row.actionParts.forEach((action) => {
      counts[action] = (counts[action] || 0) + 1;
    });
    return counts;
  }, {});
}

function splitActions(value) {
  return String(value || "").split("+").map((part) => part.trim()).filter(Boolean);
}

function renderYearChart() {
  const el = document.getElementById("yearChart");
  const counts = countBy(filteredRows, "year");
  const years = Array.from({ length: 2026 - 2004 + 1 }, (_, index) => 2004 + index);
  const data = years.map((year) => ({ label: String(year), value: counts[year] || 0 }));
  renderVerticalBars(el, data, "#b9433f", "year", "incidents");
  renderYearSelection(counts);
}

function renderYearSelection(counts) {
  const el = document.getElementById("yearSelection");
  if (!els.year.value) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.textContent = `${els.year.value}: ${formatNumber(counts[els.year.value] || 0)} incidents`;
}

function renderAffectedYearChart() {
  const el = document.getElementById("affectedYearChart");
  const counts = sumBy(filteredRows, "year", "affectedNum");
  const years = Array.from({ length: 2026 - 2004 + 1 }, (_, index) => 2004 + index);
  const data = years.map((year) => ({ label: String(year), value: counts[year] || 0 }));
  renderVerticalBars(el, data, "#4f7d54", "year", "affected aspirants");
}

function renderVerticalBars(el, data, color, filterField, metricLabel) {
  const { width, height } = dimensions(el, 760, 330);
  const margin = { top: 18, right: 14, bottom: 44, left: 36 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = innerW / data.length;
  const ticks = [0, Math.ceil(max / 2), max];

  el.innerHTML = `<svg viewBox="0 0 ${width} ${height}">
    ${ticks.map((tick) => {
      const y = margin.top + innerH - (tick / max) * innerH;
      return `<line class="grid-line" x1="${margin.left}" x2="${width - margin.right}" y1="${y}" y2="${y}"></line>
        <text class="axis" x="4" y="${y + 4}">${formatCompact(tick)}</text>`;
    }).join("")}
    ${data.map((d, i) => {
      const h = (d.value / max) * innerH;
      const x = margin.left + i * barW + 2;
      const y = margin.top + innerH - h;
      const label = Number(d.label) % 2 === 0 ? d.label.slice(2) : "";
      return `<rect class="bar" x="${x}" y="${y}" width="${Math.max(3, barW - 4)}" height="${h}" fill="${color}" data-tip="${d.label}: ${formatNumber(d.value)} ${metricLabel}" data-filter-field="${filterField}" data-filter-value="${escapeHtml(d.label)}"></rect>
        <text class="axis" text-anchor="middle" x="${x + barW / 2}" y="${height - 18}">${label}</text>`;
    }).join("")}
  </svg>`;
  attachTips(el);
  attachChartFilters(el);
}

function renderDonut(id, counts, colorMap = {}, filterField) {
  const el = document.getElementById(id);
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return empty(el);
  const { width } = dimensions(el, 360, 280);
  const isNarrow = width < 440;
  const height = isNarrow ? 165 : 205;
  const cx = width / 2;
  const cy = isNarrow ? 86 : 118;
  const radius = isNarrow ? 64 : 82;
  const stroke = isNarrow ? 22 : 28;
  const total = entries.reduce((t, [, value]) => t + value, 0);
  let offset = 0;
  const circumference = 2 * Math.PI * radius;
  const slices = entries.map(([label, value], index) => {
    const length = (value / total) * circumference;
    const dash = `${length} ${circumference - length}`;
    const circle = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${colorMap[label] || COLORS[index % COLORS.length]}" stroke-width="${stroke}" stroke-dasharray="${dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" data-tip="${label}: ${value}" data-filter-field="${filterField}" data-filter-value="${escapeHtml(label)}"></circle>`;
    offset += length;
    return circle;
  }).join("");
  el.style.height = isNarrow ? "auto" : "";
  el.innerHTML = `<svg viewBox="0 0 ${width} ${height}">
    ${slices}
    <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="26" font-weight="800">${total}</text>
    <text x="${cx}" y="${cy + 20}" text-anchor="middle" class="axis">records</text>
  </svg>
  <div class="donut-legend">
    ${entries.map(([label, value], index) => `
      <button type="button" class="donut-legend-item" data-filter-field="${filterField}" data-filter-value="${escapeHtml(label)}">
        <span style="background:${colorMap[label] || COLORS[index % COLORS.length]}"></span>
        <strong>${escapeHtml(label)}</strong>
        <em>${formatNumber(value)}</em>
      </button>
    `).join("")}
  </div>`;
  attachTips(el);
  attachChartFilters(el);
}

function renderRankedBars(id, counts, limit, color, filterField) {
  const el = document.getElementById(id);
  const data = Object.entries(counts)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
  if (!data.length) return empty(el);
  const isCompact = Boolean(el.closest(".compact"));
  const { width } = dimensions(el, 430, 280);
  const isNarrow = width < 440;
  const isMobileViewport = window.innerWidth <= 720;
  const isScrollableListChart = ["bodyNameChart", "actionChart", "arrestsStateChart", "affectedStateChart"].includes(id);
  const rowH = isNarrow ? 46 : isCompact ? 28 : 25;
  const height = isCompact ? Math.max(96, data.length * rowH + 24) : Math.max(230, data.length * rowH + 36);
  const isBodyNameChart = id === "bodyNameChart";
  const labelW = isNarrow ? 0 : isBodyNameChart ? Math.min(420, width * 0.58) : isCompact ? Math.min(150, width * 0.42) : Math.min(190, width * 0.48);
  const labelLimit = isNarrow ? Math.max(24, Math.floor(width / 8)) : isBodyNameChart ? 62 : 27;
  const max = Math.max(...data.map((d) => d.value), 1);

  if (isNarrow || isBodyNameChart) {
    el.style.height = isScrollableListChart && !isMobileViewport ? "" : "auto";
    el.innerHTML = `<div class="mobile-bar-list">
      ${data.map((d) => {
        const w = (100 * d.value) / max;
        return `<div class="mobile-bar-row" data-tip="${escapeHtml(d.label)}: ${formatNumber(d.value)}" data-filter-field="${filterField}" data-filter-value="${escapeHtml(d.label)}">
          <div class="mobile-bar-head">
            <span>${escapeHtml(d.label)}</span>
            <strong>${formatCompact(d.value)}</strong>
          </div>
          <div class="mobile-bar-track">
            <div class="mobile-bar-fill" style="width:${w}%; background:${color}"></div>
          </div>
        </div>`;
      }).join("")}
    </div>`;
    attachTips(el);
    attachChartFilters(el);
    return;
  }

  el.style.height = `${height}px`;
  el.innerHTML = `<svg viewBox="0 0 ${width} ${height}">
    ${data.map((d, i) => {
      const y = (isCompact ? 14 : 24) + i * rowH;
      if (isNarrow) {
        const barY = y + 18;
        const barMaxW = width - 46;
        const w = (barMaxW * d.value) / max;
        return `<text class="bar-label mobile-label" x="0" y="${y + 9}">${escapeHtml(truncate(d.label, labelLimit))}</text>
          <rect class="bar" x="0" y="${barY}" width="${w}" height="16" fill="${color}" data-tip="${escapeHtml(d.label)}: ${formatNumber(d.value)}" data-filter-field="${filterField}" data-filter-value="${escapeHtml(d.label)}"></rect>
          <text class="bar-label" x="${w + 7}" y="${barY + 12}">${formatCompact(d.value)}</text>`;
      }
      const w = ((width - labelW - 48) * d.value) / max;
      return `<text class="bar-label" x="0" y="${y + 13}">${escapeHtml(truncate(d.label, labelLimit))}</text>
        <rect class="bar" x="${labelW}" y="${y}" width="${w}" height="17" fill="${color}" data-tip="${escapeHtml(d.label)}: ${formatNumber(d.value)}" data-filter-field="${filterField}" data-filter-value="${escapeHtml(d.label)}"></rect>
        <text class="bar-label" x="${labelW + w + 7}" y="${y + 13}">${formatCompact(d.value)}</text>`;
    }).join("")}
  </svg>`;
  attachTips(el);
  attachChartFilters(el);
}

function renderStateBars() {
  const counts = countBy(filteredRows, "normalizedState");
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  setText("stateBarsTotal", `Total: ${formatNumber(total)}`);
  renderRankedBars("stateBars", counts, Number.POSITIVE_INFINITY, "#2f6f9f", "state");
}

function renderMap() {
  const el = document.getElementById("indiaMap");
  const counts = countBy(filteredRows, "normalizedState");
  const nationalCount = counts["All India"] || 0;
  document.getElementById("mapNationalCount").textContent = `All India: ${formatNumber(nationalCount)}`;

  if (googleChartsUnavailable) {
    el.innerHTML = `<div class="empty">Google GeoChart could not load. Check the browser internet connection.</div>`;
    return;
  }

  if (!googleChartsReady || !window.google || !google.visualization) {
    el.innerHTML = `<div class="empty">Loading Google GeoChart...</div>`;
    return;
  }

  const rows = Object.entries(stateMeta)
    .map(([state, meta]) => [meta.code, meta.label, counts[state] || null]);

  if (!rows.length) return empty(el);

  const data = google.visualization.arrayToDataTable([
    ["State Code", "State", "Incidents"],
    ...rows
  ]);
  const { width } = dimensions(el, 680, 520);
  const height = window.innerWidth <= 720 ? Math.max(380, Math.min(420, Math.round(width * 1.08))) : 520;
  const options = {
    region: "IN",
    domain: "IN",
    displayMode: "regions",
    resolution: "provinces",
    colorAxis: { minValue: 1, colors: ["#e5ef88", "#d4b114", "#e85a03", "#b9433f"] },
    backgroundColor: "transparent",
    datalessRegionColor: "transparent",
    defaultColor: "#ffffff",
    tooltip: { textStyle: { color: "#202124", fontSize: 13 } },
    legend: { textStyle: { color: "#62676f", fontSize: 12 } },
    width,
    height
  };

  const geochart = new google.visualization.GeoChart(el);
  google.visualization.events.addListener(geochart, "ready", () => cleanMapGeography(el));
  google.visualization.events.addListener(geochart, "select", () => {
    const selection = geochart.getSelection()[0];
    if (!selection) return;
    const state = codeToState[data.getValue(selection.row, 0)];
    if (state) applyChartFilter("state", state);
  });
  geochart.draw(data, options);
}

function cleanMapGeography(container) {
  container.querySelectorAll("svg path, svg polygon").forEach((shape) => {
    const fill = (shape.getAttribute("fill") || "").toLowerCase();
    const fillOpacity = shape.getAttribute("fill-opacity");
    if (fill === "transparent" || fill === "none" || fillOpacity === "0") {
      shape.setAttribute("stroke", "transparent");
      shape.setAttribute("opacity", "0");
      shape.style.pointerEvents = "none";
    } else {
      shape.setAttribute("stroke", "#111111");
      shape.setAttribute("stroke-width", "0.85");
    }
  });
}

function renderTable() {
  const rows = filteredRows.slice().sort((a, b) => b.date.localeCompare(a.date));
  document.getElementById("recordsBody").innerHTML = rows.map((row) => `
    <tr>
      <td>${row.date}</td>
      <td>${escapeHtml(row.exam_name)}<br><span class="muted">${escapeHtml(row.conducting_body)}</span></td>
      <td>${escapeHtml(row.area)}</td>
      <td><span class="pill" style="background:${STATUS_COLORS[row.leak_status] || "#62676f"}">${escapeHtml(row.leak_status)}</span></td>
      <td>${escapeHtml(row.action_taken)}</td>
      <td>${row.arrests || ""}</td>
      <td>${row.aspirants_affected || ""}</td>
      <td><a href="${row.source_url}" target="_blank" rel="noreferrer">${escapeHtml(row.source_name)}</a><br><span class="muted">${escapeHtml(row.confidence)}</span></td>
    </tr>
  `).join("");
}

function exportFilteredCsv() {
  const headers = Object.keys(allRows[0]).filter((key) => !["year", "normalizedState", "arrestsNum", "convictionsNum", "affectedNum", "deathsNum"].includes(key));
  const lines = [headers.join(","), ...filteredRows.map((row) => headers.map((key) => csvCell(row[key])).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "filtered-paper-leaks.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value || "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function dimensions(el, fallbackW, fallbackH) {
  const rect = el.getBoundingClientRect();
  return { width: Math.max(260, Math.round(rect.width || fallbackW)), height: Math.max(fallbackH, Math.round(rect.height || fallbackH)) };
}

function empty(el) {
  el.innerHTML = `<div class="empty">No records match the current filters.</div>`;
}

function scaleColor(value, max) {
  const t = value / Math.max(1, max);
  if (t > 0.72) return "#b9433f";
  if (t > 0.42) return "#d06f38";
  if (t > 0.2) return "#e6b35f";
  return "#4f7d54";
}

function truncate(value, length) {
  return value.length > length ? `${value.slice(0, length - 1)}...` : value;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatCompact(value) {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function attachTips(container) {
  container.querySelectorAll("[data-tip]").forEach((node) => {
    node.addEventListener("pointermove", (event) => showTip(event, node.dataset.tip));
    node.addEventListener("pointerleave", hideTip);
  });
}

function attachChartFilters(container) {
  container.querySelectorAll("[data-filter-field]").forEach((node) => {
    node.addEventListener("click", () => {
      if (node.dataset.filterField === "state-year") {
        els.state.value = node.dataset.filterState || "";
        els.year.value = node.dataset.filterYear;
        applyFilters();
        return;
      }
      applyChartFilter(node.dataset.filterField, node.dataset.filterValue);
    });
  });
}

function applyChartFilter(field, value) {
  if (!value) return;
  if (field === "search") {
    els.search.value = value;
    applyFilters();
    return;
  }
  if (!els[field]) return;
  els[field].value = value;
  applyFilters();
}

function showTip(event, text) {
  els.tooltip.hidden = false;
  els.tooltip.innerHTML = text;
  els.tooltip.style.left = `${Math.min(window.innerWidth - 300, event.clientX + 14)}px`;
  els.tooltip.style.top = `${event.clientY + 14}px`;
}

function hideTip() {
  els.tooltip.hidden = true;
}

function debounce(fn, wait) {
  let timer;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, wait);
  };
}
