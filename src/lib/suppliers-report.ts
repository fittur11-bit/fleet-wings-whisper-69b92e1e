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

  // ===== Cover =====
  doc.setFillColor(15, 18, 28);
  doc.rect(0, 0, pageW, pageH, "F");
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 70, pageW, 1.2, "F");

  doc.setTextColor(212, 175, 55);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("FLIGHTCORE • AVIATION", margin, 30);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(34);
  doc.text("Relatório de Fornecedores", margin, 55);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(200, 205, 215);
  doc.text("Cadastro completo de oficinas e prestadores", margin, 64);

  // Stats
  const total = suppliers.length;
  const preferred = suppliers.filter((s) => s.preferred).length;
  const cities = new Set(suppliers.map((s) => s.city).filter(Boolean)).size;
  const rated = suppliers.filter((s) => s.rating);
  const avgRating = rated.length
    ? (rated.reduce((a, s) => a + Number(s.rating), 0) / rated.length).toFixed(1)
    : "—";

  const statCard = (x: number, y: number, w: number, h: number, label: string, value: string) => {
    doc.setFillColor(28, 32, 46);
    doc.roundedRect(x, y, w, h, 2, 2, "F");
    doc.setTextColor(160, 170, 185);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(label.toUpperCase(), x + 4, y + 7);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(value, x + 4, y + 18);
  };

  const cardW = (pageW - margin * 2 - 12) / 4;
  statCard(margin, 90, cardW, 24, "Total", String(total));
  statCard(margin + cardW + 4, 90, cardW, 24, "Preferenciais", String(preferred));
  statCard(margin + (cardW + 4) * 2, 90, cardW, 24, "Cidades", String(cities));
  statCard(margin + (cardW + 4) * 3, 90, cardW, 24, "Nota Média", avgRating);

  // Categories breakdown
  const byCat: Record<string, number> = {};
  suppliers.forEach((s) => {
    const k = s.category || "other";
    byCat[k] = (byCat[k] || 0) + 1;
  });
  doc.setTextColor(212, 175, 55);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("DISTRIBUIÇÃO POR CATEGORIA", margin, 130);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(220, 225, 235);
  let y = 138;
  Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, n]) => {
      doc.text(`• ${cat(k)}`, margin + 2, y);
      doc.text(String(n), pageW - margin - 8, y, { align: "right" });
      y += 6;
      if (y > pageH - 40) return;
    });

  doc.setTextColor(140, 150, 165);
  doc.setFontSize(8);
  doc.text(
    `Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`,
    margin,
    pageH - 14
  );

  // ===== Supplier pages =====
  const sorted = [...suppliers].sort((a, b) => {
    if (a.preferred !== b.preferred) return a.preferred ? -1 : 1;
    return (a.name || "").localeCompare(b.name || "");
  });

  let pageIdx = 1;
  const totalPages = 1 + sorted.length;

  const drawFooter = () => {
    doc.setDrawColor(40, 45, 60);
    doc.setLineWidth(0.2);
    doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 150, 165);
    doc.text("FLIGHTCORE • Fornecedores", margin, pageH - 8);
    doc.text(`${pageIdx}/${totalPages}`, pageW - margin, pageH - 8, { align: "right" });
  };
  drawFooter();

  for (const s of sorted) {
    doc.addPage();
    pageIdx++;
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageW, pageH, "F");

    // Header band
    doc.setFillColor(15, 18, 28);
    doc.rect(0, 0, pageW, 36, "F");
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 36, pageW, 0.8, "F");

    doc.setTextColor(212, 175, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(cat(s.category).toUpperCase(), margin, 14);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    const nameText = (s.preferred ? "★ " : "") + (s.name || "—");
    doc.text(nameText, margin, 25);
    if (s.trade_name) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(200, 205, 215);
      doc.text(String(s.trade_name), margin, 32);
    }

    let cy = 50;

    // Section: Service types
    const services: string[] = Array.isArray(s.service_types) ? s.service_types : [];
    doc.setTextColor(80, 88, 105);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("TIPOS DE SERVIÇO", margin, cy);
    cy += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 35, 50);
    if (services.length) {
      // chips
      let x = margin;
      const chipY = cy;
      doc.setFontSize(9);
      services.forEach((t) => {
        const w = doc.getTextWidth(t) + 6;
        if (x + w > pageW - margin) {
          x = margin;
          cy += 8;
        }
        doc.setFillColor(240, 243, 248);
        doc.roundedRect(x, cy - 4, w, 6.5, 1.5, 1.5, "F");
        doc.setTextColor(40, 50, 70);
        doc.text(t, x + 3, cy + 0.5);
        x += w + 3;
      });
      cy += 10;
    } else {
      doc.setTextColor(140, 150, 165);
      doc.text("Não informado", margin, cy);
      cy += 8;
    }

    // Specialties
    if (s.specialties) {
      doc.setTextColor(80, 88, 105);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("ESPECIALIDADES", margin, cy);
      cy += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(30, 35, 50);
      const lines = doc.splitTextToSize(String(s.specialties), pageW - margin * 2);
      doc.text(lines, margin, cy);
      cy += lines.length * 5 + 4;
    }

    // Two-column data table
    const rows: [string, string][] = [
      ["Categoria", cat(s.category)],
      ["Faixa de preço", price(s.price_level)],
      ["Avaliação", s.rating ? `${Number(s.rating).toFixed(1)} / 5` : "—"],
      ["Prazo médio", s.lead_time_days ? `${s.lead_time_days} dias` : "—"],
      ["CNPJ", s.cnpj || "—"],
      ["Certificado ANAC", s.anac_certificate || "—"],
      ["Condições pagto.", s.payment_terms || "—"],
      ["Observação preços", s.avg_price_note || "—"],
      ["Pessoa de contato", s.contact_name || "—"],
      ["Telefone", s.phone || "—"],
      ["WhatsApp", s.whatsapp || "—"],
      ["E-mail", s.email || "—"],
      ["Website", s.website || "—"],
      ["Endereço", [s.address, s.zip_code].filter(Boolean).join(" – ") || "—"],
      ["Cidade / UF", [s.city, s.state].filter(Boolean).join(" / ") || "—"],
      ["País", s.country || "—"],
    ];

    doc.setTextColor(80, 88, 105);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("DADOS COMPLETOS", margin, cy);
    cy += 4;

    const colW = (pageW - margin * 2 - 6) / 2;
    const rowH = 11;
    rows.forEach((r, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = margin + col * (colW + 6);
      const ry = cy + row * rowH;
      if (ry > pageH - 40) return;
      doc.setFillColor(248, 250, 253);
      doc.roundedRect(x, ry, colW, rowH - 2, 1.5, 1.5, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(120, 130, 150);
      doc.text(r[0].toUpperCase(), x + 3, ry + 3.5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(25, 30, 45);
      const val = doc.splitTextToSize(r[1], colW - 6);
      doc.text(val[0] || "—", x + 3, ry + 8);
    });
    cy += Math.ceil(rows.length / 2) * rowH + 4;

    // Notes
    if (s.notes && cy < pageH - 40) {
      doc.setTextColor(80, 88, 105);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("OBSERVAÇÕES", margin, cy);
      cy += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(45, 50, 65);
      const noteLines = doc.splitTextToSize(String(s.notes), pageW - margin * 2);
      doc.text(noteLines.slice(0, 8), margin, cy);
    }

    drawFooter();
  }

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