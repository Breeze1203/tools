const samplePlan = `-> Aggregate: count(0)  (cost=38.4..38.4 rows=1) (actual time=0.743..0.743 rows=1 loops=1)
    -> Table scan on tt1  (cost=32.3..32.8 rows=56.2) (actual time=0.708..0.733 rows=59 loops=1)
        -> Union materialize with deduplication  (cost=32.3..32.3 rows=56.2) (actual time=0.7..0.7 rows=59 loops=1)
            -> Index lookup on crm_subject_service_follow_receipt using idx_tenant_subjectid (tenant_id=1827240738649612290, service_subject_id=202501022435769582)  (cost=0.35 rows=1) (actual time=0.00991..0.00991 rows=0 loops=1)
            -> Index lookup on crm_subject_service_follow_account using idx_tenant_subjectid (tenant_id=1827240738649612290, service_subject_id=202501022435769582)  (cost=12.6 rows=36) (actual time=0.0203..0.123 rows=36 loops=1)
            -> Index lookup on crm_subject_service_follow_declaration using idx_tenant_subjectid (service_subject_id=202501022435769582, tenant_id=1827240738649612290)  (cost=4.2 rows=12) (actual time=0.0155..0.063 rows=12 loops=1)
            -> Index lookup on crm_follow_up using idx_tenant_subject_service (tenant_id=1827240738649612290, subject_service_id=202501025562445303), with index condition: (crm_follow_up.\`type\` not in (14,21,31,32))  (cost=0.801 rows=1) (actual time=0.0117..0.0117 rows=0 loops=1)
            -> Filter: ((crm_subject_follow_bill.tenant_id = 1827240738649612290) and (crm_subject_follow_bill.\`type\` = 1))  (cost=2.86 rows=1.1) (actual time=0.0249..0.0821 rows=11 loops=1)
                -> Index lookup on crm_subject_follow_bill using 主体id (service_subject_id=202501022435769582)  (cost=2.86 rows=11) (actual time=0.0217..0.0758 rows=11 loops=1)
            -> Filter: ((crm_subject_follow_bill.tenant_id = 1827240738649612290) and (crm_subject_follow_bill.\`type\` = 2))  (cost=2.86 rows=1.1) (actual time=0.0435..0.0435 rows=0 loops=1)
                -> Index lookup on crm_subject_follow_bill using 主体id (service_subject_id=202501022435769582)  (cost=2.86 rows=11) (actual time=0.0119..0.0404 rows=11 loops=1)
            -> Index lookup on crm_follow_up using idx_tenant_subject_service (tenant_id=1827240738649612290, subject_service_id=202501025562445303), with index condition: (crm_follow_up.\`type\` = 21)  (cost=0.751 rows=1) (actual time=0.00722..0.00722 rows=0 loops=1)
            -> Index lookup on crm_follow_up using idx_tenant_subject_service (tenant_id=1827240738649612290, subject_service_id=202501025562445303), with index condition: (crm_follow_up.\`type\` = 31)  (cost=0.751 rows=1) (actual time=0.00594..0.00594 rows=0 loops=1)
            -> Index lookup on crm_follow_up using idx_tenant_subject_service (tenant_id=1827240738649612290, subject_service_id=202501025562445303), with index condition: (crm_follow_up.\`type\` = 32)  (cost=0.751 rows=1) (actual time=0.00848..0.00848 rows=0 loops=1)
            -> Index lookup on crm_follow_up using idx_tenant_subject_service (tenant_id=1827240738649612290, subject_service_id=202501025562445303), with index condition: (crm_follow_up.\`type\` = 14)  (cost=0.751 rows=1) (actual time=0.0096..0.0096 rows=0 loops=1)`;

