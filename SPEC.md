# shopify-storefront-lite 功能规格说明书 (SPEC)

## 1. 概述与定位

`shopify-storefront-lite` 是一个针对 Shopify Headless 电商独立站的**框架无关（Framework-Agnostic）轻量店面与购物车核心逻辑脚手架**。

原项目 `VienDinhCom/next-shopify-storefront` 是一个基于 Next.js + React + `@shopify/hydrogen-react` 的购物车脚手架，但其核心业务逻辑与 Next.js 框架、特定 UI 库及作者自研工具链（`@esmate/*`）强绑定，无法在纯客户端应用、Vite/SPA、Vue/Svelte/Astro、移动端或 Node.js BFF 等非 Next.js 场景中复用。

本项目采用 **B 路线（按思路重写）**，仅参考原项目的公开功能行为与设计理念，完全独立从零设计实现：
- 核心层与任何 UI 框架解耦，提供零重度依赖的 Pure TypeScript 核心；
- 购物车与结账流程封装为标准、可插拔、可订阅的独立核心模块；
- 原生内置 Mock / Offline 模式，无需申请 Shopify 开发者令牌即可即时启动体验与完整走通流程；
- 附带可独立运行的最小示例店面（Minimal Example Storefront），验证完整电商业务闭环。

---

## 2. 借鉴的功能点清单

通过对原项目文档及公开行为的梳理，本项目借鉴并重新规范以下核心电商功能点：

1. **Shopify Storefront GraphQL API 集成**：
   - 提供向 Shopify Storefront API 发起 GraphQL 请求的标准通信协议；
   - 支持自定义 Storefront 访问令牌、域名、API 版本（支持最新 2025/2026 版本）；
   - 请求错误捕获、网络重试与标准类型解析。

2. **店面展示与商品目录（Catalog & Products）**：
   - 商品列表检索（支持分页、Collection 筛选、排序）；
   - 商品详情呈现（标题、描述、媒体图集、价格、原价与促销标识、库存状态）；
   - 复杂多规格变体（Variants & Options）关联与选择计算（如颜色、尺码、材质的联动过滤与匹配）。

3. **购物车核心生命周期管理（Cart Core Management）**：
   - 购物车的创建、持久化与恢复（Session / LocalStorage）；
   - 行项目（Line Items）操作：加入购物车（Add to Cart）、增减数量（Update Quantity）、移除商品（Remove Line）；
   - 促销折扣码支持（Apply / Remove Discount Codes）；
   - 购买者身份与订单备注附加（Buyer Identity & Cart Notes）；
   - 购物车总金额、税额、运费与商品总件数实时计算；
   - 乐观更新（Optimistic Updates）与网络失败自动回滚机制。

4. **结账流程编排（Checkout Orchestration）**：
   - 将购物车状态转换为 Shopify 结账凭证（Checkout URL）；
   - 安全的重定向跳转与结账参数透传；
   - 结账前库存与有效性验证。

5. **响应式状态通知与事件系统**：
   - 核心状态采用观察者/发布订阅模式，任何框架（React / Vue / 原生 DOM）均可一行代码监听状态变更并自动重渲染。

---

## 3. 与原思路的关系与差异化要点

| 维度 | 原项目 (next-shopify-storefront) | 重写项目 (shopify-storefront-lite) |
| :--- | :--- | :--- |
| **框架依赖** | 强绑定 Next.js 16 + React 18 + `@shopify/hydrogen-react` | **框架无关**：纯 TypeScript 编写，无特定框架强依赖，附带通用 React Hooks 与原生适配 |
| **工具链依赖** | 依赖作者私有工具集（`esmate`、`@esmate/shadcn`、`@esmate/react` 等） | **标准现代工具链**：仅使用标准 npm / Node.js 现代生态，无任何专有黑盒工具 |
| **API 通信层** | 依赖复杂 `@graphql-codegen` 编译期静态生成，无凭证时无法开发调试 | **轻量标准化 GraphQL 客户端**：内置请求抽象，免编译期死锁；且**内置 Mock 模式**，离线可即开即测 |
| **购物车逻辑** | 散落在 React Context 与 Hydrogen 组件中，难以单独提取测试 | **高内聚可复用核心模块 (`CartManager`)**：支持订阅、中间件、可插拔存储适配器（LocalStorage / Memory / Cookie） |
| **代码实现** | 原项目源码（Next.js App Router 结构） | **100% 独立干净重写**，完全无原项目代码文件，无函数级雷同 |
| **轻量化程度** | 依赖臃肿（含代码生成器、多重 PostCSS 转换等） | 极轻体量，分层清晰，加载迅速，易于嵌入现有项目 |

---

## 4. 架构设计与模块划分

