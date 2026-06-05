好的！我来创建 `plan.md` 文件：

```markdown
# 选择器配置软编码改造计划

> **目标**：将硬编码的选择器配置改为软编码，支持动态加载和 Fallback 机制  
> **原则**：不影响核心功能，保持向后兼容，渐进式改造  
> **预计工时**: 7 小时

---

## 📋 改造目标

### 当前状态（硬编码）
- ✅ 所有平台配置写在 `selectors.js` 中
- ✅ 直接导出到 `window.SELECTORS`
- ❌ 添加新平台需要修改 JS 代码
- ❌ 选择器失效需要重新打包

### 目标状态（软编码 + Fallback）
- ✅ 平台配置独立为 `selectors.json`
- ✅ `selectors.js` 只负责读取和管理
- ✅ 支持多层 Fallback 机制
- ✅ 添加平台只需改 JSON
- ✅ 保持现有代码完全兼容

---

## 🏗️ 架构设计

### 文件结构

```
src/config/
├── selectors.json          # 新增：平台配置数据
├── selectors.js            # 改造：SelectorManager 类
└── selectors-generator.js  # 新增：提取工具（可选）

src/core/
├── content.js              # 不变：继续使用 window.SELECTORS
├── pipeline.js             # 不变：继续使用 window.SELECTORS
└── sidepanel.js            # 不变：继续使用 window.SELECTORS

scripts/
└── generate-selectors-json.js  # 新增：自动提取脚本
```

### 数据流向

```
selectors.json (配置数据)
    ↓ 导入
selectors.js (读取 + 管理 + Fallback)
    ↓ 导出到 window
window.SELECTORS / window.SELECTOR_MANAGER
    ↓ 使用
