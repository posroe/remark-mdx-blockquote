# remark-mdx-blockquote

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/remark-mdx-blockquote.svg)](https://www.npmjs.com/package/remark-mdx-blockquote)
[![npm downloads](https://img.shields.io/npm/dt/remark-mdx-blockquote)](https://www.npmjs.com/package/remark-mdx-blockquote)
[![Publish](https://github.com/posroe/remark-mdx-blockquote/actions/workflows/publish.yml/badge.svg)](https://github.com/posroe/remark-mdx-blockquote/actions/workflows/publish.yml)

A [remark](https://github.com/remarkjs/remark) plugin that transforms GitHub-style blockquote alerts into blockquote nodes with a `data-callout` attribute. Plain `>` blockquotes are left untouched. Inspired by [GitHub's blockquote alerts](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#alerts).

```md
> [!NOTE]
> This is a note.
```

```html
<blockquote data-callout="NOTE">
  <p>This is a note.</p>
</blockquote>
```

## Install

```bash
npm install remark-mdx-blockquote
```

## Usage

```js
// next.config.mjs
import remarkBlockquote from "remark-mdx-blockquote";

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkBlockquote],
  },
});

export default withMDX(nextConfig);

//Or If using remark-mdx plugin instead of next
import { remarkMDX } from "@remark-mdx-js/remark-mdx";
import remarkBlockquote from "remark-mdx-blockquote";

const processor = unified()
  .use(remarkParse)
  .use(remarkMDX)
  .use(remarkBlockquote)
  .use(remarkStringify);
  .processSync(/*string*/);
```

## Callout types

| Syntax           | `data-callout` |
| ---------------- | -------------- |
| `> [!NOTE]`      | `NOTE`         |
| `> [!TIP]`       | `TIP`          |
| `> [!IMPORTANT]` | `IMPORTANT`    |
| `> [!WARNING]`   | `WARNING`      |
| `> [!CAUTION]`   | `CAUTION`      |

Markers are case-insensitive — `> [!note]` and `> [!NOTE]` are equivalent.

## Options

### `customTypes`

Add custom callout types or override built-in values.

```ts
[remarkBlockquote, {
  customTypes: {
    DANGER: "DANGER",
  },
}],
// <blockquote data-callout="DANGER"><p>…</p></blockquote>>
```

### `removeMarker`

Strip the `[!TYPE]` line from the blockquote content. Defaults to `true`.

```ts
[remarkBlockquote, { removeMarker: false }];
// <blockquote data-callout="NOTE"><p>[!NOTE]<br>…</p></blockquote>
```

## Types

```ts
import type { CalloutType, BlockquoteAttributes } from "remark-mdx-blockquote";

// BlockquoteAttributes<Custom> — use to type your component props
type Props = BlockquoteAttributes<"DANGER" | "INFO">;
// { "data-callout": "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION" | "DANGER" | "INFO" }
```
