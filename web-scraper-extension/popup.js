/**
 * popup.js
 */

'use strict';

// ─────────────────────────────────────────────────────────────
// 常量
// ─────────────────────────────────────────────────────────────

const EXPORT_HINTS = {
  json: '导出 .json 后可用 MongoDB / Elasticsearch 直接导入',
  csv : '导出 .csv 后用 Navicat / DBeaver 的「导入向导」导入 MySQL / PostgreSQL',
  sql : '导出 .sql 后直接在数据库执行，或用 MySQL source 命令导入',
};

const BADGE_MAP = {
  uploaded    : { cls: 'badge-ok',   label: '上传成功' },
  upload_failed: { cls: 'badge-fail', label: '上传失败' },
  parse_error : { cls: 'badge-err',  label: '解析出错' },
  save_error  : { cls: 'badge-err',  label: '保存出错' },
};

let selectedFormat = 'json';

// ─────────────────────────────────────────────────────────────
// 工具
// ─────────────────────────────────────────────────────────────

function toast(msg, duration = 2200) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

function shortUrl(url = '') {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 28 ? u.pathname.slice(0, 28) + '…' : u.pathname;
    return u.hostname + path;
  } catch {
    return url.slice(0, 45);
  }
}

function fmtTime(iso) {
  const d = new Date(iso);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0'))
    .join(':');
}

// ─────────────────────────────────────────────────────────────
// 统计刷新
// ─────────────────────────────────────────────────────────────

function refreshStats() {
  chrome.storage.local.get(['scraper_records', 'scraper_failed'], r => {
    const localCount = (r.scraper_records ?? []).length;
    const failCount  = (r.scraper_failed  ?? []).length;

    document.getElementById('count-local').textContent = localCount;
    document.getElementById('count-fail').textContent  = failCount;
    document.getElementById('btn-export').disabled     = localCount === 0;
  });
}

// ─────────────────────────────────────────────────────────────
// 日志渲染
// ─────────────────────────────────────────────────────────────

function renderLogs(logs) {
  const el = document.getElementById('log-list');

  if (!logs || logs.length === 0) {
    el.innerHTML = '<div class="empty">访问目标页面后记录显示在这里</div>';
    return;
  }

  el.innerHTML = logs.slice(0, 7).map(log => {
    const badge   = BADGE_MAP[log.status] ?? { cls: 'badge-dup', label: log.status };
    const dupTag  = log.duplicate
      ? '<span class="local-tag">本地重复</span>'
      : (log.localTotal != null ? `<span class="local-tag">本地共 ${log.localTotal} 条</span>` : '');

    return `
      <div class="log-item">
        <div class="log-row">
          <span class="badge ${badge.cls}">
            <span class="dot"></span>${badge.label}
          </span>
          ${dupTag}
        </div>
        <div class="log-url">${shortUrl(log.tabUrl)}</div>
        <div class="log-time">${fmtTime(log.timestamp)}</div>
        ${log.uploadError ? `<div class="log-err">${log.uploadError}</div>` : ''}
      </div>`;
  }).join('');
}

function loadLogs() {
  const render = logs => renderLogs(logs ?? []);
  chrome.storage.session.get(['scraper_logs'], r => {
    if (r.scraper_logs) { render(r.scraper_logs); return; }
    chrome.storage.local.get(['scraper_logs'], r2 => render(r2.scraper_logs));
  });
}

// ─────────────────────────────────────────────────────────────
// 格式转换（与 storage.js 保持一致，popup 里自包含实现）
// ─────────────────────────────────────────────────────────────

function toJSON(records) {
  return JSON.stringify(records, null, 2);
}

function toCSV(records) {
  if (!records.length) return '';
  const allKeys = [...new Set(records.flatMap(r => Object.keys(r)))];
  const keys    = [
    ...allKeys.filter(k => !k.startsWith('_')),
    ...allKeys.filter(k =>  k.startsWith('_')),
  ];
  const esc = v => {
    if (v == null) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(','), ...records.map(r => keys.map(k => esc(r[k])).join(','))].join('\n');
}

function toSQL(records) {
  if (!records.length) return '-- No records\n';
  const table   = 'scraped_data';
  const allKeys = [...new Set(records.flatMap(r => Object.keys(r)))];
  const cols    = [...allKeys.filter(k => !k.startsWith('_')), '_savedAt', '_id'];
  const escVal  = v => {
    if (v == null)              return 'NULL';
    if (typeof v === 'number')  return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return `'${s.replace(/'/g, "''")}'`;
  };
  const colList = cols.map(c => `\`${c}\``).join(', ');
  const header  = `-- Exported ${records.length} records at ${new Date().toISOString()}\n\n`;
  return header + records.map(r =>
    `INSERT INTO \`${table}\` (${colList}) VALUES (${cols.map(k => escVal(r[k])).join(', ')});`
  ).join('\n') + '\n';
}

// ─────────────────────────────────────────────────────────────
// 事件绑定
// ─────────────────────────────────────────────────────────────

// 格式切换
document.querySelectorAll('.fmt-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.fmt-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedFormat = btn.dataset.fmt;
    document.getElementById('export-hint').textContent = EXPORT_HINTS[selectedFormat];
  });
});

// 导出文件
document.getElementById('btn-export').addEventListener('click', () => {
  const btn = document.getElementById('btn-export');
  btn.disabled    = true;
  btn.textContent = '正在生成…';

  chrome.storage.local.get(['scraper_records'], result => {
    const records = result.scraper_records ?? [];
    if (!records.length) {
      toast('没有记录可导出');
      btn.disabled = false; btn.textContent = '📥 导出文件';
      return;
    }

    let content, mimeType, ext;
    try {
      if (selectedFormat === 'csv') {
        [content, mimeType, ext] = [toCSV(records), 'text/csv', 'csv'];
      } else if (selectedFormat === 'sql') {
        [content, mimeType, ext] = [toSQL(records), 'text/plain', 'sql'];
      } else {
        [content, mimeType, ext] = [toJSON(records), 'application/json', 'json'];
      }
    } catch (err) {
      toast('生成文件失败: ' + err.message);
      btn.disabled = false; btn.textContent = '📥 导出文件';
      return;
    }

    const ts       = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `scraper-${ts}.${ext}`;

    chrome.runtime.sendMessage(
      { from: 'storage', action: 'download', payload: { content, mimeType, filename } },
      response => {
        if (response?.success) {
          toast(`✅ 已导出 ${records.length} 条记录`);
        } else {
          toast('导出失败: ' + (response?.error ?? '未知错误'));
        }
        btn.disabled    = records.length === 0;
        btn.textContent = '📥 导出文件';
      }
    );
  });
});

// 清空记录
document.getElementById('btn-clear').addEventListener('click', () => {
  if (!confirm('确认清空所有本地缓存和日志？')) return;
  chrome.storage.local.remove(
    ['scraper_records', 'scraper_failed', 'scraper_logs'],
    () => {
      refreshStats();
      renderLogs([]);
      toast('已清空');
    }
  );
});

// ─────────────────────────────────────────────────────────────
// 初始化
// ─────────────────────────────────────────────────────────────

refreshStats();
loadLogs();
