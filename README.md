# contrib-aquarium

<p align="center">
  <img src="docs/aquarium.svg" width="860" alt="Living SVG aquarium from webywz GitHub contributions" />
</p>

<p align="center">
  <a href="https://github.com/webywz/contrib-aquarium/actions/workflows/ci.yml"><img src="https://github.com/webywz/contrib-aquarium/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-c4a35a?labelColor=1b2a2e" alt="MIT" /></a>
  <a href="https://www.npmjs.com/package/contrib-aquarium"><img src="https://img.shields.io/npm/v/contrib-aquarium?color=2a7a5c&labelColor=1b2a2e" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/contrib-aquarium"><img src="https://img.shields.io/badge/npx-contrib--aquarium-2a7a5c?labelColor=1b2a2e" alt="npx contrib-aquarium" /></a>
</p>

<p align="center">
  <strong>A living SVG aquarium driven by a GitHub contribution graph.</strong><br/>
  Drop one image into a profile README. Activity becomes fish, kelp, bubbles, and water.
</p>

<p align="center">
  <strong>由 GitHub 贡献日历驱动的活体 SVG 鱼缸。</strong><br/>
  把一张图放进 README，提交就变成鱼、海藻、气泡和水纹。
</p>

Self-contained SVG (CSS + SMIL) — no JavaScript in the embed, so GitHub can host it as a normal image. Dark water, brass rim; readable on light and dark themes.

自包含 SVG（CSS + SMIL），嵌入不需要 JS，可当普通图片用。暗水色 + 铜框，浅色 / 深色主题都站得住。

`npx contrib-aquarium` · package `contrib-aquarium` · v0.1.1 · Node.js 18.18+

---

## Features · 特性

| | EN | 中文 |
| --- | --- | --- |
| Mapping | Year total → fish count; streaks → kelp; last 14 days → bubbles | 全年总数 → 鱼数；连续打卡 → 海藻；近两周 → 气泡 |
| Sources | GraphQL calendar, public events, or deterministic mock | GraphQL 日历 / 公开 Events / 确定性 mock |
| Themes | `deep` · `reef` · `midnight` (palette only) | 三种配色，布局与映射不变 |
| Embed | Commit SVG, or refresh daily via composite Action | 提交 SVG，或用 Action 每日重画 |
| API | CLI + TypeScript library | CLI + 库 |

---

## Install · 安装

```bash
npx contrib-aquarium generate --user YOUR_LOGIN --out aquarium.svg

# or globally
npm i -g contrib-aquarium
contrib-aquarium generate --user YOUR_LOGIN --out aquarium.svg
```

Token optional. Without one, public events or a username-hash mock still render — demos never go blank.

没有 token 也能跑：公开 Events 或按用户名哈希的演示日历会顶上，预览不会空。

From source:

```bash
git clone https://github.com/webywz/contrib-aquarium.git
cd contrib-aquarium
npm install
npm run generate -- --user YOUR_LOGIN --out aquarium.svg
```

---

## Quick start · 快速开始

```bash
# real calendar (needs token)
export GITHUB_TOKEN=ghp_...
npx contrib-aquarium generate --user webywz --out aquarium.svg

# recent public events only
npx contrib-aquarium generate --user webywz --source events --out aquarium.svg

# offline demo (byte-stable for a given UTC day)
npx contrib-aquarium generate --user webywz --source mock --out aquarium.svg

# theme
npx contrib-aquarium generate --user webywz --theme reef --out aquarium.svg
```

In a README:

```markdown
<p align="center">
  <img src="aquarium.svg" width="860" alt="My contribution aquarium" />
</p>
```

Or a raw URL from another repo:

```markdown
![aquarium](https://raw.githubusercontent.com/USER/REPO/main/aquarium.svg)
```

---

## Data sources · 数据来源

`--source auto` (default) tries in order:

| Priority | Source | Token | Result |
| --- | --- | --- | --- |
| 1 | GraphQL `contributionsCollection` | yes (`--token`, `GITHUB_TOKEN`, or `GH_TOKEN`) | Full last-year calendar |
| 2 | Public events `GET /users/{login}/events/public` | no | Recent activity (~90 days retained) |
| 3 | Mock from username hash | no | Stable fake year for CI / demos / offline |