```
shopify-storefront-lite/
├── src/
│   ├── core/                      # 框架无关纯逻辑核心
│   │   ├── client/                # Shopify Storefront API 客户端 (含 Live & Mock 实现)
│   │   ├── cart/                  # 购物车状态管理器、存储驱动与计算
│   │   ├── checkout/              # 结账流程编排与跳转处理
│   │   ├── products/              # 商品检索、变体筛选与金额格式化工具
│   │   └── types.ts               # 统一领域模型类型定义 (Cart, Product, Variant, Money 等)
│   ├── adapters/                  # 框架适配层 (可选消费)
│   │   └── react/                 # React 适配 hooks (useCart, useProduct, useShopify)
│   ├── demo/                      # 最小可运行示例店面
│   │   ├── public/                # 示例静态资产
│   │   ├── server.ts              # 轻量本地静态/API 演示服务
│   │   └── index.html             # 交互式完整体验页面 (商品展示、规格选择、抽屉购物车、结账)
│   └── index.ts                   # 顶层统一导出入口
├── tests/                         # 自动化单元测试与端到端核心流程测试
│   ├── client.test.ts             # 客户端通信与 Mock 测试
│   ├── cart.test.ts               # 购物车全生命周期测试
│   ├── checkout.test.ts           # 结账逻辑测试
│   └── products.test.ts           # 商品与变体匹配测试
├── LICENSE                        # 保留原 MIT 许可证
├── PROVENANCE.md                  # 原项目来源记录
├── TASK.md                        # 任务定义
├── SPEC.md                        # 本功能规格说明与自测记录
├── README.md                      # 中英双语完整文档
├── package.json                   # 纯净依赖声明
└── tsconfig.json                  # 标准 TypeScript 配置
```

---

## 5. 核心接口规范定义

### 5.1 领域模型 (Types)

```typescript
export interface Money {
  amount: number;
  currencyCode: string;
}

export interface ProductVariant {
  id: string;
  title: string;
  sku?: string;
  price: Money;
  compareAtPrice?: Money;
  availableForSale: boolean;
  selectedOptions: { name: string; value: string }[];
}

export interface Product {
  id: string;
  handle: string;
  title: string;
  description: string;
  featuredImage?: { url: string; altText?: string };
  priceRange: { min: Money; max: Money };
  options: { name: string; values: string[] }[];
  variants: ProductVariant[];
  tags: string[];
}

export interface CartLineItem {
  id: string;
  variantId: string;
  quantity: number;
  merchandise: ProductVariant & { product: { title: string; handle: string; image?: string } };
  attributes?: Record<string, string>;
}

export interface CartState {
  id: string;
  lines: CartLineItem[];
  subtotal: Money;
  totalQuantity: number;
  discountCodes: string[];
  checkoutUrl?: string;
  note?: string;
  isLoading: boolean;
  error?: string | null;
}
```

### 5.2 购物车核心生命周期 (`CartManager`)

```typescript
export class CartManager {
  constructor(options: CartManagerOptions);
  
  getState(): CartState;
  subscribe(listener: (state: CartState) => void): () => void;
  
  addItem(variantId: string, quantity?: number, attributes?: Record<string, string>): Promise<CartState>;
  updateQuantity(lineId: string, quantity: number): Promise<CartState>;
  removeItem(lineId: string): Promise<CartState>;
  applyDiscount(code: string): Promise<CartState>;
  removeDiscount(code: string): Promise<CartState>;
  setNote(note: string): Promise<CartState>;
  clearCart(): Promise<void>;
  createCheckoutUrl(): Promise<string>;
}
```

---

## 6. 自测记录

### 6.1 测试环境
- **操作系统**: Linux x86_64
- **Node.js 版本**: v24.22.1
- **包管理器**: npm 10.9.4
- **测试框架**: Node.js Native Test Runner (`node:test`) + `tsx`

### 6.2 依赖安装自测
- **命令**: `npm install`
- **执行结果**: 成功完成，添加 12 个纯净依赖包，耗时 9 秒，0 漏洞。
```text
added 12 packages in 9s
```

### 6.3 静态类型检查自测
- **命令**: `npm run check` (`tsc --noEmit`)
- **执行结果**: 全量 TypeScript 严格类型检查通过，0 警告，0 错误。
```text
> shopify-storefront-lite@1.0.0 check
> tsc --noEmit
```

### 6.4 生产构建自测
- **命令**: `npm run build` (`tsc && cp -r src/demo/public dist/demo/`)
- **执行结果**: 成功将 `src/` 编译为 `dist/`，生成所有 `.js`、`.d.ts` 类型声明文件与 SourceMap，并同步示例静态资源。
```text
> shopify-storefront-lite@1.0.0 build
> tsc && cp -r src/demo/public dist/demo/
```