const I18N = {
  zh: {
    appTitle: "EXPLAIN ANALYZE",
    appSubtitle: "粘贴 MySQL TREE 输出，分析层级、瓶颈、索引和预估偏差。",
    planLabel: "执行计划",
    planPlaceholder: "将 EXPLAIN ANALYZE 输出粘贴到这里",
    schemaLabel: "索引定义，可选",
    schemaPlaceholder: "可粘贴 SHOW CREATE TABLE 或 CREATE INDEX，用于展示索引包含字段",
    analyze: "分析",
    clear: "清空",
    nodes: "节点数",
    pureTime: "总耗时",
    bottleneck: "瓶颈节点",
    estimateDrift: "最大偏差",
    tree: "执行树",
    hotspots: "瓶颈",
    indexes: "索引",
    smartFocus: "智能关注",
    emptyTitle: "等待执行计划",
    emptyBody: "分析后会高亮纯耗时瓶颈、预估偏差、表扫描、索引和行数。",
    selfTime: "纯耗时",
    actualTime: "实际耗时",
    actualRange: "实际时间区间",
    selfPercent: "纯耗时占比",
    cumulativeTime: "累计耗时",
    cumulativePercent: "累计占比",
    table: "表",
    index: "索引",
    rows: "实际行数",
    estimatedRows: "预估行数",
    actualRows: "实际行数",
    loops: "循环",
    operation: "操作",
    condition: "条件",
    indexColumns: "索引字段",
    rowDrift: "预估偏差",
    attention: "关注度",
    tableScan: "表扫描",
    noIndex: "未使用索引",
    inferred: "计划中出现",
    noTimedNodes: "没有可计算耗时的节点",
    noIndexNodes: "没有解析到索引访问或表扫描节点。",
    schemaHint: "提示：粘贴 SHOW CREATE TABLE 后，可以把执行计划中的索引名映射到完整索引字段。",
    focusBottleneck: "优先看实际耗时最高的节点",
    focusEstimate: "预估与实际行数偏差较大",
    focusScan: "存在表扫描，检查过滤条件和可用索引",
    goodPlan: "没有明显高风险节点",
  },
  en: {
    appTitle: "EXPLAIN ANALYZE",
    appSubtitle: "Paste MySQL TREE output to inspect hierarchy, bottlenecks, indexes, and row-estimate drift.",
    planLabel: "Execution plan",
    planPlaceholder: "Paste EXPLAIN ANALYZE output here",
    schemaLabel: "Index definitions, optional",
    schemaPlaceholder: "Paste SHOW CREATE TABLE or CREATE INDEX to map index columns",
    analyze: "Analyze",
    clear: "Clear",
    nodes: "Nodes",
    pureTime: "Total time",
    bottleneck: "Bottleneck",
    estimateDrift: "Max drift",
    tree: "Tree",
    hotspots: "Hotspots",
    indexes: "Indexes",
    smartFocus: "Smart focus",
    emptyTitle: "Waiting for a plan",
    emptyBody: "Analysis highlights pure-time bottlenecks, estimate drift, table scans, indexes, and row counts.",
    selfTime: "Pure time",
    actualTime: "Actual time",
    actualRange: "Actual range",
    selfPercent: "Pure share",
    cumulativeTime: "Cumulative time",
    cumulativePercent: "Cumulative share",
    table: "Table",
    index: "Index",
    rows: "Actual rows",
    estimatedRows: "Estimated rows",
    actualRows: "Actual rows",
    loops: "Loops",
    operation: "Operation",
    condition: "Condition",
    indexColumns: "Index columns",
    rowDrift: "Row drift",
    attention: "Attention",
    tableScan: "Table scan",
    noIndex: "No index",
    inferred: "seen in plan",
    noTimedNodes: "No timed nodes",
    noIndexNodes: "No index access or table-scan nodes parsed.",
    schemaHint: "Tip: paste SHOW CREATE TABLE to map index names to full index columns.",
    focusBottleneck: "Start with the highest actual-time node",
    focusEstimate: "Estimated and actual rows diverge heavily",
    focusScan: "Table scans detected; check predicates and usable indexes",
    goodPlan: "No obvious high-risk nodes",
  },
};

const state = {
  lang: "zh",
  roots: [],
  nodes: [],
  indexes: new Map(),
  analysis: null,
  collapsed: new Set(),
};

const detailPopover = document.createElement("div");
detailPopover.className = "detail-popover";
document.body.appendChild(detailPopover);
let activeDetailRow = null;

