// Client-side file → Tiptap JSON conversion.
// .md goes through `marked` then @tiptap/html `generateJSON` (the browser has DOM).
// .txt is split into paragraph nodes line-by-line.

export const MAX_UPLOAD_BYTES = 1024 * 1024; // 1 MB

export type ImportResult = { title: string; content_json: unknown };

export async function importFile(file: File): Promise<ImportResult> {
  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".md") && !lower.endsWith(".txt")) {
    throw new Error("Only .md and .txt files are supported");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("File too large (max 1 MB)");
  }

  const text = await file.text();
  const title = stripExtension(file.name);

  if (lower.endsWith(".md")) {
    const [{ marked }, { generateJSON }, StarterKit] = await Promise.all([
      import("marked"),
      import("@tiptap/html"),
      import("@tiptap/starter-kit").then((m) => m.default),
    ]);
    const html = await marked.parse(text, { async: true });
    const content_json = generateJSON(html, [StarterKit]);
    return { title, content_json };
  }

  // .txt
  const lines = text.split(/\r?\n/);
  const content = lines.map((line) =>
    line.length === 0
      ? { type: "paragraph" }
      : { type: "paragraph", content: [{ type: "text", text: line }] },
  );
  if (content.length === 0) content.push({ type: "paragraph" });
  return {
    title,
    content_json: { type: "doc", content },
  };
}

function stripExtension(name: string): string {
  const i = name.lastIndexOf(".");
  const stripped = i > 0 ? name.slice(0, i) : name;
  return stripped.trim().slice(0, 200) || "Untitled";
}