### 6.5 自动化测试套件自测
- **命令**: `npm test` (`tsx --test tests/**/*.test.ts`)
- **测试覆盖模块**:
  1. `CartManager Core Lifecycle`: 购物车创建、增删改查行项目、0 件自动移除、折扣码校验与总额重算、响应式订阅通知、跨实例存储持久化恢复。
  2. `CheckoutService`: 空购物车拦截与校验、合法购物车结账 URL 注入折扣码、订单备注与 UTM 跟踪归因参数。
  3. `ShopifyStorefrontClient & MockStorefrontClient`: 离线 Mock 模式自动识别、商品目录分页与全文搜索、按 Handle 检索详情。
  4. `End-to-End Storefront & Checkout Flow`: 完整用户网购业务闭环（浏览 -> 变体规格匹配 -> 购物车操作 -> 促销码核销 -> 结账编排）。
  5. `Product Service Utilities`: 国际化货币格式化、复杂多属性变体匹配算法、优惠折扣计算、标签与库存筛选。
  6. `Demo Server & HTTP Storefront Endpoints`: 启动原生 HTTP 演示服务，验证 HTML 页面交付与 REST API 端点流转。
  7. `Storage Adapters`: 内存与 LocalStorage 驱动的读写、清理与 SSR 优雅降级，下含 `MemoryStorageAdapter` 与 `LocalStorageAdapter` 两个子套件。
- **执行结果**: 9 个测试套件（7 个顶层套件＋`Storage Adapters` 下 2 个子套件），22 项测试用例全部一次性通过（Pass: 22, Fail: 0）。
```text
▶ CartManager Core Lifecycle
  ✔ creates and initializes a fresh cart (2.747742ms)
  ✔ adds items, updates line quantities, and removes items (1.589635ms)
  ✔ applies and removes promo discount codes (1.158097ms)
  ✔ notifies subscribers on state mutations (0.979099ms)
  ✔ persists and restores cart across manager instances sharing storage (0.60649ms)
✔ CartManager Core Lifecycle (9.209123ms)
▶ CheckoutService
  ✔ rejects checkout validation on empty cart (1.286359ms)
  ✔ builds enhanced checkout URL with discounts and UTM tags (2.948623ms)
✔ CheckoutService (6.230405ms)
▶ ShopifyStorefrontClient & MockStorefrontClient
  ✔ initializes in mock mode when credentials are not supplied (1.585048ms)
  ✔ fetches products from mock catalog (0.550055ms)
  ✔ supports product search query filtering in mock mode (0.41985ms)
  ✔ fetches product by handle (0.335383ms)
  ✔ returns null for non-existent product handle (0.396545ms)
✔ ShopifyStorefrontClient & MockStorefrontClient (5.401552ms)
▶ End-to-End Storefront & Checkout Flow
  ✔ walks through complete shopper journey: browse -> select variant -> add to cart -> coupon -> checkout (4.597306ms)
✔ End-to-End Storefront & Checkout Flow (6.155803ms)
▶ Product Service Utilities
  ✔ formats money to localized currency (159.264873ms)
  ✔ matches variant by selected options (0.650506ms)
  ✔ returns null when selected options do not match any variant (0.268623ms)
  ✔ calculates discount percentage correctly (0.677165ms)
  ✔ filters catalog products by tags and stock (0.792409ms)
✔ Product Service Utilities (163.858183ms)
▶ Demo Server & HTTP Storefront Endpoints
  ✔ starts server, serves frontend HTML, and handles complete cart API cycle (128.286186ms)
✔ Demo Server & HTTP Storefront Endpoints (130.057113ms)
▶ Storage Adapters
  ▶ MemoryStorageAdapter
    ✔ sets, gets, and removes values correctly (1.059098ms)
    ✔ clears all entries (0.694262ms)
  ✔ MemoryStorageAdapter (3.310756ms)
  ▶ LocalStorageAdapter
    ✔ falls back gracefully to in-memory store in Node.js environment (0.523916ms)
  ✔ LocalStorageAdapter (0.75309ms)
✔ Storage Adapters (4.840361ms)
ℹ tests 22
ℹ suites 9
ℹ pass 22
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1818.738351
```

### 6.6 最小示例店面服务自测
- **命令**: `node dist/demo/server.js` 或 `npm run dev`
- **执行结果**: 成功启动服务，根路径正常交付现代交互式响应式店面 UI（支持商品浏览、规格切换、购物车抽屉、促销折扣、一键模拟结账跳转）。

### 6.7 自测结论
项目安装、构建、测试与启动全线通过，核心电商业务流程闭环验证完整，自测通过。