const el = {
  explainInput: document.querySelector("#explainInput"),
  schemaInput: document.querySelector("#schemaInput"),
  analyzeBtn: document.querySelector("#analyzeBtn"),
  clearBtn: document.querySelector("#clearBtn"),
  loadSample: document.querySelector("#loadSample"),
  languageBtn: document.querySelector("#languageBtn"),
  focusToggle: document.querySelector("#focusToggle"),
  nodeCount: document.querySelector("#nodeCount"),
  totalSelfTime: document.querySelector("#totalSelfTime"),
  bottleneckNode: document.querySelector("#bottleneckNode"),
  worstDrift: document.querySelector("#worstDrift"),
  insights: document.querySelector("#insights"),
  emptyState: document.querySelector("#emptyState"),
  treeView: document.querySelector("#treeView"),
  hotspotsView: document.querySelector("#hotspotsView"),
  indexesView: document.querySelector("#indexesView"),
  tabs: [...document.querySelectorAll(".tab")],
};

function t(key) {
  return I18N[state.lang][key] || I18N.en[key] || key;
}

function applyLanguage() {
  document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach((item) => {
    item.textContent = t(item.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((item) => {
    item.placeholder = t(item.dataset.i18nPlaceholder);
  });
  render();
}

function analyze() {
  const parsed = ExplainParser.parseExplain(el.explainInput.value);
  state.roots = parsed.roots;
  state.nodes = parsed.nodes;
  state.indexes = ExplainParser.parseIndexes(el.schemaInput.value);
  state.analysis = ExplainMetrics.analyzeNodes(state.nodes);
  seedCollapsedRows();
  render();
}

function render() {
  if (!state.analysis) state.analysis = ExplainMetrics.analyzeNodes(state.nodes);
  el.emptyState.style.display = state.nodes.length ? "none" : "grid";
  renderSummary();
  renderInsights();
  renderTree();
  renderHotspots();
  renderIndexes();
}

function renderSummary() {
  const bottleneck = sortedByActual()[0];
  const drift = sortedByDrift()[0];

  el.nodeCount.textContent = state.nodes.length;
  el.totalSelfTime.textContent = ExplainMetrics.formatTime(state.analysis.totalActual);
  el.bottleneckNode.textContent = bottleneck ? bottleneck.node.operation : "-";
  el.worstDrift.textContent = drift ? ExplainMetrics.formatRatio(drift.metrics.ratio) : "-";
}

function renderInsights() {
  const items = [];
  const bottleneck = sortedByActual()[0];
  const drift = sortedByDrift()[0];
  const scans = state.nodes.filter((node) => metricsFor(node).tableScan);

  if (bottleneck && Number.isFinite(bottleneck.metrics.cumulative)) {
    items.push(`${t("focusBottleneck")}: ${bottleneck.node.operation} (${ExplainMetrics.formatTime(bottleneck.metrics.cumulative)})`);
  }
  if (drift && drift.metrics.estimateLevel !== "good") {
    items.push(`${t("focusEstimate")}: ${drift.node.operation} (${ExplainMetrics.formatRatio(drift.metrics.ratio)})`);
  }
  if (scans.length) {
    items.push(`${t("focusScan")}: ${scans.length}`);
  }
  if (!items.length && state.nodes.length) items.push(t("goodPlan"));

  el.insights.replaceChildren(...items.map((text) => {
    const item = document.createElement("div");
    item.className = "insight";
    item.textContent = text;
    return item;
  }));
}

function renderTree() {
  const grid = document.createElement("div");
  grid.className = "plan-grid";
  grid.style.minWidth = `${minimumPlanGridWidth()}px`;
  grid.appendChild(renderPlanHeader());
  state.roots.forEach((node) => appendPlanRows(grid, node, 0, true));
  el.treeView.replaceChildren(grid);
}

function minimumPlanGridWidth() {
  const baseWidth = 1160;
  const comfortableDepth = 3;
  const extraDepth = Math.max(0, visibleMaxDepth() - comfortableDepth);
  return baseWidth + extraDepth * 28;
}

function visibleMaxDepth() {
  let maxDepth = 0;
  const visit = (node, depth) => {
    maxDepth = Math.max(maxDepth, depth);
    if (state.collapsed.has(node.id)) return;
    node.children.forEach((child) => visit(child, depth + 1));
  };
  state.roots.forEach((node) => visit(node, 0));
  return maxDepth;
}

function renderPlanHeader() {
  const row = document.createElement("div");
  row.className = "plan-row plan-header";
  [
    t("operation"),
    t("table"),
    t("index"),
    t("actualTime"),
    `${t("estimatedRows")} / ${t("actualRows")}`,
    t("rowDrift"),
    t("loops"),
    t("attention"),
  ].forEach((label) => {
    const cell = document.createElement("div");
    cell.textContent = label;
    row.appendChild(cell);
  });
  return row;
}

function appendPlanRows(grid, node, depth, visible) {
  if (!visible) return;
  grid.appendChild(renderPlanRow(node, depth));
  if (state.collapsed.has(node.id)) return;
  node.children.forEach((child) => appendPlanRows(grid, child, depth + 1, true));
}

function renderPlanRow(node, depth) {
  const row = document.createElement("div");
  const metrics = metricsFor(node);
  const focus = focusLevel(metrics);
  row.className = `plan-row focus-${focus} estimate-${metrics.estimateLevel}`;

  row.append(
    operationCell(node, depth),
    textCell(node.table || "-"),
    textCell(node.index || "-"),
    actualTimeCell(node, metrics),
    metricCell(ExplainMetrics.displayNumber(node.estimatedRows), ExplainMetrics.displayNumber(node.actualRows)),
    statusCell(ExplainMetrics.formatRatio(metrics.ratio), `estimate-${metrics.estimateLevel}`),
    textCell(ExplainMetrics.displayNumber(node.loops)),
    statusCell(String(metrics.attention), `focus-${focus}`),
  );
  row.addEventListener("click", (event) => {
    event.stopPropagation();
    if (activeDetailRow === row) {
      hideDetails();
      return;
    }
    showDetails(event, row, node, metrics);
  });
  return row;
}

function operationCell(node, depth) {
  const cell = document.createElement("div");
  cell.className = "plan-operation-cell";
  cell.style.setProperty("--depth", depth);

  const toggle = document.createElement("button");
  toggle.className = "row-toggle";
  toggle.type = "button";
  toggle.textContent = node.children.length ? (state.collapsed.has(node.id) ? "›" : "⌄") : "";
  toggle.disabled = !node.children.length;
  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    if (state.collapsed.has(node.id)) {
      state.collapsed.delete(node.id);
    } else {
      state.collapsed.add(node.id);
    }
    hideDetails();
    renderTree();
  });

  const text = document.createElement("span");
  text.className = "operation-text";
  text.textContent = node.operation;

  const sub = document.createElement("span");
  sub.className = "operation-subtext";
  sub.textContent = conciseTitle(node);

  const wrap = document.createElement("span");
  wrap.className = "operation-wrap";
  wrap.append(text, sub);

  cell.append(toggle, wrap);
  return cell;
}

function textCell(value) {
  const cell = document.createElement("div");
  cell.className = "plan-text-cell";
  cell.textContent = value;
  return cell;
}

function metricCell(primary, secondary) {
  const cell = document.createElement("div");
  cell.className = "plan-metric-cell";
  cell.textContent = `${primary} / ${secondary}`;
  return cell;
}

function actualTimeCell(node, metrics) {
  const cell = document.createElement("div");
  cell.className = "plan-time-cell";

  const primary = document.createElement("span");
  primary.className = "time-primary";
  primary.textContent = ExplainMetrics.formatTime(metrics.cumulative);

  const range = document.createElement("span");
  range.className = "time-range";
  range.textContent = actualTimeRange(node);

  cell.append(primary, range);
  return cell;
}

function actualTimeRange(node) {
  if (!Number.isFinite(node.actualStart) || !Number.isFinite(node.actualEnd)) return "-";
  return `${ExplainMetrics.formatTime(node.actualStart)}..${ExplainMetrics.formatTime(node.actualEnd)}`;
}

function statusCell(value, className) {
  const cell = document.createElement("div");
  cell.className = "plan-status-cell";
  const pill = document.createElement("span");
  pill.className = `status-pill ${className}`;
  pill.textContent = value;
  cell.appendChild(pill);
  return cell;
}

function showDetails(event, row, node, metrics) {
  if (activeDetailRow) activeDetailRow.classList.remove("selected");
  activeDetailRow = row;
  activeDetailRow.classList.add("selected");
  detailPopover.replaceChildren();
  [
    [t("operation"), node.operation],
    [t("actualTime"), ExplainMetrics.formatTime(metrics.cumulative)],
    [t("actualRange"), actualTimeRange(node)],
    [t("selfTime"), ExplainMetrics.formatTime(metrics.self)],
    [t("cumulativePercent"), ExplainMetrics.formatPercent(metrics.cumulativePercent)],
    [t("indexColumns"), indexColumns(node).join(", ") || inferredColumns(node)],
    [t("condition"), node.condition || "-"],
  ].forEach(([label, value]) => {
    const item = document.createElement("div");
    const name = document.createElement("span");
    const detail = document.createElement("strong");
    name.textContent = label;
    detail.textContent = value;
    item.append(name, detail);
    detailPopover.appendChild(item);
  });
  detailPopover.classList.add("visible");
  moveDetails(event);
}

function moveDetails(event) {
  const offset = 14;
  const width = detailPopover.offsetWidth || 360;
  const height = detailPopover.offsetHeight || 160;
  const x = Math.min(event.clientX + offset, window.innerWidth - width - 12);
  const y = Math.min(event.clientY + offset, window.innerHeight - height - 12);
  detailPopover.style.left = `${Math.max(12, x)}px`;
  detailPopover.style.top = `${Math.max(12, y)}px`;
}

function hideDetails() {
  if (activeDetailRow) activeDetailRow.classList.remove("selected");
  activeDetailRow = null;
  detailPopover.classList.remove("visible");
}

window.addEventListener("scroll", hideDetails, true);
document.addEventListener("click", hideDetails);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideDetails();
});

