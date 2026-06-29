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
  log('debug', 'Content script injected', { href: location.href });

  // 跳过 iframe，只在顶层页面执行
  if (window !== window.top) {
    log('frame_skipped', 'Iframe matched but parsing is disabled for frames', { href: location.href });
    return;
  }

  const { __scraper_parsePage, __scraper_saveRecord,
          __scraper_uploadRecord, __scraper_retryFailed } = window;

  if (!__scraper_parsePage || !__scraper_saveRecord) {
    console.error('[Scraper] Core modules not loaded.');
    log('core_missing', 'Core modules not loaded');
    return;
  }

  // ── Step 1：解析 ──────────────────────────────────────
  const { data, parserKey, error: parseError, debug: parseDebug } = await parseWhenReady(__scraper_parsePage);
  console.log(data);

  if (parseError) {
    // 非目标页面，静默忽略
    if (parseError.startsWith('No parser for')) {
      log('no_parser', parseError);
      return;
    }
    console.warn('[Scraper] Parse error:', parseError);
    log('parse_error', buildParseDetail(parseError, parseDebug), { parserKey, parseDebug });
    return;
  }

  console.log(`[Scraper] Parsed (${parserKey}):`, data);
  log('parsed', buildParseDetail('Page parsed', parseDebug, data), { parserKey, data, parseDebug });

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

  log(uploadResult.success ? 'uploaded' : 'upload_failed', uploadResult.success ? 'Uploaded' : 'Upload failed', {
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

function log(status, detail, extra = {}) {
  console.log('[Scraper]', status, detail, extra);
  notify({ status, detail, ...extra });
}

async function parseWhenReady(parsePage) {
  const timeoutMs = 12_000;
  const intervalMs = 500;
  const startedAt = Date.now();
  let lastResult = null;
  let attempts = 0;

  while (Date.now() - startedAt <= timeoutMs) {
    attempts += 1;
    lastResult = parsePage();

    if (!lastResult.error || lastResult.error.startsWith('No parser for')) {
      return lastResult;
    }

    if (!lastResult.error.includes('target element not found')) {
      return lastResult;
    }

    if (attempts === 1) {
      log('parse_wait', buildParseDetail('Waiting for Vue content', lastResult.debug), {
        parserKey: lastResult.parserKey,
        parseDebug: lastResult.debug,
      });
    }

    await waitForDomChangeOrTimeout(intervalMs);
  }

  return lastResult ?? parsePage();
}

function waitForDomChangeOrTimeout(timeoutMs) {
  return new Promise(resolve => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      observer.disconnect();
      clearTimeout(timer);
      resolve();
    };

    const observer = new MutationObserver(finish);
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    const timer = setTimeout(finish, timeoutMs);
  });
}

function buildParseDetail(message, debug, data = null) {
  const parts = [message];
  if (data?.businessRegNo) parts.push(`BR: ${data.businessRegNo}`);
  if (debug) {
    const hitCount = Object.keys(debug.hits ?? {}).length;
    const misses = (debug.misses ?? []).slice(0, 5).join(', ');
    parts.push(`rows: ${debug.rowCount ?? 0}`);
    parts.push(`hits: ${hitCount}`);
    if (debug.vuePlaceholders != null) parts.push(`vue: ${debug.vuePlaceholders}`);
    if (debug.rootDataBrNo) parts.push(`root BR: ${debug.rootDataBrNo}`);
    if (debug.skipReason) parts.push(`skip: ${debug.skipReason}`);
    if (debug.rejectedBusinessRegNoPreview) parts.push(`rejected: ${debug.rejectedBusinessRegNoPreview}`);
    if (misses) parts.push(`misses: ${misses}`);
  }
  return parts.join(' | ');
}

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