Pin a path with `--source graphql|events|mock`.

`--source auto` 按上表回退。GraphQL 要 token，拿完整贡献日历；公开 Events 不要 token，只有最近活动；mock 用用户名哈希生成确定假日历，保证离线 / CI / 演示出图。

Fine-grained or classic PAT that can read public user data is enough. In Actions, `secrets.GITHUB_TOKEN` covers public calendars.

---

## How activity becomes an aquarium · 贡献如何变成鱼缸

| Signal | Becomes · 变成 |
| --- | --- |
| Yearly contribution total | School size 3–18 fish · 鱼数量 `round(3 + sqrt(total) × 0.48)` |
| Busiest weeks | Larger koi / centerpiece angelfish · 更大锦鲤 / 主鱼 |
| Current streak | Kelp height and count · 海藻高度与簇数 |
| Last 14 days | Bubble density · 气泡密度 |
| Each week's total | Pebble / reef bed · 沙地礁石起伏 |
| Activity density | Water and plant motion · 水纹与海藻摆动 |

Empty years still get a few wanderers. Same username + calendar snapshot → same tank.

空年份仍有几条游鱼。同一用户名 + 同一日历快照，画出同一座缸。

---

## Themes · 主题

`--theme` changes palette only — layout and activity mapping stay the same.

| Name | Feel · 观感 |
| --- | --- |
| `deep` (default) | Classic dark teal · 默认深青 |
| `reef` | Warmer tropical water · 暖色珊瑚 |
| `midnight` | Violet night, neon accents · 午夜紫 |

```bash
npx contrib-aquarium generate --user YOUR_LOGIN --theme midnight --out aquarium.svg
```

---

## Embed daily · 每日嵌入

Copy [`examples/github-action.yml`](examples/github-action.yml) into your **profile** repo (`USER/USER`) as `.github/workflows/aquarium.yml`. It runs on a daily cron + `workflow_dispatch`, uses this repo as a composite action, and commits `aquarium.svg` when the tank changed.

```yaml
- uses: webywz/contrib-aquarium@main
  with:
    user: ${{ github.repository_owner }}
    out: aquarium.svg
```

This project's demo refreshes the same way: [`.github/workflows/daily-aquarium.yml`](.github/workflows/daily-aquarium.yml) updates [`docs/aquarium.svg`](docs/aquarium.svg) for `webywz`.

把示例 workflow 拷到个人主页仓库即可每天重画。GitHub Camo may cache the README thumbnail briefly after a push; the file in the repo is current.

GitHub 的 Camo 代理可能短暂缓存缩略图；仓库里的文件是新的。

---

## CLI

```
contrib-aquarium generate --user <login> [--out aquarium.svg]
                          [--source auto|graphql|events|mock]
                          [--theme deep|reef|midnight]
                          [--token <gh_token>]
```

| Flag | Default | |
| --- | --- | --- |
| `--user` | required | GitHub login |
| `--out` | `aquarium.svg` | Output path (dirs created) |
| `--source` | `auto` | See data sources |
| `--theme` | `deep` | `deep` · `reef` · `midnight` |
| `--token` | `$GITHUB_TOKEN` / `$GH_TOKEN` | GraphQL auth |

```bash
npm run generate -- --user webywz --out docs/aquarium.svg
npm test
npm run build
npm run lint
```

---

## Library · 库

```ts
import { generateAquarium, renderAquarium, mockActivity } from "contrib-aquarium";

const { svg, activity } = await generateAquarium({
  user: "webywz",
  source: "auto",
  theme: "reef",
});

const svgFromMock = renderAquarium(mockActivity("webywz", new Date("2026-10-29")));
```

Also exported: `loadActivity`, `fetchGraphqlActivity`, `fetchEventsActivity`, `getTheme`, `parseTheme`, `THEME_NAMES`, and size helpers. Types ship with the package.

另导出活动加载、主题解析与尺寸常量；TypeScript 类型随包发布。

---

## Links · 链接

- npm: [contrib-aquarium](https://www.npmjs.com/package/contrib-aquarium)
- Live on profile: [webywz/webywz](https://github.com/webywz/webywz)
- License: [MIT](LICENSE)