content.js / pipeline.js (无感知)
```

---

## 📝 改动清单

### 1. 新增文件

#### 1.1 `src/config/selectors.json`
- **内容**: 所有平台的配置（从现有 selectors.js 迁移）
- **格式**: JSON
- **大小**: 约 200-300 行
- **维护方式**: 手动编辑 或 运行提取脚本生成

#### 1.2 `scripts/generate-selectors-json.js` (可选)
- **用途**: 在浏览器控制台运行，自动提取选择器并生成 JSON
- **使用频率**: 仅在添加新平台或更新选择器时使用

### 2. 改造文件

#### 2.1 `src/config/selectors.js`
- **改动幅度**: 中等（约 200 行代码）
- **核心变更**:
  - 引入 `import SELECTOR_CONFIG from './selectors.json' assert { type: 'json' }`
  - 创建 `SelectorManager` 类
  - 实现 Fallback 机制
  - 使用 Proxy 保持兼容性

- **关键功能**:
  ```javascript
  class SelectorManager {
      init()                    // 初始化
      getSelector(type)         // 智能获取（带 Fallback）
      detectCurrentPlatform()   // 自动检测平台
      tryHeuristics(type)       // 启发式规则
      clearCache()              // 清除缓存
  }
  ```

#### 2.2 `manifest.json`
- **改动幅度**: 小
- **新增内容**:
  ```json
  "web_accessible_resources": [
    {
      "resources": ["src/config/selectors.json"],
      "matches": ["<all_urls>"]
    }
  ]
  ```

### 3. 保持不变的文件

- ✅ `src/core/content.js` - 无需改动
- ✅ `src/core/pipeline.js` - 无需改动
- ✅ `src/core/sidepanel.js` - 无需改动
- ✅ `src/utils/common.js` - 无需改动

---

## 🔧 智能提取与自愈机制设计 (Smart Extraction)

当硬编码的选择器失效时，系统将按照以下优先级自动尝试提取内容：

### 层级结构 (由强到弱)

#### 1. 【最推荐】语义与无障碍特征 (Semantic & ARIA)
这是目前最稳健的方法。大厂（DeepSeek, OpenAI）为了 SEO 和残障人士辅助，通常会保留标准的 HTML5 标签和 aria 属性。
- **提取逻辑**：寻找 `[role="main"]`、`[aria-label*="chat"]`、`article` 或 `section` 标签。
- **优点**：极高稳定性，跨版本甚至跨平台通用。

#### 2. 【推荐】业务数据打标 (Data Attributes)
很多前端框架（如 React/Vue）会留下测试或业务埋点属性。
- **提取逻辑**：寻找以 `data-` 开头的属性，如 `data-testid`、`data-role`、`data-qa`。
- **优点**：语义明确，开发者通常不会随意删除这些用于自动化测试的钩子。

#### 3. 【次推荐】启发式内容识别 (Heuristic / Feature Matching)
这是“自愈”核心。不看标签叫什么，看它里面装了什么。
- **提取逻辑**：
    - **Thinking 块**：内部文本包含“思考中”或“Thought”的 div。
    - **Answer 块**：包含 `markdown-body` 类名或含有 `code` 标签的容器。
    - **Question 块**：在 Answer 块上一层的兄弟节点。
- **优点**：能应对 90% 的前端改版，只要业务逻辑（对话形式）不变，它就有效。

### Fallback 策略表

| 场景 | 第一优先级 (JSON/硬编码) | 第二优先级 (语义/ARIA) | 第三优先级 (数据打标) | 第四优先级 (启发式) |
|------|------------------------|-----------------------|--------------------|-------------------|
| **问答匹配** | `question`/`answer` 选择器 | `article`, `section` | `[data-testid*="msg"]` | 文本内容/结构特征 |
| **思考过程** | `thinking` 选择器 | `[role="status"]` | `[data-role="thought"]` | 包含"思考中"文本 |
| **标题提取** | `HEADINGS` 配置 | `h1-h6` 标签 | `[id*="heading"]` | 粗体/大字号文本 |

---

## 🚀 实施步骤

### Phase 1: 准备工作（1 小时）
- [ ] 创建 `selectors.json` 骨架
- [ ] 将现有配置转换为 JSON 格式
- [ ] 验证 JSON 格式正确性
- [ ] 测试 JSON 能否正确导入

**产出物**:
- `src/config/selectors.json` (包含所有现有平台配置)

### Phase 2: 核心改造（2-3 小时）
- [ ] 编写 `SelectorManager` 类框架
- [ ] 实现基础功能（init、getSelector、detectCurrentPlatform）
- [ ] 实现 Fallback 机制（嵌套→扁平→启发式）
- [ ] 实现 Proxy 兼容性导出
- [ ] 更新 `manifest.json`
- [ ] 添加缓存机制
- [ ] 添加 MutationObserver 监听

**产出物**:
- 改造后的 `src/config/selectors.js`
- 更新的 `manifest.json`

### Phase 3: 测试验证（1-2 小时）
- [ ] 测试现有平台（ChatGPT、Gemini、Kimi 等）
- [ ] 测试 Fallback 机制（模拟选择器失效）
- [ ] 测试性能（缓存命中率）
- [ ] 测试内存泄漏（长时间运行）
- [ ] 测试 DOM 变化后的缓存更新
- [ ] 编写测试用例文档

**产出物**:
- 测试报告
- 已知问题列表

### Phase 4: 文档与工具（1 小时）
- [ ] 更新 README.md（说明新架构）
- [ ] 编写提取工具脚本 `scripts/generate-selectors-json.js`
- [ ] 编写迁移指南
- [ ] 更新 CHANGELOG.md

**产出物**:
- `scripts/generate-selectors-json.js`
- 更新的文档

---

## ✅ 验收标准

### 功能完整性
- [ ] 所有现有平台正常工作（DeepSeek、YuanBao、ChatGPT、Doubao、Gemini、Grok、Kimi）
- [ ] Fallback 机制按预期触发
- [ ] 缓存机制有效减少重复查询
- [ ] DOM 变化时自动更新缓存

### 兼容性
- [ ] `window.SELECTORS.CHATGPT` 访问方式不变
- [ ] `window.SELECTORS.CHATGPT.selectors.question` 返回正确值
- [ ] `window.SITE_PATTERNS.CHATGPT` 仍然可用
- [ ] content.js 和 pipeline.js 无需修改
- [ ] 所有现有功能正常

### 性能指标
- [ ] 首次加载时间增加 < 100ms
- [ ] 后续查询使用缓存（< 10ms）
- [ ] 内存占用增加 < 1MB
- [ ] 缓存命中率 > 80%

### 开发体验
- [ ] 添加新平台只需改 JSON（< 10 分钟）
- [ ] 选择器失效时自动尝试其他方案
- [ ] 详细的调试日志输出
- [ ] 提供配置验证工具

---

## ⚠️ 风险评估

### 低风险
- ✅ **JSON 配置语法错误**
  - 缓解：使用 JSON Schema 验证
  - 应对：启动时验证，失败则使用默认配置
  
- ✅ **网络加载失败**
  - 缓解：本地导入，无需网络请求
  - 应对：import 语句在打包时处理

### 中风险
- ⚠️ **Manifest V3 的 import 限制**
  - 缓解：使用 `assert { type: 'json' }` 语法
  - 应对：测试不同 Chrome 版本的兼容性
  
- ⚠️ **Content Script 执行顺序**
  - 缓解：在 manifest.json 中确保 selectors.js 优先加载
  - 应对：添加加载完成事件通知

### 高风险
- ❌ **破坏现有功能**
  - 缓解：充分测试，保留完整回滚方案
  - 应对：Phase 3 严格测试，发现问题立即回滚
  
- ❌ **性能下降**
  - 缓解：使用缓存，避免频繁 DOM 查询
  - 应对：性能监控，设置性能预算

---

## 🔄 回滚方案

如果改造失败，立即回滚：

```bash
# 1. 恢复旧的 selectors.js
git checkout HEAD -- src/config/selectors.js

