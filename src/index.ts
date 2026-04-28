import { visit } from "unist-util-visit";
import type { Root, Blockquote, Paragraph, Text } from "mdast";
import type { Plugin } from "unified";

export type AlertType = "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION";

export type BlockquoteAttributes<Custom extends string = never> = {
    "data-callout": AlertType | Custom;
};

export interface RemarkMdxBlockquoteOptions {
    /** Extra types on top of the built-ins. Keys = marker label, values = data-callout value. */
    customTypes?: Record<string, string>;
    /** Strip the `[!TYPE]` line from content. Defaults to `true`. */
    removeMarker?: boolean;
}

const DEFAULT_ALERT_TYPES: Record<AlertType, string> = {
    NOTE: "NOTE",
    TIP: "TIP",
    IMPORTANT: "IMPORTANT",
    WARNING: "WARNING",
    CAUTION: "CAUTION",
};

const ALERT_MARKER_RE = /^\s*\[!([A-Z0-9_-]+)\]\s*$/i;

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

    const resolved = knownTypes[match[1].toUpperCase()];
    return resolved ? { type: resolved } : null;
}

function removeMarkerFromNode(node: Blockquote): void {
    const firstChild = node.children[0] as Paragraph;
    const firstInline = firstChild.children[0] as Text;
    const remaining = firstInline.value.split("\n").slice(1).join("\n");

    if (remaining.trim() === "") {
        if (firstChild.children.length === 1) {
            node.children.splice(0, 1);
        } else {
            firstChild.children.splice(0, 1);
        }
    } else {
        firstInline.value = remaining;
    }
}

const remarkMdxBlockquote: Plugin<[RemarkMdxBlockquoteOptions?], Root> = (
    options = {}
) => {
    const { customTypes = {}, removeMarker = true } = options;
    const knownTypes = { ...DEFAULT_ALERT_TYPES, ...customTypes };

    return (tree: Root) => {
        visit(tree, "blockquote", (node: Blockquote) => {
            const result = extractAlertType(node, knownTypes);
            if (!result) return;

            node.data = node.data ?? {};
            const nodeData = node.data as any;
            nodeData.hProperties = {
                ...nodeData.hProperties,
                "data-callout": result.type,
            };

            if (removeMarker) removeMarkerFromNode(node);
        });
    };
};

export default remarkMdxBlockquote;
export { remarkMdxBlockquote };