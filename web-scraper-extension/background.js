/**
 * background.js — Service Worker
 *
 * 职责：
 *   1. 接收 content.js 状态消息并缓存，供 popup 查询
 *   2. 代理 chrome.downloads（content script 无此权限）
 */

'use strict';

let recentLogs = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.from === 'storage' && message.action === 'upload') {
    const { url, payload, headers, timeoutMs } = message.payload;

    uploadJson({ url, payload, headers, timeoutMs })
      .then(sendResponse)
      .catch(err => sendResponse({ success: false, error: err.message }));

    return true;
  }

  // ── 文件下载代理 ────────────────────────────────────────
  if (message.from === 'storage' && message.action === 'download') {
    const { content, mimeType, filename } = message.payload;

    try {
      // Service Worker 无 Blob API，用 base64 Data URL 代替
      const base64  = btoa(unescape(encodeURIComponent(content)));
      const dataUrl = `data:${mimeType};base64,${base64}`;

      chrome.downloads.download({ url: dataUrl, filename, saveAs: true }, downloadId => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, downloadId });
        }
      });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }

    return true; // 保持异步 sendResponse 通道
  }

  // ── 状态日志 ────────────────────────────────────────────
  if (message.from === 'content') {
    const log = {
      ...message,
      tabId    : sender.tab?.id,
      tabUrl   : sender.tab?.url,
      timestamp: new Date().toISOString(),
    };

    recentLogs.unshift(log);
    if (recentLogs.length > 30) recentLogs.pop();

    // 优先写 session storage（重启后自动清空），降级写 local
    chrome.storage.session
      .set({ scraper_logs: recentLogs })
      .catch(() => chrome.storage.local.set({ scraper_logs: recentLogs }));
  }
});

async function uploadJson({ url, payload, headers = {}, timeoutMs = 8000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await response.text().catch(() => '');
    return {
      success: true,
      ok: response.ok,
      status: response.status,
      text: text.slice(0, 500),
    };
  } catch (err) {
    return {
      success: false,
      error: err.name === 'AbortError' ? 'Request timed out' : err.message,
    };
  } finally {
    clearTimeout(timer);
  }
}
