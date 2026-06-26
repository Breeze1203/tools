# Page Data Scraper — 浏览器扩展

访问目标网页 → 自动解析指定元素 → 上传到后端数据库。

---

## 项目结构

```
web-scraper-extension/
├── manifest.json       # 扩展配置（Manifest V3）
├── parser.js           # ✏️ 解析逻辑（你只需改这里）
├── storage.js          # ✏️ 上传配置（改 API 地址和 Token）
├── content.js          # 主调度入口（一般不需要改）
├── background.js       # Service Worker，负责日志中转
├── popup.html          # 弹窗页面
├── popup.js            # 弹窗逻辑
└── icons/              # 扩展图标
```

---

## 快速开始

### 1. 对接你的后端

打开 `storage.js`，修改顶部配置：

```js
const DB_CONFIG = {
  API_BASE_URL : "https://your-api.com/api",  // ← 改成你的后端
  ENDPOINT     : "/scrape-data",
  AUTH_TOKEN   : "YOUR_SECRET_TOKEN",
};
```

后端接收到的 POST body 结构：

```json
{
  "source"   : "https://example.com/product/123",
  "type"     : "shop_product",
  "payload"  : { /* parser.js 返回的完整对象 */ },
  "clientTs" : "2025-01-01T12:00:00.000Z"
}
```

### 2. 添加你的解析器

打开 `parser.js`，在 `PARSERS` 对象里添加：

```js
"your-target-site.com": function parseXxx() {
  const titleEl = document.querySelector(".your-selector");
  if (!titleEl) return null;   // 不是目标页面时返回 null

  return {
    type    : "your_type",           // 用于后端路由到对应数据库表
    title   : titleEl.textContent.trim(),
    price   : document.querySelector(".price")?.textContent.trim(),
    url     : location.href,
    parsedAt: new Date().toISOString(),
  };
},
```

**规则**：
- `key` 是目标站点的域名片段（支持子域名匹配）
- 找不到核心元素时返回 `null`（框架会静默跳过）
- 返回任意你需要的字段，框架完整透传给后端

### 3. 安装扩展

1. Chrome 地址栏打开 `chrome://extensions/`
2. 右上角开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本项目文件夹

### 4. 验证效果

访问目标网站，点击工具栏扩展图标，可以看到：
- 🟢 **上传成功** — 数据已写入数据库
- 🔵 **已解析** — 解析成功，但上传还在处理中
- 🔴 **上传失败** — 网络问题，数据已缓存本地，下次自动重传
- 🟡 **解析出错** — 检查你的 CSS 选择器

---

## 数据流

```
页面加载完成
     │
     ▼
parser.js.parsePage()        ← 你在这里实现解析逻辑
     │ { data, parserKey, error }
     ▼
content.js                   ← 协调调度（无需修改）
     │ data
     ▼
storage.js.uploadData()      ← POST 到你的后端 API
     │
     ├─ 成功 → 通知 background.js → popup 显示绿色
     └─ 失败 → cacheLocally() → 下次页面加载时重试
```

---

## 常见问题

**Q: 我希望只在特定页面触发，不是整个域名**

在解析函数里加路径判断：
```js
if (!location.pathname.startsWith("/product/")) return null;
```

**Q: 如何调试解析结果？**

打开目标页面，F12 → Console，搜索 `[Scraper]` 前缀的日志。

**Q: 上传接口需要特殊认证格式**

修改 `storage.js` 里的 `headers` 对象，按你的后端要求调整。

**Q: 想支持多个不同域名**

在 `PARSERS` 里加多个 key 即可，每个 key 独立匹配独立解析。
