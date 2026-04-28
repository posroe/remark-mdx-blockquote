# Changelog

All notable changes to this project will be documented in this file.

## 1.0.0 — Initial release

- Transform `> [!TYPE]` blockquotes into `<blockquote data-callout="TYPE">`
- Built-in types: `NOTE`, `TIP`, `IMPORTANT`, `WARNING`, `CAUTION`
- Option `customTypes` — add or override callout types
- Option `removeMarker` — strip the `[!TYPE]` line from content (default: `true`)
- Plain blockquotes are left untouched
