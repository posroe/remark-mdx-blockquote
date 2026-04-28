import { visit } from "unist-util-visit";
import type { Root, Blockquote, Paragraph, Text } from "mdast";
import type { Plugin } from "unified";

/** Alert types supported by default (mirrors GitHub / GFM spec) */
export type AlertType = "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION";

/** Options accepted by the plugin */
export interface RemarkMdxBlockquoteOptions {
    /**
     * Custom alert types to recognise in addition to (or instead of) the
     * built-in ones.  Keys are the label that appears inside `[!…]` and
     * values are the string written to the data attribute.
     *
     * @example { DANGER: "DANGER", INFO: "INFO" }
     */
    customTypes?: Record<string, string>;

    /**
     * When `true` the `[!TYPE]` marker line is removed from the blockquote
     * content so consumers don't have to strip it themselves.
     * Defaults to `true`.
     */
    removeMarker?: boolean;
}

const DEFAULT_ALERT_TYPES: Record<AlertType, string> = {
    NOTE: "NOTE",
    TIP: "TIP",
    IMPORTANT: "IMPORTANT",
    WARNING: "WARNING",
    CAUTION: "CAUTION",
};

/** Regex that matches `[!TYPE]` at the start of the first line (case-insensitive) */
const ALERT_MARKER_RE = /^\s*\[!([A-Z0-9_-]+)\]\s*$/i;

/**
 * Extract the alert type from the first paragraph of a blockquote.
 *
 * remark parses `> [!NOTE]\n> body` into a **single** text node whose value
 * is `"[!NOTE]\nbody"`.  We therefore only need to inspect the very first
 * line of that text node.
 *
 * Returns `null` when the blockquote is a plain one.
 */
function extractAlertType(
    node: Blockquote,
    knownTypes: Record<string, string>
): { type: string } | null {
    const firstChild = node.children[0];
    if (!firstChild || firstChild.type !== "paragraph") return null;

    const para = firstChild as Paragraph;
    const firstInline = para.children[0];
    if (!firstInline || firstInline.type !== "text") return null;

    const firstLine = (firstInline as Text).value.split("\n")[0];
    const match = ALERT_MARKER_RE.exec(firstLine);
    if (!match) return null;

    const markerText = match[1].toUpperCase();
    const resolved = knownTypes[markerText];
    if (!resolved) return null;

    return { type: resolved };
}

/**
 * Remove the `[!TYPE]` marker line from the blockquote's first paragraph.
 *
 * Because remark merges the marker and the body into one text node separated
 * by `\n`, we just drop the first line of that node.  If nothing remains the
 * paragraph (or the whole blockquote) is cleaned up.
 */
function removeMarkerFromNode(node: Blockquote): void {
    const firstChild = node.children[0] as Paragraph;
    const firstInline = firstChild.children[0] as Text;

    const lines = firstInline.value.split("\n");
    // lines[0] is the `[!TYPE]` marker — everything after is body text
    const remaining = lines.slice(1).join("\n");

    if (remaining.trim() === "") {
        // Only the marker was in this paragraph — remove it entirely
        if (firstChild.children.length === 1) {
            node.children.splice(0, 1);
        } else {
            firstChild.children.splice(0, 1);
        }
    } else {
        firstInline.value = remaining;
    }
}

/**
 * `remark-mdx-blockquote`
 *
 * Transforms GitHub-flavoured blockquote alerts:
 *
 * ```md
 * > [!NOTE]
 * > This is a note.
 * ```
 *
 * …into a blockquote node with extra `data` attributes:
 *
 * ```html
 * <blockquote data-type="NOTE" data-alert="true">
 *   <p>This is a note.</p>
 * </blockquote>
 * ```
 *
 * Plain blockquotes (`>` without a marker) are left completely untouched.
 */
const remarkMdxBlockquote: Plugin<[RemarkMdxBlockquoteOptions?], Root> = (
    options = {}
) => {
    const {
        customTypes = {},
        removeMarker = true,
    } = options;

    // Merge built-in types with custom ones (custom types override built-ins)
    const knownTypes: Record<string, string> = {
        ...DEFAULT_ALERT_TYPES,
        ...customTypes,
    };

    return (tree: Root) => {
        visit(tree, "blockquote", (node: Blockquote) => {
            const result = extractAlertType(node, knownTypes);

            // Plain blockquote — leave it alone
            if (!result) return;

            const { type } = result;

            // Attach data attributes that remark/rehype will serialise as HTML attrs
            node.data = node.data ?? {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const nodeData = node.data as any;
            const existing: Record<string, string> = nodeData.hProperties ?? {};
            nodeData.hProperties = {
                ...existing,
                ["data-callout"]: type,
            };

            if (removeMarker) {
                removeMarkerFromNode(node);
            }
        });
    };
};

export default remarkMdxBlockquote;
export { remarkMdxBlockquote };