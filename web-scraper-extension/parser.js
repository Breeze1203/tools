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

  // ─────────────────────────────────────────────────────────────
  //  香港公司注册处 — 公司基本资料页
  //  目标 URL 示例：https://www.e-services.cr.gov.hk/...
  // ─────────────────────────────────────────────────────────────
  "cr.gov.hk": function parseHKCompanyInfo() {
    const debug = {
      parser: 'parseHKCompanyInfo',
      href: location.href,
      pagePath: location.pathname,
      rowCount: document.querySelectorAll('tr').length,
      vuePlaceholders: document.querySelectorAll('ps-company-name-base-information').length,
      rootDataBrNo: extractRootDataBrNo(),
      hits: {},
      misses: [],
    };
    window.__scraper_lastParseDebug = debug;

    if (!isCompanyBaseInformationPage()) {
      debug.skipReason = 'not_company_base_information_page';
      return null;
    }

    /**
     * 从表格中按标签文字提取对应值。
     *
     * 页面是标准两列表格：
     *   <tr>
     *     <td>商业登记号码</td>   ← label cell（通常是第 0 列）
     *     <td>66748692</td>       ← value cell（通常是第 1 列）
     *   </tr>
     *
     * 策略：
     *   1. 优先匹配 <tr> 里第 0 个 <td> / <th> 文字 → 取第 1 个 <td>
     *   2. 若表格结构不标准，回退到相邻兄弟元素
     */
    function normalizeLabel(text) {
      return (text || '').replace(/\s+/g, '').replace(/：|:/g, '');
    }

    function isCompanyBaseInformationPage() {
      return /\/ps\/company-name\/base-information\//.test(location.pathname);
    }

    function extractRootDataBrNo() {
      for (const script of document.scripts) {
        const text = script.textContent || '';
        if (!text.includes('rootData') || !text.includes('brNo')) continue;

        const match = text.match(/\brootData\s*=\s*({[\s\S]*?});/);
        if (!match) continue;

        try {
          return JSON.parse(match[1])?.brNo ?? null;
        } catch (_) {
          const brNoMatch = match[1].match(/"brNo"\s*:\s*"([^"]+)"/);
          return brNoMatch?.[1] ?? null;
        }
      }

      return null;
    }

    function extractByLabel(labelText, aliases = []) {
      const needles = [labelText, ...aliases].map(normalizeLabel).filter(Boolean);
      const primaryLabel = labelText;

      // ── 策略 1：标准 <tr><td>label</td><td>value</td></tr> ──
      const rows = document.querySelectorAll('tr');
      for (const row of rows) {
        const cells = row.querySelectorAll('td, th');
        if (cells.length < 2) continue;

        const labelCell = normalizeLabel(cells[0].textContent);
        if (needles.some(needle => labelCell === needle || labelCell.includes(needle))) {
          // 取第 1 列，若有多个子节点则取第一个非空文本
          const valueCell = cells[1];
          const text = valueCell.textContent.trim();
          if (text) {
            debug.hits[primaryLabel] = { strategy: 'table-row', valuePreview: text.slice(0, 80) };
            return text;
          }
        }
      }

      // ── 策略 2：非 tr 的 label/value 并排容器（div 两列布局）──
      // 查找包含 label 文字的最小叶子节点，然后取其父行容器的下一个子节点
      const allEls = document.querySelectorAll('td, th, div, span, p, dt');
      for (const el of allEls) {
        // 只取自身文字，不含子元素（避免父容器文字累积）
        const own = Array.from(el.childNodes)
          .filter(n => n.nodeType === Node.TEXT_NODE)
          .map(n => normalizeLabel(n.textContent))
          .join('');

        if (!needles.some(needle => own === needle || own.includes(needle))) continue;

        // 同级下一个兄弟
        let sib = el.nextElementSibling;
        while (sib) {
          const v = sib.textContent.trim();
          if (v && !needles.includes(normalizeLabel(v))) {
            debug.hits[primaryLabel] = { strategy: 'next-sibling', valuePreview: v.slice(0, 80) };
            return v;
          }
          sib = sib.nextElementSibling;
        }

        // 父容器的下一个兄弟（处理 <div><div>label</div></div><div>value</div>）
        const parentSib = el.parentElement?.nextElementSibling;
        if (parentSib) {
          const v = parentSib.textContent.trim();
          if (v) {
            debug.hits[primaryLabel] = { strategy: 'parent-next-sibling', valuePreview: v.slice(0, 80) };
            return v;
          }
        }
      }

      debug.misses.push(primaryLabel);
      return null;
    }

    /** 清理多余空白和换行 */
    function clean(text) {
      return text ? text.replace(/\s+/g, ' ').trim() : null;
    }

    function isValidBusinessRegNo(value) {
      return /^[A-Z]?\d{7,8}$/i.test(value || '');
    }

    function splitLines(text) {
      return (text || '')
        .split(/\r?\n/)
        .map(clean)
        .filter(Boolean);
    }

    // 核心字段：商业登记号码（作为页面识别锚点）
    const businessRegNo = clean(extractByLabel('商业登记号码', ['商業登記號碼', 'Business Registration Number']));
    if (!businessRegNo) {
      debug.skipReason = 'business_registration_number_not_found';
      return null;
    }

    if (!isValidBusinessRegNo(businessRegNo)) {
      debug.skipReason = 'invalid_business_registration_number';
      debug.rejectedBusinessRegNoPreview = businessRegNo.slice(0, 120);
      return null;
    }

    const companyNameLines = splitLines(extractByLabel('公司名称', ['公司名稱', 'Company Name']));

    return {
      type               : 'hk_company_base_information',
      businessRegNo,
      companyNameEn      : companyNameLines[0] ?? null, // 英文名在第一行
      companyNameZh      : companyNameLines[1] ?? null, // 中文名在第二行（若有）
      companyType        : clean(extractByLabel('公司类别', ['公司類別', 'Company Type'])),
      incorporationDate  : clean(extractByLabel('成立日期', ['Date of Incorporation'])),
      status             : clean(extractByLabel('公司现况', ['公司現況', 'Company Status'])),
      remarks            : clean(extractByLabel('备注', ['備註', 'Remarks'])),
      liquidationMode    : clean(extractByLabel('清盘模式', ['清盤模式', 'Mode of Winding Up'])),
      chargeRegistration : clean(extractByLabel('押记登记册', ['押記登記冊', 'Register of Charges'])),
      importantMatters   : clean(extractByLabel('重要事项', ['重要事項', 'Important Note'])),
      url                : location.href,
      parsedAt           : new Date().toISOString(),
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
  window.__scraper_lastParseDebug = null;

  // 找到匹配的解析器（支持子域名：key 是 hostname 的子串即可）
  const matchedKey = Object.keys(PARSERS).find(key => hostname.includes(key));

  if (!matchedKey) {
    return { data: null, parserKey: null, error: `No parser for: ${hostname}`, debug: null };
  }

  try {
    const data = PARSERS[matchedKey]();
    const debug = window.__scraper_lastParseDebug ?? null;
    if (!data) {
      return { data: null, parserKey: matchedKey, error: "Parser returned null (target element not found)", debug };
    }
    return { data, parserKey: matchedKey, error: null, debug };
  } catch (err) {
    return { data: null, parserKey: matchedKey, error: err.message, debug: window.__scraper_lastParseDebug ?? null };
  }
}

// 挂载到 window 供 content.js 调用（content script 共享 window 作用域）
window.__scraper_parsePage = parsePage;
