/**
 * storage.js
 *
 * 职责：
 *   1. saveRecord()    — 将解析结果存入 chrome.storage.local（本地积累）
 *   2. uploadRecord()  — 将单条数据 POST 到后端（自动触发，带重试）
 *   3. exportToFile()  — 将所有本地记录导出为 JSON / CSV / SQL 文件
 *   4. retryFailed()   — 补传历史上传失败的记录
 *
 * ✏️ 修改指南：
 *   - API_BASE_URL / ENDPOINT：换成真实后端地址
 *   - buildPayload()：把占位字段 abc 替换成真实业务字段
 *   - TABLE_NAME：SQL 导出时的目标表名
 */

'use strict';

// ─────────────────────────────────────────────────────────────
// 配置
// ─────────────────────────────────────────────────────────────

const CONFIG = {
  // HTTP 上传
  API_BASE_URL : 'http://localhost:8888',  // ✏️ 后端地址
  ENDPOINT     : '/api/crm/crmServiceSubject/saveHkInformation',       // ✏️ 接口路径
  TIMEOUT_MS   : 8_000,
  MAX_RETRIES  : 2,

  // 本地存储
  STORE_KEY    : 'scraper_records',        // 所有记录
  FAILED_KEY   : 'scraper_failed',         // 上传失败待补传

  // 导出
  TABLE_NAME   : 'scraped_data',           // ✏️ SQL 导出的表名
  MAX_RECORDS  : 5_000,
};

// ─────────────────────────────────────────────────────────────
// Payload 构造（✏️ 在这里替换占位字段）
// ─────────────────────────────────────────────────────────────

/**
 * 将解析结果映射为后端期望的请求体格式。
 * 目前用占位字段 abc / abc1 / abc2，后续按后端接口替换。
 *
 * @param {object} data  parser.js 返回的解析结果
 * @returns {object}     POST 请求体
 */
function buildPayload(data) {
  return {
    type               : data.type ?? null,
    tenantId           : 1827240738649612290,
    businessRegNo      : data.businessRegNo ?? null,
    companyNameEn      : data.companyNameEn ?? null,
    companyNameZh      : data.companyNameZh ?? null,
    companyType        : data.companyType ?? null,
    incorporationDate  : data.incorporationDate ?? null,
    status             : data.status ?? null,
    remarks            : data.remarks ?? null,
    liquidationMode    : data.liquidationMode ?? null,
    chargeRegistration : data.chargeRegistration ?? null,
  };
}

// ─────────────────────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────────────────────

/** chrome.storage.local 的 Promise 封装 */
const store = {
  get: keys => new Promise(resolve =>
    chrome.storage.local.get(keys, resolve)
  ),
  set: items => new Promise(resolve =>
    chrome.storage.local.set(items, resolve)
  ),
  remove: keys => new Promise(resolve =>
    chrome.storage.local.remove(keys, resolve)
  ),
};

/** Ask the extension service worker to upload, avoiding page CORS limits. */
function uploadViaBackground(url, payload, headers) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage(
      {
        from: 'storage',
        action: 'upload',
        payload: { url, payload, headers, timeoutMs: CONFIG.TIMEOUT_MS },
      },
      response => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
          return;
        }

        resolve(response ?? { success: false, error: 'No response from background uploader' });
      }
    );
  });
}

// ─────────────────────────────────────────────────────────────
// 1. 本地积累
// ─────────────────────────────────────────────────────────────

/**
 * 将解析结果追加到本地缓存（去重：同 url + type 只存一次）。
 *
 * @param {object} data
 * @returns {Promise<{ saved: boolean, duplicate: boolean, total: number }>}
 */
