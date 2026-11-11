/**
 * Zero-dependency PDF 1.4 generator for Sui Dhaga design tech packs.
 * Outputs valid multi-page PDF documents safe for serverless environments.
 */

export interface TechPackPdfData {
  designId: string;
  title: string;
  type: string;
  category?: string | null;
  style?: string | null;
  occasion?: string | null;
  fabric?: string | Record<string, unknown> | null;
  colors?: unknown[];
  embroidery?: string | Record<string, unknown> | null;
  measurements?: Record<string, unknown>;
  notes?: string | Record<string, unknown> | null;
  prompt?: string | null;
  imageUrl?: string | null;
  sharedTailorName?: string | null;
  createdAt?: string | null;
}

interface TextLine {
  text: string;
  size: number;
  bold?: boolean;
  spacingAfter?: number;
}

function toSafeString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((v) => toSafeString(v)).filter(Boolean).join(", ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${k}: ${toSafeString(v)}`)
      .join(", ");
  }
  return String(value);
}

function escapePdfText(input: unknown): string {
  return toSafeString(input)
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapLine(text: unknown, maxChars: number): string[] {
  const cleaned = toSafeString(text).replace(/\r?\n/g, " ").trim();
  if (!cleaned) return [""];
  const words = cleaned.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function buildTechPackPdfBuffer(data: TechPackPdfData): Buffer {
  const lines: TextLine[] = [
    { text: "SUI DHAGA - BESPOKE DESIGN TECH PACK", size: 16, bold: true, spacingAfter: 6 },
    { text: `Design ID: ${data.designId}`, size: 9, spacingAfter: 10 },
    { text: `Title: ${data.title || "Untitled Bespoke Design"}`, size: 13, bold: true, spacingAfter: 4 },
    {
      text: `Type: ${data.type || "custom"}${data.category ? ` | Category: ${data.category}` : ""}${data.occasion ? ` | Occasion: ${data.occasion}` : ""}`,
      size: 10,
      spacingAfter: 10,
    },
    { text: "1. FABRIC & MATERIALS", size: 11, bold: true, spacingAfter: 3 },
    { text: `Primary Fabric: ${toSafeString(data.fabric) || "To be selected with tailor"}`, size: 10, spacingAfter: 3 },
    { text: `Style / Silhouette: ${data.style || "Custom Tailored"}`, size: 10, spacingAfter: 8 },
    { text: "2. COLOR PALETTE", size: 11, bold: true, spacingAfter: 3 },
    {
      text: data.colors && data.colors.length > 0 ? toSafeString(data.colors) : "Default Studio Palette",
      size: 10,
      spacingAfter: 8,
    },
    { text: "3. EMBROIDERY & EMBELLISHMENTS", size: 11, bold: true, spacingAfter: 3 },
    { text: toSafeString(data.embroidery) || "Standard clean finishing", size: 10, spacingAfter: 8 },
    { text: "4. MEASUREMENTS SPECIFICATION", size: 11, bold: true, spacingAfter: 3 },
  ];

  const measEntries = Object.entries(data.measurements || {});
  if (measEntries.length === 0) {
    lines.push({ text: "No custom measurements attached yet.", size: 10, spacingAfter: 8 });
  } else {
    for (const [k, v] of measEntries) {
      lines.push({ text: `  - ${k}: ${String(v)}`, size: 10, spacingAfter: 2 });
    }
    lines.push({ text: "", size: 10, spacingAfter: 6 });
  }

  lines.push({ text: "5. TAILORING & CONSTRUCTION NOTES", size: 11, bold: true, spacingAfter: 3 });
  for (const wrapped of wrapLine(data.notes || "Follow standard atelier seam allowances and lining specifications.", 82)) {
    lines.push({ text: wrapped, size: 10, spacingAfter: 2 });
  }

  if (data.prompt) {
    lines.push({ text: "", size: 10, spacingAfter: 6 });
    lines.push({ text: "6. AI DESIGN BRIEF / PROMPT", size: 11, bold: true, spacingAfter: 3 });
    for (const wrapped of wrapLine(data.prompt, 82)) {
      lines.push({ text: wrapped, size: 9, spacingAfter: 2 });
    }
  }

  if (data.imageUrl && !data.imageUrl.startsWith("data:")) {
    lines.push({ text: "", size: 10, spacingAfter: 6 });
    lines.push({ text: "7. VISUAL REFERENCE URL", size: 11, bold: true, spacingAfter: 3 });
    for (const wrapped of wrapLine(data.imageUrl, 85)) {
      lines.push({ text: wrapped, size: 8, spacingAfter: 2 });
    }
  }

  if (data.sharedTailorName) {
    lines.push({ text: "", size: 10, spacingAfter: 6 });
    lines.push({ text: `Shared With Atelier: ${data.sharedTailorName}`, size: 10, bold: true, spacingAfter: 4 });
  }

  lines.push({ text: "", size: 10, spacingAfter: 8 });
  lines.push({
    text: `Generated by Sui Dhaga Platform on ${new Date().toISOString().split("T")[0]}`,
    size: 8,
    spacingAfter: 2,
  });

  // Paginate lines across PDF pages (A4: 595 x 842)
  const pages: string[][] = [];
  let currentCommands: string[] = [];
  let y = 790;

  for (const item of lines) {
    const lineHeight = item.size + 4 + (item.spacingAfter ?? 0);
    if (y - lineHeight < 55) {
      pages.push(currentCommands);
      currentCommands = [];
      y = 790;
    }
    const fontKey = item.bold ? "/F2" : "/F1";
    currentCommands.push(
      `BT ${fontKey} ${item.size} Tf 50 ${y} Td (${escapePdfText(item.text)}) Tj ET`,
    );
    y -= lineHeight;
  }
  if (currentCommands.length > 0 || pages.length === 0) {
    pages.push(currentCommands);
  }

  // Build PDF objects: 1=Catalog, 2=Pages, 3=Helvetica, 4=Helvetica-Bold, then pairs of (Page, Content)
  const objects: string[] = [];
  const pageObjIds: number[] = [];

  // Placeholder slots for 1..4
  objects.push(""); // 1
  objects.push(""); // 2
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"); // 3
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"); // 4

  let nextId = 5;
  for (const cmds of pages) {
    const pageId = nextId++;
    const contentId = nextId++;
    pageObjIds.push(pageId);

    const streamBody = cmds.join("\n");
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    objects.push(`<< /Length ${Buffer.byteLength(streamBody, "utf8")} >>\nstream\n${streamBody}\nendstream`);
  }

  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "utf8");
}
