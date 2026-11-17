# Shopify Storefront Lite 🛍️

> 框架无关、零冗余的轻量级 Shopify 电商独立站核心逻辑脚手架与响应式购物车引擎。  
> Framework-agnostic, zero-bloat lightweight Shopify headless storefront scaffold & reactive shopping cart engine.

---

## 中文文档

### 📖 项目简介

`shopify-storefront-lite` 是一个面向现代 Headless 电商的纯 TypeScript 核心脚手架。它将 Shopify Storefront API 交互、响应式购物车全生命周期管理、多规格属性匹配以及结账流程编排从特定的 UI 框架中彻底解耦，无论是在 React、Vue、Svelte、Astro、纯原生前端、Node.js 服务端还是移动端中，均可直接引入复用。

本项目内置了开箱即用的**离线 Mock 引擎**与**最小示例店面（Minimal Example Storefront）**，无需申请 Shopify 开发者密钥即可立即启动体验完整的电商浏览、选配、加购、算价、促销码核销与模拟结账全闭环流程。

---

### ✨ 功能与与原思路的关系（功能及差异化要点）

本项目基于 **B 路线（按思路全新重写）**，仅参考了原项目 `next-shopify-storefront` 的公开功能行为与设计理念，代码全部由零独立编写，消除了原项目对 Next.js 框架及专有工具链的强耦合：

1. **框架无关的核心架构（Framework-Agnostic）**：
   - 原项目强绑定于 Next.js 16 与 `@shopify/hydrogen-react` 组件；
   - 本项目核心层（`src/core/`）为纯 TypeScript 编写，无任何特定的 UI 库依赖，提供发布/订阅驱动的状态模型（可通过 `subscribe` 适配任何框架或 Vanilla DOM）。
2. **高内聚可复用的购物车模块 (`CartManager`)**：
   - 封装完整的 Shopify Cart 全生命周期：购物车初始化、持久化恢复、行项目增删改、数量为 0 自动移除、促销折扣码应用与核销、订单买家备注附加；
   - 支持可插拔存储适配器（`LocalStorageAdapter`、`MemoryStorageAdapter`、`CookieStorageAdapter`），SSR 与客户端均能优雅降级。
3. **结账编排模块 (`CheckoutService`)**：
   - 结账前购物车完整性校验（空车校验、非法行拦截）；
   - 结账 Web URL 动态生成与参数注入（自动透传折扣码、订单备注、UTM 营销归因参数与自定义属性）；
   - 跨环境安全重定向处理器。
4. **内置离线 Mock 模式（Zero-Config Offline Development）**：
   - 无需配置或申请任何 Shopify 真实凭证，直接自带模拟商品目录与完整的离线变异操作逻辑；
   - 离线开发、本地测试与持续集成（CI）一秒跑通，接入真实 Storefront API 只需切换环境变量。
5. **去私有黑盒依赖，拥抱现代标准生态**：
   - 移除了原项目依赖的作者私有工具集（`esmate`、`@esmate/*`）以及繁重的编译期 GraphQL 代码生成器，使用标准的 npm 与现代 TypeScript 工具链，轻量纯净。
6. **附带交互式最小示例店面与 React 适配层**：
   - 附带开箱即用的本地 HTTP 交互式店面，直观展示商品展示、规格切换、购物车抽屉与结账；
   - 提供 React 18/19 标准 Hooks（`useCart`、`useProduct`、`useShopify`），基于 `useSyncExternalStore` 实现极简高性能绑定。

---

### 🚀 快速开始

#### 1. 环境准备
- Node.js 18+ (推荐 Node.js 22 或 24)
- npm / pnpm / yarn

#### 2. 安装依赖
```bash
npm install
```

#### 3. 启动交互式最小示例店面
```bash
npm run dev
# 或
npm run demo
```
服务将在本地启动（默认端口 `http://localhost:3000`）。打开浏览器即可体验完整的商品展示、规格选择、加购抽屉、折扣码（可尝试 `WELCOME10` 或 `SAVE20`）及结账跳转。

#### 4. 生产构建与代码检查
```bash
# 类型检查
npm run check

# 构建打包输出至 dist/
npm run build

# 运行生产构建服务
npm start
```

#### 5. 运行自动化测试套件
```bash
npm test
```

---

### ⚙️ 环境配置 (`.env`)

复制环境配置样例：
```bash
cp .env.example .env
```

配置项说明：
```ini
# 设置为 mock 即启用内置全功能离线模式（无需凭证）
SHOPIFY_STORE_MODE=mock

# 若连接真实 Shopify 店铺，将模式设为 live 并填入凭证：
SHOPIFY_STORE_DOMAIN=your-shop-domain.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your-storefront-access-token-placeholder
SHOPIFY_STOREFRONT_API_VERSION=2025-10
```

---

### 💻 核心代码使用示例

#### 纯 TypeScript / 框架无关用法

```typescript
import {
  ShopifyStorefrontClient,
  CartManager,
  CheckoutService
} from 'shopify-storefront-lite';

// 1. 初始化客户端（未传参时默认进入离线 Mock 模式）
const client = new ShopifyStorefrontClient();

// 2. 初始化购物车管理器
const cartManager = new CartManager({ client });
await cartManager.init();

// 3. 监听购物车状态变化
cartManager.subscribe((state) => {
  console.log('Cart updated:', state.cart?.totalQuantity, state.cart?.cost.totalAmount);
});

// 4. 添加商品规格至购物车
await cartManager.addItem('gid://shopify/ProductVariant/2002', 2);

// 5. 应用折扣码
await cartManager.applyDiscount('WELCOME10');

// 6. 生成附带 UTM 跟踪的 Shopify 结账链接
const checkoutUrl = CheckoutService.buildCheckoutUrl(cartManager.getState().cart!, {
  utmParams: { utm_source: 'campaign_spring' }
});
console.log('Checkout URL:', checkoutUrl);
```

