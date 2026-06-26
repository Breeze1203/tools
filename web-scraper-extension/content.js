/**
 * content.js
 *
 * 职责：页面加载后协调解析与存储。
 * 执行顺序：
 *   1. 调用 parser.js 解析当前页面
 *   2. 并行执行：本地保存 + HTTP 上传
 *   3. 补传上次失败的记录
 *   4. 上报状态给 background.js（供 popup 展示）
 *
 * 该文件通常不需要修改。
 */

'use strict';

(async function main() {
  // 跳过 iframe，只在顶层页面执行
  if (window !== window.top) return;

  const { __scraper_parsePage, __scraper_saveRecord,
          __scraper_uploadRecord, __scraper_retryFailed } = window;

  if (!__scraper_parsePage || !__scraper_saveRecord) {
    console.error('[Scraper] Core modules not loaded.');
    return;
  }

  // ── Step 1：解析 ──────────────────────────────────────
  const { data, parserKey, error: parseError } = __scraper_parsePage();
  console.log(data);

  if (parseError) {
    // 非目标页面，静默忽略
    if (parseError.startsWith('No parser for')) return;
    console.warn('[Scraper] Parse error:', parseError);
    notify({ status: 'parse_error', detail: parseError });
    return;
  }

  console.log(`[Scraper] Parsed (${parserKey}):`, data);

  // ── Step 2：并行 — 本地保存 & HTTP 上传 ───────────────
  const [saveResult, uploadResult] = await Promise.all([
    __scraper_saveRecord(data),
    __scraper_uploadRecord(data),
  ]);

  // 本地保存结果
  if (saveResult.duplicate) {
    console.log('[Scraper] Duplicate record, skipped local save.');
  } else {
    console.log(`[Scraper] Saved locally. Total: ${saveResult.total}`);
  }

  // HTTP 上传结果
  if (uploadResult.success) {
    console.log(`[Scraper] Uploaded. HTTP ${uploadResult.status}`);
  } else {
    console.warn('[Scraper] Upload failed, queued for retry:', uploadResult.error);
  }

  notify({
    status      : uploadResult.success ? 'uploaded' : 'upload_failed',
    parserKey,
    localTotal  : saveResult.total,
    duplicate   : saveResult.duplicate,
    uploadError : uploadResult.error ?? null,
  });

  // ── Step 3：补传历史失败记录 ──────────────────────────
  if (__scraper_retryFailed) {
    const { retried, succeeded } = await __scraper_retryFailed();
    if (retried > 0) {
      console.log(`[Scraper] Retry: ${succeeded}/${retried} succeeded.`);
    }
  }
})();

/**
 * 向 background service worker 发送状态消息。
 * @param {object} payload
 */
function notify(payload) {
  try {
    chrome.runtime.sendMessage({ from: 'content', ...payload });
  } catch (_) {
    // 扩展被禁用或页面卸载时忽略
  }
}
