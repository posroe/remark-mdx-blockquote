import { describe, it, expect } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdxBlockquote from "./index.js";
import type { Root, Blockquote } from "mdast";

function parse(markdown: string, options = {}) {
    const proc = unified().use(remarkParse).use(remarkMdxBlockquote, options);
    return proc.runSync(proc.parse(markdown)) as Root;
}

function getBlockquotes(tree: Root): Blockquote[] {
    return tree.children.filter((n) => n.type === "blockquote") as Blockquote[];
}

function firstBq(tree: Root): Blockquote {
    const bq = getBlockquotes(tree)[0];
    if (!bq) throw new Error("No blockquote found");
    return bq;
}

function hProps(bq: Blockquote): Record<string, string> {
    return ((bq.data as any)?.hProperties ?? {}) as Record<string, string>;
}

describe("plain blockquote", () => {
    it("does not add data-callout to a plain blockquote", () => {
        const tree = parse("> just a quote");
        expect(hProps(firstBq(tree))["data-callout"]).toBeUndefined();
    });

    it("leaves plain blockquote content intact", () => {
        const tree = parse("> hello world");
        const para = firstBq(tree).children[0] as any;
        expect(para.children[0].value).toBe("hello world");
    });

    it("does not touch a blockquote with an unknown marker", () => {
        const tree = parse("> [!UNKNOWN]\n> body");
        expect(hProps(firstBq(tree))["data-callout"]).toBeUndefined();
    });
});

describe("data-callout attribute", () => {
    const builtins = ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"] as const;

    it.each(builtins)("[!%s] sets data-callout=%s", (type) => {
        const tree = parse(`> [!${type}]\n> body`);
        expect(hProps(firstBq(tree))["data-callout"]).toBe(type);
    });

    it("marker is case-insensitive", () => {
        const tree = parse("> [!note]\n> body");
        expect(hProps(firstBq(tree))["data-callout"]).toBe("NOTE");
    });

    it("does NOT add data-alert (removed option)", () => {
        const tree = parse("> [!NOTE]\n> body");
        expect(hProps(firstBq(tree))["data-alert"]).toBeUndefined();
    });

    it("does NOT add data-type (old attribute name)", () => {
        const tree = parse("> [!NOTE]\n> body");
        expect(hProps(firstBq(tree))["data-type"]).toBeUndefined();
    });
});

describe("removeMarker", () => {
    it("strips the [!TYPE] line by default", () => {
        const tree = parse("> [!NOTE]\n> This is the body.");
        const para = firstBq(tree).children[0] as any;
        const text: string = para?.children?.[0]?.value ?? "";
        expect(text).not.toMatch(/\[!/);
        expect(text).toContain("This is the body.");
    });

    it("keeps the marker when removeMarker: false", () => {
        const tree = parse("> [!NOTE]\n> body", { removeMarker: false });
        const para = firstBq(tree).children[0] as any;
        const text: string = para?.children?.[0]?.value ?? "";
        expect(text).toMatch(/\[!NOTE\]/i);
    });

    it("marker-only blockquote becomes empty after removal", () => {
        const tree = parse("> [!NOTE]");
        expect(firstBq(tree).children).toHaveLength(0);
    });

    it("does not crash on marker-only blockquote", () => {
        expect(() => parse("> [!WARNING]")).not.toThrow();
    });
});

describe("customTypes", () => {
    it("recognises a custom type", () => {
        const tree = parse("> [!DANGER]\n> body", {
            customTypes: { DANGER: "DANGER" },
        });
        expect(hProps(firstBq(tree))["data-callout"]).toBe("DANGER");
    });

    it("custom type can override built-in value", () => {
        const tree = parse("> [!NOTE]\n> body", {
            customTypes: { NOTE: "custom-note" },
        });
        expect(hProps(firstBq(tree))["data-callout"]).toBe("custom-note");
    });

    it("unknown type without customTypes entry is ignored", () => {
        const tree = parse("> [!MYSTERY]\n> body");
        expect(hProps(firstBq(tree))["data-callout"]).toBeUndefined();
    });
});

describe("multiple blockquotes", () => {
    it("processes each blockquote independently", () => {
        const md = `
> [!NOTE]
> A note.

> A plain quote.

> [!WARNING]
> A warning.
`.trim();

        const bqs = getBlockquotes(parse(md));
        expect(bqs).toHaveLength(3);
        expect(hProps(bqs[0])["data-callout"]).toBe("NOTE");
        expect(hProps(bqs[1])["data-callout"]).toBeUndefined();
        expect(hProps(bqs[2])["data-callout"]).toBe("WARNING");
    });
});


describe("hProperties merging", () => {
    it("does not wipe existing hProperties set by other plugins", () => {
        const proc = unified().use(remarkParse).use(() => (tree: Root) => {
            const bq = tree.children.find((n) => n.type === "blockquote") as Blockquote;
            if (bq) {
                bq.data = { hProperties: { id: "pre-existing" } } as any;
            }
        }).use(remarkMdxBlockquote);

        const tree = proc.runSync(proc.parse("> [!TIP]\n> tip body")) as Root;
        const props = hProps(firstBq(tree));

        expect(props["id"]).toBe("pre-existing");
        expect(props["data-callout"]).toBe("TIP");
    });
});