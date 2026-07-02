/**
 * content.js
 *
 * The content script stays idle after injection. The popup sends a
 * `collect` message when the user clicks "Start collection".
 */

'use strict';

(function main() {
  if (window.__scraper_contentReady) return;
  window.__scraper_contentReady = true;

  log('debug', 'Content script ready', { href: location.href });

  if (window !== window.top) {
    log('frame_skipped', 'Iframe matched but collection is disabled for frames', { href: location.href });
    return;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.from !== 'popup' || message?.action !== 'collect') return;

    collect()
      .then(result => sendResponse(result))
      .catch(err => {
        log('parse_error', err.message);
        sendResponse({ success: false, error: err.message });
      });

    return true;
  });
})();

let isCollecting = false;

async function collect() {
  if (isCollecting) {
    return { success: false, error: 'Collection is already running' };
  }

  isCollecting = true;
  log('collecting', 'Collection started', { href: location.href });

  try {
    const {
      __scraper_parsePage,
      __scraper_saveRecord,
      __scraper_uploadRecord,
      __scraper_retryFailed,
    } = window;

    if (!__scraper_parsePage || !__scraper_saveRecord) {
      console.error('[Scraper] Core modules not loaded.');
      log('core_missing', 'Core modules not loaded');
      return { success: false, error: 'Core modules not loaded' };
    }

    const { data, parserKey, error: parseError, debug: parseDebug } =
      await parseWhenReady(__scraper_parsePage);
    console.log(data);

    if (parseError) {
      if (parseError.startsWith('No parser for')) {
        log('no_parser', parseError);
        return { success: false, error: parseError };
      }

      console.warn('[Scraper] Parse error:', parseError);
      log('parse_error', buildParseDetail(parseError, parseDebug), { parserKey, parseDebug });
      return { success: false, error: parseError };
    }

    console.log(`[Scraper] Parsed (${parserKey}):`, data);
    log('parsed', buildParseDetail('Page parsed', parseDebug, data), { parserKey, data, parseDebug });

    const [saveResult, uploadResult] = await Promise.all([
      __scraper_saveRecord(data),
      __scraper_uploadRecord(data),
    ]);

    if (saveResult.duplicate) {
      console.log('[Scraper] Duplicate record, skipped local save.');
    } else {
      console.log(`[Scraper] Saved locally. Total: ${saveResult.total}`);
    }

    if (uploadResult.skipped) {
      console.log(`[Scraper] Upload skipped. HTTP ${uploadResult.status}: ${uploadResult.detail}`);
    } else if (uploadResult.success) {
      console.log(`[Scraper] Uploaded. HTTP ${uploadResult.status}`);
    } else {
      console.warn('[Scraper] Upload failed, queued for retry:', uploadResult.error);
    }

    const uploadStatus = uploadResult.skipped
      ? 'upload_skipped'
      : (uploadResult.success ? 'uploaded' : 'upload_failed');
    const uploadDetail = uploadResult.detail ?? (uploadResult.success ? 'Uploaded' : 'Upload failed');

    log(uploadStatus, uploadDetail, {
      parserKey,
      localTotal: saveResult.total,
      duplicate: saveResult.duplicate,
      uploadError: uploadResult.error ?? null,
      uploadResult: uploadResult.result ?? null,
    });

    if (__scraper_retryFailed) {
      const { retried, succeeded } = await __scraper_retryFailed();
      if (retried > 0) {
        console.log(`[Scraper] Retry: ${succeeded}/${retried} succeeded.`);
      }
    }

    return { success: true, parserKey, data, saveResult, uploadResult };
  } finally {
    isCollecting = false;
  }
}

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

function notify(payload) {
  try {
    chrome.runtime.sendMessage({ from: 'content', ...payload });
  } catch (_) {
    // Extension was disabled or the page unloaded.
  }
}