#### React Hooks 用法

```tsx
import { useCart, useShopify, ShopifyProvider } from 'shopify-storefront-lite/react';

function CartDrawer() {
  const { cart, updateQuantity, removeItem, checkout, isLoading } = useCart(cartManager);

  return (
    <div>
      <h2>购物车 ({cart?.totalQuantity || 0})</h2>
      {cart?.lines.map((line) => (
        <div key={line.id}>
          <span>{line.merchandise.title} x {line.quantity}</span>
          <button onClick={() => updateQuantity(line.id, line.quantity + 1)}>+</button>
          <button onClick={() => removeItem(line.id)}>删除</button>
        </div>
      ))}
      <button onClick={() => checkout()} disabled={isLoading || !cart?.lines.length}>
        去结账
      </button>
    </div>
  );
}
```

---

### 💖 来源与致谢

本项目的思路与功能设计受到 VienDinhCom 的 [next-shopify-storefront](https://github.com/VienDinhCom/next-shopify-storefront) 启发，代码为独立实现。

---

### 📄 许可证

本项目沿用原许可证，采用 [MIT 许可证](LICENSE) 开源，全文见根目录 `LICENSE`。

---

## English Documentation

### 📖 Introduction

`shopify-storefront-lite` is a framework-agnostic, zero-bloat TypeScript storefront toolkit and shopping cart scaffold designed for Shopify headless commerce. It cleanly decouples Storefront API communication, reactive cart lifecycle management, product variant resolution, and checkout orchestration from any specific UI framework—enabling you to power React, Vue, Svelte, Astro, Vanilla JS, Node.js BFFs, and mobile applications with a unified, lightweight core.

It features a built-in **Offline Mock Engine** and an **Interactive Minimal Example Storefront**, allowing developers to immediately run, test, and experience the full eCommerce journey (browsing, variant selection, adding to cart, coupon redemption, and checkout preparation) without needing live Shopify store credentials.

---

### ✨ Features & Conceptual Differences

Developed under the **Route B (Clean-room rewrite)** methodology, this project borrows only high-level conceptual ideas and functional behavior from `next-shopify-storefront`, with 100% newly crafted, independent TypeScript code:

1. **Framework-Agnostic Core Architecture**:
   - The original project was strictly coupled to Next.js 16 and `@shopify/hydrogen-react`;
   - This project's core (`src/core/`) is pure TypeScript with zero UI framework dependencies. It provides an observable publish/subscribe pattern consumable by any frontend or server environment.
2. **Reusable Reactive Cart Manager (`CartManager`)**:
   - Encapsulates the complete Shopify Cart API lifecycle: initialization, persistent session restoration, adding/updating/removing line items, automatic zero-quantity cleanup, promo discounts, and buyer notes;
   - Pluggable storage drivers: `LocalStorageAdapter`, `MemoryStorageAdapter`, and `CookieStorageAdapter` with seamless SSR fallbacks.
3. **Checkout Orchestrator (`CheckoutService`)**:
   - Pre-flight cart validation against empty or invalid line items;
   - Web checkout URL synthesis with automatic parameter injection (discount coupons, notes, and UTM campaign tags);
   - Safe cross-environment browser redirect utility.
4. **Built-in Offline Mock Engine**:
   - Includes a full mock product catalog and mock cart mutation state machine;
   - Enables instant local development, offline prototyping, and CI testing without credentials.
5. **Standard Modern Ecosystem (Zero Proprietary Tooling)**:
   - Completely removes the author's proprietary packages (`esmate`, `@esmate/*`) and cumbersome build-time GraphQL codegen;
   - Relies only on standard Node.js and TypeScript tooling.
6. **Minimal Example Storefront & React Adapter Included**:
   - Ready-to-run interactive demo storefront showcasing real-time cart mutations, quantity steppers, and promo verification;
   - First-class React 18/19 hooks (`useCart`, `useProduct`, `useShopify`) based on `useSyncExternalStore`.

---

### 🚀 Quick Start

#### 1. Prerequisites
- Node.js 18+ (Node.js 22 or 24 recommended)
- npm / pnpm / yarn

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Start Minimal Example Storefront
```bash
npm run dev
# or
npm run demo
```
The server will boot up at `http://localhost:3000`. Open your browser to explore the interactive storefront, product cards, variant selectors, slide-over cart drawer, discount codes (`WELCOME10`, `SAVE20`), and checkout redirection.

#### 4. Type Checking & Production Build
```bash
# Type check
npm run check

# Build to dist/
npm run build

# Start production server
npm start
```

#### 5. Run Automated Test Suite
```bash
npm test
```

---

### ⚙️ Configuration (`.env`)

Copy the environment template:
```bash
cp .env.example .env
```

Configuration variables:
```ini
# 'mock' enables offline mode without API keys
SHOPIFY_STORE_MODE=mock

# For live Shopify stores, switch to 'live' and provide credentials:
SHOPIFY_STORE_DOMAIN=your-shop-domain.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your-storefront-access-token-placeholder
SHOPIFY_STOREFRONT_API_VERSION=2025-10
```

---

### 💖 Provenance & Acknowledgements

The design and conceptual flow of this project were inspired by VienDinhCom's [next-shopify-storefront](https://github.com/VienDinhCom/next-shopify-storefront), and the codebase was independently implemented from scratch.

---

### 📄 License

This project adheres to the original licensing terms and is released under the [MIT License](LICENSE). Full license text is available in `LICENSE`.
