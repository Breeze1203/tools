(function (root) {
  function duration(node) {
    if (!Number.isFinite(node.actualStart) || !Number.isFinite(node.actualEnd)) return null;
    return Math.max(node.actualEnd - node.actualStart, node.actualEnd);
  }

  function totalActualTime(nodes) {
    const values = nodes
      .map((node) => node.actualEnd)
      .filter(Number.isFinite);
    return values.length ? Math.max(...values) : null;
  }

  function selfTime(node) {
    const own = duration(node);
    if (!Number.isFinite(own)) return null;
    const childTotal = (node.children || [])
      .map(duration)
      .filter(Number.isFinite)
      .reduce((sum, value) => sum + value, 0);
    return Math.max(own - childTotal, 0);
  }

  function totalSelfTime(nodes) {
    const values = nodes
      .map(selfTime)
      .filter(Number.isFinite);
    return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
  }

  function percentage(value, total) {
    if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return null;
    return (value / total) * 100;
  }

  function formatNumber(value) {
    return Number(value).toLocaleString("zh-CN", {
      maximumFractionDigits: 4,
    });
  }

  function displayNumber(value) {
    return Number.isFinite(value) ? formatNumber(value) : "-";
  }

  function rowRatio(node) {
    if (!Number.isFinite(node.estimatedRows) || !Number.isFinite(node.actualRows)) return null;
    if (node.estimatedRows === 0 && node.actualRows === 0) return 1;
    if (node.estimatedRows === 0) return Infinity;
    return node.actualRows / node.estimatedRows;
  }

  function formatRatio(value) {
    if (value === Infinity) return "∞";
    if (!Number.isFinite(value)) return "-";
    return `${formatNumber(value)}x`;
  }

  function estimateSeverity(value) {
    if (value === Infinity) return "critical";
    if (!Number.isFinite(value)) return "neutral";
    const distance = Math.max(value, 1 / Math.max(value, Number.EPSILON));
    if (distance >= 100) return "critical";
    if (distance >= 10) return "warning";
    if (distance >= 3) return "notice";
    return "good";
  }

  function analyzeNodes(nodes) {
    const totalActual = totalActualTime(nodes);
    const totalSelf = totalSelfTime(nodes);
    const enriched = nodes.map((node) => {
      const cumulative = duration(node);
      const self = selfTime(node);
      const cumulativePercent = percentage(cumulative, totalActual);
      const selfPercent = percentage(self, totalSelf || totalActual);
      const ratio = rowRatio(node);
      const tableScan = /table scan/i.test(node.operation);
      const estimateLevel = estimateSeverity(ratio);
      const attention = attentionScore({
        selfPercent,
        cumulativePercent,
        ratio,
        tableScan,
        actualRows: node.actualRows,
        loops: node.loops,
      });
      return {
        attention,
        cumulative,
        cumulativePercent,
        estimateLevel,
        ratio,
        self,
        selfPercent,
        tableScan,
      };
    });

    return {
      enriched,
      totalActual,
      totalSelf,
      maxAttention: enriched.reduce((max, item) => Math.max(max, item.attention), 0),
    };
  }

  function attentionScore({ selfPercent, cumulativePercent, ratio, tableScan, actualRows, loops }) {
    let score = 0;
    if (Number.isFinite(selfPercent)) score += Math.min(selfPercent, 80) * 0.7;
    if (Number.isFinite(cumulativePercent)) score += Math.min(cumulativePercent, 80) * 0.15;
    if (tableScan) score += 18;
    if (Number.isFinite(ratio)) {
      const distance = Math.max(ratio, 1 / Math.max(ratio, Number.EPSILON));
      score += Math.min(Math.log10(distance) * 14, 28);
    } else if (ratio === Infinity) {
      score += 28;
    }
    if (Number.isFinite(actualRows) && actualRows > 1000) score += Math.min(Math.log10(actualRows) * 4, 16);
    if (Number.isFinite(loops) && loops > 1) score += Math.min(Math.log10(loops) * 8, 14);
    return Math.round(score);
  }

  function formatTime(value) {
    return Number.isFinite(value) ? `${formatNumber(value)} ms` : "-";
  }

  function formatPercent(value) {
    return Number.isFinite(value) ? `${formatNumber(value)}%` : "-";
  }

  root.ExplainMetrics = {
    analyzeNodes,
    displayNumber,
    duration,
    estimateSeverity,
    formatNumber,
    formatPercent,
    formatRatio,
    formatTime,
    percentage,
    rowRatio,
    selfTime,
    totalActualTime,
    totalSelfTime,
  };

  if (typeof module !== "undefined") {
    module.exports = root.ExplainMetrics;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