async function saveRecord(data) {
  const result  = await store.get([CONFIG.STORE_KEY]);
  const records = result[CONFIG.STORE_KEY] ?? [];

  const isDuplicate = records.some(
    r => r.url === data.url && r.type === data.type
  );
  if (isDuplicate) {
    return { saved: false, duplicate: true, total: records.length };
  }

  records.push({ ...data, _savedAt: new Date().toISOString(), _id: Date.now() });

  if (records.length > CONFIG.MAX_RECORDS) {
    records.splice(0, records.length - CONFIG.MAX_RECORDS);
  }

  await store.set({ [CONFIG.STORE_KEY]: records });
  return { saved: true, duplicate: false, total: records.length };
}

/** 查询当前本地缓存条数 */
async function getRecordCount() {
  const result = await store.get([CONFIG.STORE_KEY]);
  return (result[CONFIG.STORE_KEY] ?? []).length;
}

/** 清空所有本地记录 */
async function clearRecords() {
  await store.remove([CONFIG.STORE_KEY, CONFIG.FAILED_KEY]);
}

// ─────────────────────────────────────────────────────────────
// 2. HTTP 上传
// ─────────────────────────────────────────────────────────────

/**
 * 将单条解析结果 POST 到后端，失败时写入待补传队列。
 * 内部自动重试 MAX_RETRIES 次（指数退避）。
 *
 * @param {object} data
 * @returns {Promise<{ success: boolean, status?: number, error?: string }>}
 */
async function uploadRecord(data, options = {}) {
  const { queueOnFailure = true } = options;
  const url     = `${CONFIG.API_BASE_URL}${CONFIG.ENDPOINT}`;
  const payload = buildPayload(data);
  console.log('[Scraper] Upload payload:', payload);
  const headers = {
    'Content-Type' : 'application/json',
    'TENANT-ID': '1827240738649612290',
  };

  let lastError = '';

  for (let attempt = 0; attempt <= CONFIG.MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, attempt * 1_000)); // 退避 1s / 2s
    }

    try {
      const response = await uploadViaBackground(url, payload, headers);

      if (!response.success) {
        throw new Error(response.error || 'Upload failed');
      }

      if (response.ok) {
        return { success: true, status: response.status };
      }

      // 4xx 不重试（客户端错误，重试无意义）
      if (response.status >= 400 && response.status < 500) {
        lastError = `HTTP ${response.status}: ${(response.text || '').slice(0, 120)}`;
        break;
      }

      // 5xx 继续重试
      lastError = `HTTP ${response.status}`;

    } catch (err) {
      lastError = err.name === 'AbortError' ? 'Request timed out' : err.message;
    }
  }

  // 上传失败 → 加入补传队列
  if (queueOnFailure) {
    await enqueueFailed(data);
  }
  return { success: false, error: lastError };
}

// ─────────────────────────────────────────────────────────────
// 3. 失败补传队列
// ─────────────────────────────────────────────────────────────

/** 将失败记录加入补传队列 */
async function enqueueFailed(data) {
  const result = await store.get([CONFIG.FAILED_KEY]);
  const queue  = result[CONFIG.FAILED_KEY] ?? [];
  const duplicate = queue.some(item =>
    item.data?.url === data.url &&
    item.data?.type === data.type &&
    item.data?.businessRegNo === data.businessRegNo
  );

  if (duplicate) return;

  queue.push({ data, failedAt: new Date().toISOString() });
  if (queue.length > 200) queue.splice(0, queue.length - 200);
  await store.set({ [CONFIG.FAILED_KEY]: queue });
}

/**
 * 重新尝试上传所有失败记录。
 *
 * @returns {Promise<{ retried: number, succeeded: number }>}
 */
async function retryFailed() {
  const result = await store.get([CONFIG.FAILED_KEY]);
  const queue  = result[CONFIG.FAILED_KEY] ?? [];
  if (queue.length === 0) return { retried: 0, succeeded: 0 };

  let succeeded = 0;
  const remaining = [];

  for (const item of queue) {
    const res = await uploadRecord(item.data, { queueOnFailure: false });
    if (res.success) {
      succeeded++;
    } else {
      remaining.push(item); // 还是失败，留着下次再试
    }
  }

  // 补传成功的从队列移除
  await store.set({ [CONFIG.FAILED_KEY]: remaining });
  return { retried: queue.length, succeeded };
}

