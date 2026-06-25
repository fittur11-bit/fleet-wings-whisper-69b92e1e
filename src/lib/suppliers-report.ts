import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const CATEGORIES: Record<string, string> = {
  workshop: "Oficina / Centro de Manutenção",
  manufacturer: "Fabricante",
  distributor: "Distribuidor de Peças",
  avionics: "Aviônicos",
  engine_shop: "Oficina de Motor",
  propeller_shop: "Oficina de Hélice",
  paint_interior: "Pintura / Interior",
  fuel: "Combustível",
  transport: "Transporte / Frete",
  insurance: "Seguro",
  consulting: "Consultoria / ANAC",
  other: "Outros",
};

const PRICE_LEVELS: Record<string, string> = {
  low: "Econômico",
  medium: "Médio",
  high: "Alto",
  premium: "Premium",
};

const cat = (v?: string) => (v && CATEGORIES[v]) || v || "—";
const price = (v?: string) => (v && PRICE_LEVELS[v]) || "—";

export async function generateSuppliersReport(suppliers: any[]): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  const sorted = [...suppliers].sort((a, b) => {
    if (a.preferred !== b.preferred) return a.preferred ? -1 : 1;
    return (a.name || "").localeCompare(b.name || "");
  });

  // Stats
  const total = sorted.length;
  const preferred = sorted.filter((s) => s.preferred).length;
  const cities = new Set(sorted.map((s) => s.city).filter(Boolean)).size;

  // ===== Compact header (top of first page) =====
  const headerH = 28;
  doc.setFillColor(15, 18, 28);
  doc.rect(0, 0, pageW, headerH, "F");
  doc.setFillColor(212, 175, 55);
  doc.rect(0, headerH, pageW, 0.8, "F");

  doc.setTextColor(212, 175, 55);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("FLIGHTCORE • AVIATION", margin, 10);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("Relatório de Fornecedores", margin, 19);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(190, 195, 205);
  doc.text(
    `${total} fornecedores • ${preferred} preferenciais • ${cities} cidades  ·  Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
    margin,
    25
  );

  let pageIdx = 1;
  const drawFooter = () => {
    doc.setDrawColor(220, 225, 235);
    doc.setLineWidth(0.2);
    doc.line(margin, pageH - 10, pageW - margin, pageH - 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(140, 150, 165);
    doc.text("FLIGHTCORE • Fornecedores", margin, pageH - 5);
    doc.text(String(pageIdx), pageW - margin, pageH - 5, { align: "right" });
  };

  let cy = headerH + 6;
  const contentBottom = pageH - 14;

  const newPage = () => {
    drawFooter();
    doc.addPage();
    pageIdx++;
    cy = margin;
  };

  const ensureSpace = (needed: number) => {
    if (cy + needed > contentBottom) newPage();
  };

  // Measure-and-render a supplier card
  const renderSupplier = (s: any) => {
    const services: string[] = Array.isArray(s.service_types) ? s.service_types : [];
    const innerW = pageW - margin * 2 - 6; // card inner width with padding
    const colW = (innerW - 4) / 2;

    // Pre-compute chip layout height
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    let chipsLines = 1;
    if (services.length) {
      let x = 0;
      services.forEach((t) => {
        const w = doc.getTextWidth(t) + 5;
        if (x + w > innerW) {
          x = 0;
          chipsLines++;
        }
        x += w + 2;
      });
    }
    const chipsH = services.length ? chipsLines * 5.5 + 2 : 0;

    // Data rows (compact)
    const rows: [string, string][] = [
      ["Categoria", cat(s.category)],
      ["Avaliação", s.rating ? `${Number(s.rating).toFixed(1)}/5` : "—"],
      ["CNPJ", s.cnpj || "—"],
      ["ANAC", s.anac_certificate || "—"],
      ["Contato", s.contact_name || "—"],
      ["Telefone", s.phone || "—"],
      ["WhatsApp", s.whatsapp || "—"],
      ["E-mail", s.email || "—"],
      ["Cidade/UF", [s.city, s.state].filter(Boolean).join(" / ") || "—"],
      ["Endereço", s.address || "—"],
      ["Pagamento", s.payment_terms || "—"],
      ["Prazo médio", s.lead_time_days ? `${s.lead_time_days} dias` : "—"],
    ];
    const rowsH = Math.ceil(rows.length / 2) * 6.5;

    // Specialties
    let specH = 0;
    let specLines: string[] = [];
    if (s.specialties) {
      doc.setFontSize(8.5);
      specLines = doc.splitTextToSize(String(s.specialties), innerW);
      specH = specLines.length * 4 + 4;
    }

    // Notes
    let notesH = 0;
    let noteLines: string[] = [];
    if (s.notes) {
      doc.setFontSize(8.5);
      noteLines = doc.splitTextToSize(String(s.notes), innerW);
      // cap to 4 lines
      noteLines = noteLines.slice(0, 4);
      notesH = noteLines.length * 4 + 4;
    }

    const titleH = 9 + (s.trade_name ? 4 : 0);
    const cardH =
      4 /*top*/ +
      titleH +
      (chipsH ? chipsH + 3 : 0) +
      (specH ? specH : 0) +
      rowsH +
      (notesH ? notesH : 0) +
      4 /*bottom*/;

    ensureSpace(cardH + 3);

    // Card frame
    const cardX = margin;
    const cardY = cy;
    doc.setFillColor(250, 251, 253);
    doc.setDrawColor(225, 230, 240);
    doc.setLineWidth(0.25);
    doc.roundedRect(cardX, cardY, pageW - margin * 2, cardH, 2, 2, "FD");
    // Gold accent on left
    doc.setFillColor(212, 175, 55);
    doc.rect(cardX, cardY, 1.5, cardH, "F");

    let y = cardY + 6;
    const x0 = cardX + 5;

    // Title row
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(20, 25, 40);
    const nameText = (s.preferred ? "★ " : "") + (s.name || "—");
    const nameMaxW = pageW - margin * 2 - 10 - 40;
    const nameTrunc = doc.splitTextToSize(nameText, nameMaxW)[0];
    doc.text(nameTrunc, x0, y);

    // Category pill on right
    const catText = cat(s.category);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    const pillW = doc.getTextWidth(catText.toUpperCase()) + 5;
    doc.setFillColor(15, 18, 28);
    doc.roundedRect(cardX + pageW - margin * 2 - pillW - 5, y - 4, pillW, 5.5, 1.5, 1.5, "F");
    doc.setTextColor(212, 175, 55);
    doc.text(catText.toUpperCase(), cardX + pageW - margin * 2 - pillW - 5 + 2.5, y - 0.3);

    if (s.trade_name) {
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(110, 120, 140);
      doc.text(String(s.trade_name), x0, y);
    }
    y += 5;

    // Service chips
    if (chipsH) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      let cx = x0;
      let cyChip = y;
      services.forEach((t) => {
        const w = doc.getTextWidth(t) + 5;
        if (cx + w > x0 + innerW) {
          cx = x0;
          cyChip += 5.5;
        }
        doc.setFillColor(232, 237, 246);
        doc.roundedRect(cx, cyChip - 3.2, w, 4.5, 1, 1, "F");
        doc.setTextColor(40, 55, 85);
        doc.text(t, cx + 2.5, cyChip);
        cx += w + 2;
      });
      y = cyChip + 4;
    }

    // Specialties
    if (specH) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(120, 130, 150);
      doc.text("ESPECIALIDADES", x0, y);
      y += 3;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(40, 50, 70);
      doc.text(specLines, x0, y);
      y += specLines.length * 4 + 1;
    }

    // Two-column data
    rows.forEach((r, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const rx = x0 + col * (colW + 4);
      const ry = y + row * 6.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(130, 140, 160);
      doc.text(r[0].toUpperCase(), rx, ry);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(25, 30, 45);
      const val = doc.splitTextToSize(r[1] || "—", colW)[0];
      doc.text(val, rx, ry + 4);
    });
    y += rowsH + 1;

    // Notes
    if (notesH) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(120, 130, 150);
      doc.text("OBSERVAÇÕES", x0, y);
      y += 3;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(50, 55, 70);
      doc.text(noteLines, x0, y);
    }

    cy += cardH + 3;
  };

  for (const s of sorted) renderSupplier(s);
  drawFooter();

  return doc.output("blob");
}

export async function downloadSuppliersReport(suppliers: any[]) {
  const blob = await generateSuppliersReport(suppliers);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fornecedores-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}