function renderHotspots() {
  const list = document.createElement("div");
  list.className = "hotspot-list";
  const rows = state.nodes
    .map((node) => ({ node, metrics: metricsFor(node) }))
    .sort((a, b) => b.metrics.attention - a.metrics.attention);

  if (!rows.length) {
    list.appendChild(hint(t("noTimedNodes")));
  }

  rows.forEach(({ node, metrics }) => {
    const row = document.createElement("div");
    row.className = `hotspot-row focus-${focusLevel(metrics)}`;
    row.innerHTML = `
      <div class="row-title">${escapeHtml(node.operation)}</div>
      <div class="row-cell"><b>${escapeHtml(t("actualTime"))}</b>${escapeHtml(ExplainMetrics.formatTime(metrics.cumulative))}</div>
      <div class="row-cell"><b>${escapeHtml(t("selfTime"))}</b>${escapeHtml(ExplainMetrics.formatTime(metrics.self))}</div>
      <div class="row-cell"><b>${escapeHtml(t("rowDrift"))}</b>${escapeHtml(ExplainMetrics.formatRatio(metrics.ratio))}</div>
      <div class="row-cell"><b>${escapeHtml(t("table"))}</b>${escapeHtml(node.table || "-")}</div>
      <div class="row-cell"><b>${escapeHtml(t("index"))}</b>${escapeHtml(node.index || "-")}</div>
      <div class="row-cell"><b>${escapeHtml(t("attention"))}</b>${metrics.attention}</div>
    `;
    list.appendChild(row);
  });

  el.hotspotsView.replaceChildren(list);
}