// ─────────────────────────────────────────────────────────────
// 4. 文件导出
// ─────────────────────────────────────────────────────────────

/** JSON 格式 */
function toJSON(records) {
  return JSON.stringify(records, null, 2);
}

/** CSV 格式（自动推断列名，私有字段 _ 开头排最后） */
function toCSV(records) {
  if (records.length === 0) return '';

  const allKeys = [...new Set(records.flatMap(r => Object.keys(r)))];
  const keys    = [
    ...allKeys.filter(k => !k.startsWith('_')),
    ...allKeys.filter(k =>  k.startsWith('_')),
  ];

  const escape = v => {
    if (v == null) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const rows = records.map(r => keys.map(k => escape(r[k])).join(','));
  return [keys.join(','), ...rows].join('\n');
}

/** SQL 格式（MySQL INSERT 语句） */
function toSQL(records) {
  if (records.length === 0) return '-- No records to export\n';

  const table   = CONFIG.TABLE_NAME;
  const allKeys = [...new Set(records.flatMap(r => Object.keys(r)))];
  const cols    = [
    ...allKeys.filter(k => !k.startsWith('_')),
    '_savedAt',
    '_id',
  ];

  const escapeVal = v => {
    if (v == null)               return 'NULL';
    if (typeof v === 'number')   return v;
    if (typeof v === 'boolean')  return v ? 1 : 0;
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return `'${s.replace(/'/g, "''")}'`;
  };

  const colList = cols.map(c => `\`${c}\``).join(', ');
  const header  = [
    `-- Exported by Page Data Scraper`,
    `-- Table   : ${table}`,
    `-- Records : ${records.length}`,
    `-- Time    : ${new Date().toISOString()}`,
    '',
  ].join('\n');

  const inserts = records
    .map(r => `INSERT INTO \`${table}\` (${colList}) VALUES (${cols.map(k => escapeVal(r[k])).join(', ')});`)
    .join('\n');

  return header + inserts + '\n';
}

/**
 * 导出所有本地记录为文件并触发浏览器下载。
 * 下载动作由 background.js 代理执行（content script 无权调用 chrome.downloads）。
 *
 * @param {'json'|'csv'|'sql'} format
 * @returns {Promise<{ success: boolean, count: number, error?: string }>}
 */
async function exportToFile(format = 'json') {
  const result  = await store.get([CONFIG.STORE_KEY]);
  const records = result[CONFIG.STORE_KEY] ?? [];

  if (records.length === 0) {
    return { success: false, count: 0, error: 'No records to export' };
  }

  let content, mimeType, ext;

  switch (format) {
    case 'csv':
      content = toCSV(records); mimeType = 'text/csv';         ext = 'csv'; break;
    case 'sql':
      content = toSQL(records); mimeType = 'text/plain';        ext = 'sql'; break;
    default:
      content = toJSON(records); mimeType = 'application/json'; ext = 'json';
  }

  const ts       = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `scraper-${ts}.${ext}`;

  return new Promise(resolve => {
    chrome.runtime.sendMessage(
      { from: 'storage', action: 'download', payload: { content, mimeType, filename } },
      response => {
        if (response?.success) {
          resolve({ success: true, count: records.length });
        } else {
          resolve({ success: false, count: 0, error: response?.error ?? 'Download failed' });
        }
      }
    );
  });
}

// ─────────────────────────────────────────────────────────────
// 导出（挂载到 window 供 content.js 调用）
// ─────────────────────────────────────────────────────────────

Object.assign(window, {
  __scraper_saveRecord    : saveRecord,
  __scraper_uploadRecord  : uploadRecord,
  __scraper_retryFailed   : retryFailed,
  __scraper_exportToFile  : exportToFile,
  __scraper_getRecordCount: getRecordCount,
  __scraper_clearRecords  : clearRecords,
});