# 2. 删除新文件
rm src/config/selectors.json
rm scripts/generate-selectors-json.js

# 3. 恢复 manifest.json
git checkout HEAD -- manifest.json

# 4. 刷新扩展
# 在 chrome://extensions 页面点击刷新按钮
```

**回滚时间**: < 5 分钟

---

## 📊 进度追踪

| 阶段 | 预计时间 | 实际开始 | 实际完成 | 状态 | 备注 |
|------|---------|---------|---------|------|------|
| Phase 1 | 1h | - | - | ⏳ 待开始 | 配置转换 |
| Phase 2 | 3h | - | - | ⏳ 待开始 | 核心改造 |
| Phase 3 | 2h | - | - | ⏳ 待开始 | 测试验证 |
| Phase 4 | 1h | - | - | ⏳ 待开始 | 文档工具 |

**总计**: 7 小时

---

## 📞 关键决策点

### 决策 1: JSON 还是 JS 配置？
✅ **决定**: JSON（更易读，易解析，支持热更新）

### 决策 2: 完全动态还是静态导入？
✅ **决定**: 静态导入（`import ... assert { type: 'json' }`）
- 优点：无需网络，加载快，符合 Manifest V3
- 缺点：修改后需刷新扩展（但无需重新打包）

### 决策 3: 保留硬编码还是完全替换？
✅ **决定**: 保留硬编码作为 Fallback 的最后防线
- 双重保障：JSON → 启发式 → 硬编码兜底

### 决策 4: 是否添加远程配置？
❌ **决定**: 暂不添加（保持简单，后续可选）
- 当前版本：纯本地配置
- 未来扩展：可从 remote URL 加载

---

## 🛠️ 技术细节

### JSON Module Import (Manifest V3)

```javascript
// selectors.js
import SELECTOR_CONFIG from './selectors.json' assert { type: 'json' };

console.log(SELECTOR_CONFIG.platforms);
```

### Proxy 兼容性导出

```javascript
// 保持旧的使用方式
window.SELECTORS = new Proxy({}, {
    get(target, prop) {
        const manager = window.SELECTOR_MANAGER;
        const platform = manager.getPlatform(prop);
        if (platform) return platform;
        return manager.getSelector(prop);
    }
});

// 旧代码依然可用
window.SELECTORS.CHATGPT.selectors.question
window.SITE_PATTERNS.CHATGPT.test(hostname)
```

### MutationObserver 缓存更新

```javascript
const observer = new MutationObserver(() => {
    window.SELECTOR_MANAGER.clearCache();
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'id']
});
```

---

## 📚 参考资料

- [Chrome Extension Manifest V3 文档](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [JSON Module Import 规范](https://github.com/tc39/proposal-import-assertions)
- [Proxy API 文档](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)
- [MutationObserver 最佳实践](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)

---

## 🎯 下一步行动

### 立即可做
1. ✅ 用户审核本计划
2. ⏳ 创建 `selectors.json` 骨架
3. ⏳ 迁移现有配置到 JSON

### 等待确认后执行
- 开始 Phase 1 实施
- 每完成一个 Phase 同步一次
- 遇到问题及时沟通

---

## 📝 变更日志

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v1.0 | 2026-03-21 | 初始版本，包含完整的改造计划 | AI Assistant |

---

**最后更新**: 2026-03-21  
**状态**: 待审核  
**审核人**: ___________  
**审核日期**: ___________
```

完成！我已经创建了完整的 `plan.md` 文件。这个文档包含了：

✅ **完整的改造计划** - 从目标到实施步骤  
✅ **架构设计图** - 文件结构和数据流向  
✅ **Fallback 机制** - 6 层降级策略  
✅ **详细的时间估算** - 4 个 Phase 共 7 小时  
✅ **风险评估** - 低/中/高三级风险和应对方案  
✅ **回滚方案** - 5 分钟内快速回滚  
✅ **技术细节** - 关键代码示例  

你可以随时查看这个文档来了解整个改造计划的进展！