function renderIndexes() {
  const list = document.createElement("div");
  list.className = "index-list";
  const indexedNodes = state.nodes.filter((node) => node.index || metricsFor(node).tableScan);

  if (!indexedNodes.length) {
    list.appendChild(hint(t("noIndexNodes")));
  }

  indexedNodes.forEach((node) => {
    const metrics = metricsFor(node);
    const row = document.createElement("div");
    row.className = `index-row focus-${focusLevel(metrics)}`;
    row.innerHTML = `
      <div class="row-title">${escapeHtml(node.table || "-")}</div>
      <div class="row-cell"><b>${escapeHtml(t("index"))}</b>${escapeHtml(node.index || t("noIndex"))}</div>
      <div class="row-cell"><b>${escapeHtml(t("indexColumns"))}</b>${escapeHtml(indexColumns(node).join(", ") || inferredColumns(node))}</div>
      <div class="row-cell"><b>${escapeHtml(t("condition"))}</b>${escapeHtml(node.condition || node.title)}</div>
    `;
    list.appendChild(row);
  });

  if (!state.indexes.size) list.appendChild(hint(t("schemaHint")));
  el.indexesView.replaceChildren(list);
}

function sortedBySelf() {
  return state.nodes
    .map((node) => ({ node, metrics: metricsFor(node) }))
    .filter((item) => Number.isFinite(item.metrics.self))
    .sort((a, b) => b.metrics.self - a.metrics.self);
}

