(function (root) {
  function parseExplain(text) {
    const roots = [];
    const stack = [];
    const nodes = [];

    text.split(/\r?\n/).forEach((rawLine) => {
      if (!rawLine.trim()) return;
      const arrow = rawLine.indexOf("->");
      if (arrow === -1 && stack.length) return;

      const depth = arrow === -1 ? 0 : Math.floor(arrow / 4);
      const line = arrow === -1 ? rawLine.trim() : rawLine.slice(arrow + 2).trim();
      const node = parseNode(line, depth, nodes.length + 1);

      while (stack.length && stack[stack.length - 1].depth >= depth) {
        stack.pop();
      }

      const parent = stack[stack.length - 1];
      if (parent) {
        parent.children.push(node);
        node.parent = parent;
      } else {
        roots.push(node);
      }

      stack.push(node);
      nodes.push(node);
    });

    return { roots, nodes };
  }

  function parseNode(line, depth, id) {
    const cost = readGroup(line, "cost");
    const actual = readGroup(line, "actual time");
    const rowsMatch = line.match(/\(actual time=[^)]+ rows=([\d.]+) loops=([\d.]+)\)/);
    const estimateRows = line.match(/\(cost=[^)]+ rows=([\d.]+)\)/);
    const title = cleanupTitle(line);
    const table = extractTable(title);
    const index = extractIndex(title);
    const lookupColumns = extractLookupColumns(title);
    const condition = extractCondition(title);
    const operation = title.split(":")[0].split(" on ")[0].split(" using ")[0].trim();

    return {
      id,
      depth,
      raw: line,
      title,
      operation,
      table,
      index,
      lookupColumns,
      condition,
      costStart: cost[0],
      costEnd: cost[1],
      estimatedRows: estimateRows ? Number(estimateRows[1]) : null,
      actualStart: actual[0],
      actualEnd: actual[1],
      actualRows: rowsMatch ? Number(rowsMatch[1]) : null,
      loops: rowsMatch ? Number(rowsMatch[2]) : null,
      children: [],
      parent: null,
    };
  }

  function readGroup(line, label) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const number = "(\\d+(?:\\.\\d+)?)";
    const match = line.match(new RegExp(`${escaped}=${number}(?:\\.\\.${number})?`));
    if (!match) return [null, null];
    return [Number(match[1]), match[2] ? Number(match[2]) : Number(match[1])];
  }

  function cleanupTitle(line) {
    return line
      .replace(/\s+\(cost=.*?\)/g, "")
      .replace(/\s+\(actual time=.*?\)/g, "")
      .trim();
  }

  function extractTable(title) {
    const match = title.match(/\bon\s+([^\s(),]+)/i);
    return match ? stripQuote(match[1]) : "";
  }

  function extractIndex(title) {
    const match = title.match(/\busing\s+([^\s(,]+)/i);
    return match ? stripQuote(match[1]) : "";
  }

  function extractLookupColumns(title) {
    const match = title.match(/\busing\s+[^\s(,]+\s+\((.*?)\)(?:,|$)/i);
    if (!match) return [];
    return match[1]
      .split(/\s+and\s+|,/i)
      .map((item) => item.match(/^\s*(.+?)\s*(?:=|<=>|>=|<=|>|<|\bin\b|\bnot\s+in\b)/i))
      .filter(Boolean)
      .map((item) => normalizeIdentifier(item[1]));
  }

  function extractCondition(title) {
    const match = title.match(/with index condition:\s*(.*)$/i);
    if (match) return match[1];
    if (/^Filter:/i.test(title)) return title.replace(/^Filter:\s*/i, "");
    return "";
  }

  function parseIndexes(schemaText) {
    const indexes = new Map();
    const addIndex = (table, index, columns) => {
      if (!index || !columns.length) return;
      indexes.set(`${table || "*"}::${index}`, { table, index, columns });
    };

    const lines = schemaText.split(/\r?\n/);
    let currentTable = "";

    lines.forEach((line) => {
      const tableMatch = line.match(/CREATE\s+TABLE\s+((?:`[^`]+`)|(?:"[^"]+")|(?:\S+))/i);
      if (tableMatch) currentTable = normalizeIdentifier(tableMatch[1]);

      const keyMatch = line.match(/(?:KEY|INDEX)\s+((?:`[^`]+`)|(?:"[^"]+")|(?:[^\s(]+))\s*\(([^)]+)\)/i);
      if (keyMatch) {
        addIndex(currentTable, normalizeIdentifier(keyMatch[1]), splitIndexColumns(keyMatch[2]));
      }

      const createIndexMatch = line.match(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+((?:`[^`]+`)|(?:"[^"]+")|(?:\S+))\s+ON\s+((?:`[^`]+`)|(?:"[^"]+")|(?:\S+))\s*\(([^)]+)\)/i);
      if (createIndexMatch) {
        addIndex(
          normalizeIdentifier(createIndexMatch[2]),
          normalizeIdentifier(createIndexMatch[1]),
          splitIndexColumns(createIndexMatch[3]),
        );
      }
    });

    return indexes;
  }

  function splitIndexColumns(columnsText) {
    return columnsText
      .split(",")
      .map((column) => normalizeIdentifier(column.replace(/\s+(ASC|DESC)$/i, "").replace(/\(\d+\)$/, "")))
      .filter(Boolean);
  }

  function normalizeIdentifier(value) {
    const parts = String(value)
      .trim()
      .split(".")
      .map(stripQuote)
      .filter(Boolean);
    return parts[parts.length - 1] || "";
  }

  function stripQuote(value) {
    return String(value).trim().replace(/^[`"']|[`"']$/g, "");
  }

  root.ExplainParser = {
    parseExplain,
    parseIndexes,
  };

  if (typeof module !== "undefined") {
    module.exports = root.ExplainParser;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
