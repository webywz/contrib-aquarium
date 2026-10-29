# contrib-aquarium

<p align="center">
  <img src="docs/aquarium.svg" width="860" alt="Living SVG aquarium generated from webywz's GitHub contributions" />
</p>

<p align="center">
  <a href="https://github.com/webywz/contrib-aquarium/actions/workflows/ci.yml"><img src="https://github.com/webywz/contrib-aquarium/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-c4a35a?labelColor=1b2a2e" alt="MIT" /></a>
  <a href="https://www.npmjs.com/package/contrib-aquarium"><img src="https://img.shields.io/npm/v/contrib-aquarium?color=2a7a5c&labelColor=1b2a2e" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/contrib-aquarium"><img src="https://img.shields.io/badge/npx-contrib--aquarium-2a7a5c?labelColor=1b2a2e" alt="npx contrib-aquarium" /></a>
</p>

<p align="center">
  <strong>A living SVG aquarium driven by a GitHub contribution graph.</strong><br/>
  Drop one image URL into a profile README. Activity becomes fish, kelp, bubbles, and water.
</p>

<p align="center">
  由 GitHub 贡献日历驱动的活体 SVG 鱼缸。把一张图放进 README，提交就变成鱼、海藻、气泡和水纹。
</p>

The tank is pure SVG (CSS + SMIL). No JavaScript in the embed, so GitHub READMEs can host it as a regular image. Dark water, brass rim — readable on both GitHub light and dark.

鱼缸是自包含 SVG（CSS + SMIL），嵌入时不需要 JS，可当普通图片用。暗水色 + 铜框，在 GitHub 浅色 / 深色主题下都站得住。

> v0.1.0 is on npm. `npx contrib-aquarium` is the published entry point.
>
> v0.1.0 已发布到 npm。入口是 `npx contrib-aquarium`。

---

## Quick start · 快速开始

```bash
npx contrib-aquarium generate --user YOUR_LOGIN --out aquarium.svg
```

Or install globally:

```bash
npm i -g contrib-aquarium
contrib-aquarium generate --user YOUR_LOGIN --out aquarium.svg
```

Then in a README:

```markdown
![contrib-aquarium](aquarium.svg)
```

A GitHub token is optional. Without one, generation still succeeds via public events or a deterministic mock — demos never go blank.

没有 token 也能跑：公开 Events 或按用户名哈希生成的演示日历会顶上，预览不会空。

### Develop from source · 从源码开发

Clone if you are hacking on the generator itself:

本地改生成器时再 clone：

```bash
git clone https://github.com/webywz/contrib-aquarium.git
cd contrib-aquarium
npm install
npm run generate -- --user YOUR_LOGIN --out aquarium.svg
```

---

## Data sources · 数据来源

`--source auto` (default) tries the following in order:

| Priority | Source | Needs token | What you get |
| --- | --- | --- | --- |
| 1 | **GraphQL** `contributionsCollection` | yes (`--token`, `GITHUB_TOKEN`, or `GH_TOKEN`) | Full last-year calendar — this is the real heatmap |
| 2 | **Public events** `GET /users/{login}/events/public` | no | Recent activity only (GitHub keeps ~90 days of events) |
| 3 | **Mock** from the username hash | no | A stable, contribution-like year so CI, demos, and offline use always render |

`--source graphql|events|mock` pins a single path.

`--source auto` 默认按上表回退。GraphQL 需要 token，拿到的是完整贡献日历；公开 Events 不需要 token，但只有最近活动；mock 用用户名哈希生成确定的假日历，离线 / CI / 演示保证出图。

```bash
# real calendar
export GITHUB_TOKEN=ghp_...
npx contrib-aquarium generate --user webywz --out docs/aquarium.svg

# recent public events only
npx contrib-aquarium generate --user webywz --source events --out aquarium.svg

# offline demo (byte-stable for a given UTC day)
npx contrib-aquarium generate --user webywz --source mock --out aquarium.svg
```

