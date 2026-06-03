import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AIRCRAFT_STATUS, AIRCRAFT_CATEGORIES } from "./constants";

async function fetchImageAsDataURL(url: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = dataUrl;
    });
    return { data: dataUrl, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  try { return format(new Date(d), "dd/MM/yyyy", { locale: ptBR }); } catch { return String(d); }
};

const statusLabel = (v?: string) =>
  AIRCRAFT_STATUS.find((s) => s.value === v)?.label || v || "—";
const categoryLabel = (v?: string) =>
  AIRCRAFT_CATEGORIES.find((c) => c.value === v)?.label || v || "—";

export async function generateFleetReport(aircraft: any[]): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  // ===== Cover =====
  doc.setFillColor(15, 18, 28);
  doc.rect(0, 0, pageW, pageH, "F");
  // Gold accent band
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 70, pageW, 1.2, "F");

  doc.setTextColor(212, 175, 55);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("FLIGHTCORE • AVIATION", margin, 30);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(34);
  doc.text("Relatório de Frota", margin, 55);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(200, 205, 215);
  doc.text("Cadastro completo das aeronaves", margin, 64);

  // Stats block
  const total = aircraft.length;
  const byStatus = aircraft.reduce<Record<string, number>>((acc, a) => {
    const k = a.status || "inactive";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const totalHours = aircraft.reduce((s, a) => s + Number(a.total_hours || 0), 0);

  const statCard = (x: number, y: number, w: number, h: number, label: string, value: string) => {
    doc.setFillColor(28, 32, 46);
    doc.roundedRect(x, y, w, h, 2, 2, "F");
    doc.setTextColor(160, 170, 185);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(label.toUpperCase(), x + 4, y + 7);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(value, x + 4, y + 20);
  };

  const cardW = (pageW - margin * 2 - 8) / 3;
  statCard(margin, 95, cardW, 28, "Aeronaves", String(total));
  statCard(margin + cardW + 4, 95, cardW, 28, "Horas totais", `${totalHours.toFixed(1)}h`);
  statCard(margin + (cardW + 4) * 2, 95, cardW, 28, "Ativas", String(byStatus.active || 0));

  // Status legend
  let ly = 140;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(212, 175, 55);
  doc.text("DISTRIBUIÇÃO POR STATUS", margin, ly);
  ly += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(230, 235, 245);
  AIRCRAFT_STATUS.forEach((s) => {
    const n = byStatus[s.value] || 0;
    doc.text(`• ${s.label}`, margin, ly);
    doc.text(String(n), margin + 60, ly, { align: "right" });
    ly += 6;
  });

  // Footer of cover
  doc.setFontSize(9);
  doc.setTextColor(150, 158, 175);
  doc.text(
    `Emitido em ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`,
    margin,
    pageH - 20
  );
  doc.text("Documento gerado eletronicamente — FlightCore", margin, pageH - 14);

  // ===== Aircraft pages — one per aircraft =====
  for (const a of aircraft) {
    doc.addPage();

    // Top bar
    doc.setFillColor(20, 24, 36);
    doc.rect(0, 0, pageW, 22, "F");
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 22, pageW, 0.6, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(a.prefix || "—", margin, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(200, 205, 215);
    doc.text(`${a.manufacturer || ""} ${a.model || ""}`.trim() || "—", margin + 40, 14);

    doc.setFontSize(9);
    doc.setTextColor(212, 175, 55);
    doc.text(statusLabel(a.status).toUpperCase(), pageW - margin, 14, { align: "right" });

    let y = 32;

    // Hero photo
    if (a.photo_url) {
      const img = await fetchImageAsDataURL(a.photo_url);
      if (img) {
        const boxW = pageW - margin * 2;
        const boxH = 75;
        const ratio = img.w / img.h;
        let drawW = boxW;
        let drawH = boxW / ratio;
        if (drawH > boxH) {
          drawH = boxH;
          drawW = boxH * ratio;
        }
        const offX = margin + (boxW - drawW) / 2;
        const offY = y + (boxH - drawH) / 2;
        doc.setFillColor(245, 246, 250);
        doc.roundedRect(margin, y, boxW, boxH, 2, 2, "F");
        try {
          const fmt = img.data.startsWith("data:image/png") ? "PNG" : "JPEG";
          doc.addImage(img.data, fmt, offX, offY, drawW, drawH);
        } catch (e) { console.error("hero img", e); }
        y += boxH + 6;
      }
    }

    // Specs section
    doc.setFillColor(245, 246, 250);
    doc.rect(margin, y - 5, pageW - margin * 2, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(20, 24, 36);
    doc.text("ESPECIFICAÇÕES", margin + 2, y);
    y += 8;

    const fields: Array<[string, string]> = [
      ["Prefixo", a.prefix || "—"],
      ["Status", statusLabel(a.status)],
      ["Fabricante", a.manufacturer || "—"],
      ["Modelo", a.model || "—"],
      ["N° Série", a.serial_number || "—"],
      ["Ano", a.year ? String(a.year) : "—"],
      ["Categoria", categoryLabel(a.category)],
      ["Horas Totais", `${Number(a.total_hours || 0).toFixed(1)} h`],
      ["Proprietário", a.owner || "—"],
      ["Vencimento CVA", fmtDate(a.cva_expiration)],
      ["Última Inspeção", fmtDate(a.last_inspection_date)],
      ["Cadastrado em", fmtDate(a.created_at)],
    ];

    const colW = (pageW - margin * 2) / 2;
    const rowH = 9;
    fields.forEach((f, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = margin + col * colW;
      const cy = y + row * rowH;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(110, 118, 135);
      doc.text(f[0].toUpperCase(), x + 2, cy);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(20, 24, 36);
      const lines = doc.splitTextToSize(f[1], colW - 6);
      doc.text(lines[0] || "—", x + 2, cy + 4.5);
      // bottom divider
      doc.setDrawColor(232, 234, 240);
      doc.setLineWidth(0.1);
      doc.line(x + 2, cy + 6.5, x + colW - 2, cy + 6.5);
    });
    y += Math.ceil(fields.length / 2) * rowH + 4;

    // Notes
    if (a.notes) {
      if (y > pageH - 50) { doc.addPage(); y = margin; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(20, 24, 36);
      doc.text("OBSERVAÇÕES", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(55, 60, 75);
      const noteLines = doc.splitTextToSize(String(a.notes), pageW - margin * 2);
      noteLines.forEach((ln: string) => {
        if (y > pageH - 20) { doc.addPage(); y = margin; }
        doc.text(ln, margin, y);
        y += 5;
      });
      y += 4;
    }

    // Gallery
    const gallery: string[] = Array.isArray(a.gallery) ? a.gallery.filter(Boolean) : [];
    if (gallery.length) {
      if (y > pageH - 60) { doc.addPage(); y = margin; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(20, 24, 36);
      doc.text(`GALERIA (${gallery.length})`, margin, y);
      y += 6;

      const cols = 3;
      const gap = 4;
      const cellW = (pageW - margin * 2 - gap * (cols - 1)) / cols;
      const cellH = cellW * 0.72;
      let col = 0;
      let xPos = margin;
      for (const url of gallery) {
        const img = await fetchImageAsDataURL(url);
        if (!img) continue;
        if (col === 0 && y + cellH > pageH - margin) {
          doc.addPage();
          y = margin;
        }
        const ratio = img.w / img.h;
        let drawW = cellW, drawH = cellW / ratio;
        if (drawH > cellH) { drawH = cellH; drawW = cellH * ratio; }
        const offX = xPos + (cellW - drawW) / 2;
        const offY = y + (cellH - drawH) / 2;
        doc.setFillColor(245, 246, 250);
        doc.roundedRect(xPos, y, cellW, cellH, 1.5, 1.5, "F");
        try {
          const fmt = img.data.startsWith("data:image/png") ? "PNG" : "JPEG";
          doc.addImage(img.data, fmt, offX, offY, drawW, drawH);
        } catch (e) { console.error("gallery img", e); }
        col++;
        if (col >= cols) { col = 0; y += cellH + gap; xPos = margin; }
        else { xPos += cellW + gap; }
      }
      if (col !== 0) y += cellH + gap;
    }
  }

  // ===== Footer on every page =====
  const pageCount = doc.getNumberOfPages();
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(230, 232, 238);
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 148, 165);
    doc.text("FlightCore Aviation — Relatório de Frota", margin, pageH - 7);
    doc.text(`Página ${i} de ${pageCount}`, pageW - margin, pageH - 7, { align: "right" });
  }

  return doc.output("blob");
}

export async function downloadFleetReport(aircraft: any[]) {
  const blob = await generateFleetReport(aircraft);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `frota-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return blob;
}