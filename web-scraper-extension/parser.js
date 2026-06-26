/**
 * ============================================================
 *  parser.js — 页面解析模块
 * ============================================================
 *  职责：从当前页面 DOM 中提取数据，返回结构化对象。
 *  规则：
 *    - 只做解析，不做网络请求，不做存储
 *    - 解析失败时返回 null，由调用方处理错误
 *    - 每个解析器是独立函数，便于单独测试和替换
 *
 *  ✏️  修改指南：
 *    1. 在 PARSERS 对象中新增一个 key（对应域名或页面类型）
 *    2. 实现对应的解析函数，返回你需要的字段
 *    3. parsePage() 会自动根据当前 URL 选择合适的解析器
 * ============================================================
 */

// ─────────────────────────────────────────
//  各站点解析器（按需增删）
// ─────────────────────────────────────────

const PARSERS = {

  /**
   * 示例解析器：文章/博客页
   * 匹配规则：URL 包含 "example-blog.com"
   */
 "breeze1203.github.io": function parseBreezePage() {
    const titleEl = document.querySelector("h1");

    return {
      type: "breeze_page",
      title: titleEl ? titleEl.textContent.trim() : document.title,
      url: location.href,
      parsedAt: new Date().toISOString()
    };
  },

};

// ─────────────────────────────────────────
//  通用解析调度器（一般不需要修改）
// ─────────────────────────────────────────

/**
 * 根据当前页面 URL 自动选择解析器并执行
 * @returns {{ data: object|null, parserKey: string|null, error: string|null }}
 */
function parsePage() {
  const hostname = location.hostname;
  console.log(hostname);

  // 找到匹配的解析器（支持子域名：key 是 hostname 的子串即可）
  const matchedKey = Object.keys(PARSERS).find(key => hostname.includes(key));

  if (!matchedKey) {
    return { data: null, parserKey: null, error: `No parser for: ${hostname}` };
  }

  try {
    const data = PARSERS[matchedKey]();
    if (!data) {
      return { data: null, parserKey: matchedKey, error: "Parser returned null (target element not found)" };
    }
    return { data, parserKey: matchedKey, error: null };
  } catch (err) {
    return { data: null, parserKey: matchedKey, error: err.message };
  }
}

// 挂载到 window 供 content.js 调用（content script 共享 window 作用域）
window.__scraper_parsePage = parsePage;