GraphQL is a fine-grained or classic PAT with permission to read public user data. In GitHub Actions, `secrets.GITHUB_TOKEN` is enough for public calendars.

---

## How activity becomes an aquarium · 贡献如何变成鱼缸

| Signal | Becomes |
| --- | --- |
| Yearly contribution total | School size (3–18 fish). `round(3 + sqrt(total) × 0.48)` |
| Busiest weeks | Larger koi / a centerpiece angelfish |
| Current streak | Kelp height and count |
| Last 14 days | Bubble density |
| Each week's total | Pebble / reef bed along the sand |
| Activity density | How much the water and plants move |

Empty years still get a few wanderers. The same username + calendar snapshot always draws the same tank.

| 信号 | 变成 |
| --- | --- |
| 全年贡献总数 | 鱼的数量（3–18）。`round(3 + sqrt(total) × 0.48)` |
| 最忙的几周 | 更大的锦鲤 / 一条主鱼（神仙鱼） |
| 当前连续提交 | 海藻高度与簇数 |
| 近 14 天 | 气泡密度 |
| 每周合计 | 沙地上的礁石起伏 |
| 活跃密度 | 水纹与海藻摆动幅度 |

---

## Embed in a README · 嵌入 README

### 1. Commit a raw SVG

Generate once, commit `aquarium.svg`, reference it:

```markdown
<p align="center">
  <img src="aquarium.svg" width="860" alt="My contribution aquarium" />
</p>
```

Same-repo relative paths work. For another repo use the raw URL:

```markdown
![aquarium](https://raw.githubusercontent.com/USER/REPO/main/aquarium.svg)
```

### 2. Regenerate daily with GitHub Actions

Copy [`examples/github-action.yml`](examples/github-action.yml) into your **profile repository** (the `USER/USER` repo) as `.github/workflows/aquarium.yml`. It:

1. Runs on a daily cron and `workflow_dispatch`
2. Uses this repo as a composite action
3. Commits `aquarium.svg` when the tank actually changed

```yaml
- uses: webywz/contrib-aquarium@main
  with:
    user: ${{ github.repository_owner }}
    out: aquarium.svg
```

This project's own demo is refreshed the same way: [`.github/workflows/daily-aquarium.yml`](.github/workflows/daily-aquarium.yml) generates [`docs/aquarium.svg`](docs/aquarium.svg) for `webywz` every day.

把 [`examples/github-action.yml`](examples/github-action.yml) 拷到个人主页仓库，每天会重画并提交 `aquarium.svg`。本仓库的 Action 则给 `webywz` 更新 [`docs/aquarium.svg`](docs/aquarium.svg)。

GitHub's image proxy (Camo) may cache the SVG for a short while after a push. The file in the repo is current; the README thumbnail can lag a few hours.

GitHub 的 Camo 代理可能短暂缓存图片；仓库里的文件是新的，README 缩略图有时会晚几个小时。

---

## CLI

```
contrib-aquarium generate --user <login> [--out aquarium.svg]
                          [--source auto|graphql|events|mock]
                          [--token <gh_token>]
```

| Flag | Default | |
| --- | --- | --- |
| `--user` | required | GitHub login |
| `--out` | `aquarium.svg` | Output path (directories are created) |
| `--source` | `auto` | See data sources above |
| `--token` | `$GITHUB_TOKEN` / `$GH_TOKEN` | GraphQL auth |

```bash
npm run generate -- --user webywz --out docs/aquarium.svg
npm test
npm run build
npm run lint
```

---

## Library

```ts
import { generateAquarium, renderAquarium, mockActivity } from "contrib-aquarium";

const { svg, activity } = await generateAquarium({
  user: "webywz",
  source: "auto",
});

// or draw a fixture
const svgFromMock = renderAquarium(mockActivity("webywz", new Date("2026-10-29")));
```

Node.js 18.18+ (native `fetch`). TypeScript types ship with the package.

---

## License

[MIT](LICENSE)
