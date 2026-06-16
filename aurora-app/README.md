# 极光预测 · 赫尔辛基 (aurora-app)

一个面向赫尔辛基的极光观测预测 Web App。综合地磁活动（Kp 指数）、天色明暗（太阳高度角）和云量天气，回答一个问题：**今晚能看到极光吗？**

## 功能

- **综合判断卡片** — 结合 Kp 指数、天色、云量给出可见性结论和原因
- **当前 Kp 仪表盘** — 实时 Kp 指数 + OVATION 模型 30 分钟本地极光概率
- **过去 24 小时 Kp 曲线** — ECharts 折线图，标出赫尔辛基可见门槛 (Kp 4)
- **未来 3 天 Kp 预报** — NOAA 官方预报，按可见性等级着色
- **极光椭圆实况图** — NOAA OVATION 北半球最新渲染图，自动刷新
- **观测天气面板** — 赫尔辛基逐小时云量与气温（Open-Meteo）

## 数据来源（均为免费公开 API，无需 key）

| 数据 | 来源 |
|------|------|
| Kp 指数（1 分钟分辨率） | [NOAA SWPC](https://services.swpc.noaa.gov/json/planetary_k_index_1m.json) |
| 3 天 Kp 预报 | [NOAA SWPC](https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json) |
| OVATION 极光短时预报 | [NOAA SWPC](https://services.swpc.noaa.gov/json/ovation_aurora_latest.json) |
| 云量 / 气温 | [Open-Meteo](https://open-meteo.com/) |

数据每 5 分钟自动刷新（天气 15 分钟）。

## 运行

```bash
# 在仓库根目录
pnpm install
pnpm start:aurora        # 开发服务器 http://localhost:5174

# 或在本目录
pnpm dev
pnpm build               # 类型检查 + 产物构建到 dist/
```

## 技术栈

Vue 3（`<script setup>` 组合式 API）+ Vite + TypeScript + ECharts。纯前端 SPA，无后端依赖。

## 可见性判断规则

赫尔辛基磁纬约 57°，经验规则：

| Kp | 可见性 |
|----|--------|
| ≥ 6 | 极佳，可能出现在头顶 |
| 5 | 较好 |
| 4 | 北方地平线方向可能可见 |
| ≤ 3 | 基本无望 |

同时要求太阳高度角低于 -6°（天足够黑，夏季白夜期间整夜不可观测）且云量不超过 80%。