function sortedByActual() {
  return state.nodes
    .map((node) => ({ node, metrics: metricsFor(node) }))
    .filter((item) => Number.isFinite(item.metrics.cumulative))
    .sort((a, b) => b.metrics.cumulative - a.metrics.cumulative);
}

function sortedByDrift() {
  return state.nodes
    .map((node) => ({ node, metrics: metricsFor(node) }))
    .filter((item) => item.metrics.ratio === Infinity || Number.isFinite(item.metrics.ratio))
    .sort((a, b) => driftDistance(b.metrics.ratio) - driftDistance(a.metrics.ratio));
}

function driftDistance(value) {
  if (value === Infinity) return Number.MAX_SAFE_INTEGER;
  if (!Number.isFinite(value)) return 0;
  return Math.max(value, 1 / Math.max(value, Number.EPSILON));
}

function metricsFor(node) {
  return state.analysis.enriched[node.id - 1];
}

function focusLevel(metrics) {
  if (metrics.attention >= 60 || metrics.selfPercent >= 35 || metrics.estimateLevel === "critical") return "critical";
  if (metrics.attention >= 35 || metrics.selfPercent >= 15 || metrics.estimateLevel === "warning") return "warning";
  if (metrics.attention >= 18 || metrics.tableScan || metrics.estimateLevel === "notice") return "notice";
  return "normal";
}

function shouldOpen(node, metrics) {
  if (!el.focusToggle.checked) return true;
  if (!node.parent) return true;
  return focusLevel(metrics) !== "normal" || node.children.some((child) => focusLevel(metricsFor(child)) !== "normal");
}

function seedCollapsedRows() {
  state.collapsed = new Set();
  if (!el.focusToggle.checked) return;
  state.nodes.forEach((node) => {
    if (!node.children.length || !node.parent) return;
    const metrics = metricsFor(node);
    const hasImportantChild = node.children.some((child) => focusLevel(metricsFor(child)) !== "normal");
    if (focusLevel(metrics) === "normal" && !hasImportantChild) state.collapsed.add(node.id);
  });
}

function conciseTitle(node) {
  const title = node.title.replace(node.operation, "").replace(/^:\s*/, "").trim();
  return title || node.raw;
}

function indexColumns(node) {
  if (!node.index) return [];
  const exact = state.indexes.get(`${node.table}::${node.index}`);
  const fallback = state.indexes.get(`*::${node.index}`);
  return (exact || fallback || {}).columns || [];
}

function inferredColumns(node) {
  return node.lookupColumns.length ? `${node.lookupColumns.join(", ")} (${t("inferred")})` : "-";
}

function badge(label, text, className) {
  const item = document.createElement("span");
  item.className = `badge ${className}`.trim();
  if (label) {
    const labelEl = document.createElement("span");
    labelEl.className = "badge-label";
    labelEl.textContent = label;
    item.appendChild(labelEl);
  }
  const valueEl = document.createElement("span");
  valueEl.className = "badge-value";
  valueEl.textContent = text;
  item.appendChild(valueEl);
  return item;
}

function detail(parent, term, description) {
  const wrap = document.createElement("div");
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");
  dt.textContent = term;
  dd.textContent = description;
  wrap.append(dt, dd);
  parent.appendChild(wrap);
}

function hint(text) {
  const item = document.createElement("p");
  item.className = "hint";
  item.textContent = text;
  return item;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

el.analyzeBtn.addEventListener("click", analyze);
el.clearBtn.addEventListener("click", () => {
  el.explainInput.value = "";
  el.schemaInput.value = "";
  state.roots = [];
  state.nodes = [];
  state.indexes = new Map();
  state.analysis = ExplainMetrics.analyzeNodes([]);
  render();
});
el.loadSample.addEventListener("click", () => {
  el.explainInput.value = samplePlan;
  analyze();
});
el.languageBtn.addEventListener("click", () => {
  state.lang = state.lang === "zh" ? "en" : "zh";
  applyLanguage();
});
el.focusToggle.addEventListener("change", () => {
  seedCollapsedRows();
  renderTree();
});
el.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    el.tabs.forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
    document.querySelector(`#${tab.dataset.view}View`).classList.add("active");
  });
});

el.explainInput.value = samplePlan;
applyLanguage();
analyze();
