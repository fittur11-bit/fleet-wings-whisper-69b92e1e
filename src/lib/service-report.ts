import { jsPDF } from "jspdf";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SERVICE_TYPES } from "./constants";
import { trackUsage, COSTS, bytesToGB } from "./usage-tracking";

async function fetchImageAsDataURL(url: string): Promise<{ data: string; w: number; h: number; bytes: number } | null> {
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
    return { data: dataUrl, w: dims.w, h: dims.h, bytes: blob.size };
  } catch {
    return null;
  }
}

export async function generateServiceReport(service: any, aircraft?: any): Promise<Blob> {
  let downloadedBytes = 0;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Header gold bar
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 0, pageW, 8, "F");
  y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(20, 20, 30);
  doc.text("Relatório de Serviço", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 120);
  doc.text("FlightCore — Aviation", margin, y);
  doc.text(
    `Emitido em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
    pageW - margin,
    y,
    { align: "right" },
  );
  y += 8;

  doc.setDrawColor(220, 220, 225);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Aircraft section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 30);
  doc.text("Aeronave", margin, y);
  y += 6;

  const ac = aircraft || service.aircraft || {};
  const acRows: [string, string][] = [
    ["Prefixo", ac.prefix || service.aircraft_prefix || "—"],
    ["Modelo", ac.model || "—"],
    ["Fabricante", ac.manufacturer || "—"],
    ["N° Série", ac.serial_number || "—"],
    ["Proprietário", ac.owner || "—"],
    ["Horas Totais", ac.total_hours != null ? String(ac.total_hours) : "—"],
  ];
  doc.setFontSize(10);
  acRows.forEach(([k, v]) => {
    ensureSpace(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(90, 90, 100);
    doc.text(`${k}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 30);
    doc.text(String(v), margin + 35, y);
    y += 5.5;
  });
  y += 4;

  // Service section
  ensureSpace(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Detalhes do Serviço", margin, y);
  y += 6;

  const types = (service.service_types?.length ? service.service_types : [service.service_type])
    .filter(Boolean)
    .map((t: string) => SERVICE_TYPES.find((x) => x.value === t)?.label || t)
    .join(", ");

  const svcRows: [string, string][] = [
    ["Tipos", types || "—"],
    ["Status", service.status || "—"],
    ["Data", service.performed_at ? format(parseISO(service.performed_at), "dd/MM/yyyy", { locale: ptBR }) : "—"],
    ["Horas no Serviço", service.hours_at_service != null ? String(service.hours_at_service) : "—"],
    ["Técnico", service.technician || "—"],
    ["Local", service.location || "—"],
    ["Custo", service.cost != null ? `R$ ${Number(service.cost).toFixed(2)}` : "—"],
  ];
  doc.setFontSize(10);
  svcRows.forEach(([k, v]) => {
    ensureSpace(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(90, 90, 100);
    doc.text(`${k}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 30);
    doc.text(String(v), margin + 35, y);
    y += 5.5;
  });
  y += 3;

  if (service.description) {
    ensureSpace(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(90, 90, 100);
    doc.text("Descrição:", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 30);
    const desc = doc.splitTextToSize(String(service.description), pageW - margin * 2);
    desc.forEach((line: string) => {
      ensureSpace(5);
      doc.text(line, margin, y);
      y += 5;
    });
    y += 3;
  }


  if (service.notes) {
    ensureSpace(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Observações", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const notes = doc.splitTextToSize(String(service.notes), pageW - margin * 2);
    notes.forEach((line: string) => {
      ensureSpace(5);
      doc.text(line, margin, y);
      y += 5;
    });
    y += 4;
  }

  // Photos — ordered by upload timestamp embedded in the filename (Date.now() prefix)
  const sortByUploadDate = (urls: string[]) => {
    const seen = new Set<string>();
    return urls
      .filter((u) => {
        if (!u || seen.has(u)) return false;
        seen.add(u);
        return true;
      })
      .map((u) => {
        const file = u.split("/").pop() || "";
        const ts = parseInt(file.split("-")[0], 10);
        return { url: u, ts: Number.isFinite(ts) ? ts : 0 };
      })
      .sort((a, b) => a.ts - b.ts)
      .map((x) => x.url);
  };

  const renderPhotoSection = async (title: string, photos: string[]) => {
    if (!photos.length) return;
    doc.addPage();
    y = margin;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(20, 20, 30);
    doc.text(`${title} (${photos.length})`, margin, y);
    y += 6;

    // Uniform square cells; images rendered inside preserving aspect ratio (no distortion)
    const cols = 2;
    const gap = 5;
    const cellW = (pageW - margin * 2 - gap * (cols - 1)) / cols;
    const cellH = cellW; // square cells for consistent layout

    let col = 0;
    let xPos = margin;

    for (const url of photos) {
      const img = await fetchImageAsDataURL(url);
      if (!img) continue;
      downloadedBytes += img.bytes;

      if (col === 0) {
        ensureSpace(cellH + 4);
        xPos = margin;
      }

      // Fit image inside cell preserving aspect ratio (contain)
      const ratio = img.w / img.h;
      let drawW = cellW;
      let drawH = cellW / ratio;
      if (drawH > cellH) {
        drawH = cellH;
        drawW = cellH * ratio;
      }
      const offX = xPos + (cellW - drawW) / 2;
      const offY = y + (cellH - drawH) / 2;

      // Subtle frame around the cell for visual consistency
      doc.setDrawColor(230, 230, 235);
      doc.setLineWidth(0.2);
      doc.rect(xPos, y, cellW, cellH);

      const fmt = img.data.startsWith("data:image/png") ? "PNG" : "JPEG";
      try {
        doc.addImage(img.data, fmt, offX, offY, drawW, drawH);
      } catch {
        // skip unsupported format
      }

      col++;
      if (col >= cols) {
        col = 0;
        y += cellH + gap;
      } else {
        xPos += cellW + gap;
      }
    }
    if (col !== 0) y += cellH + gap;
  };

  const photos = sortByUploadDate((service.photos || []).filter(Boolean));
  const repairPhotos = sortByUploadDate((service.repair_photos || []).filter(Boolean));
  await renderPhotoSection("Fotos do Serviço", photos);
  await renderPhotoSection("Fotos de Peças / Reparo", repairPhotos);

  // Footer page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 150);
    doc.text(`Página ${i} de ${pageCount}`, pageW - margin, pageH - 8, { align: "right" });
    doc.text("FlightCore", margin, pageH - 8);
  }

  const blob = doc.output("blob");

  // Track PDF generation as egress (download bandwidth). bytes=0 to avoid
  // inflating the "Uploads" chart; real total is in metadata + cost.
  const totalEgressBytes = downloadedBytes + blob.size;
  await trackUsage({
    event_type: "db_write",
    category: "database",
    bytes: 0,
    units: 1,
    estimated_cost_usd: bytesToGB(totalEgressBytes) * COSTS.EGRESS_GB,
    metadata: {
      fn: "service-report",
      kind: "egress",
      service_id: service?.id,
      pdf_bytes: blob.size,
      photos_bytes: downloadedBytes,
      egress_bytes: totalEgressBytes,
      photos_count: photos.length + repairPhotos.length,
    },
  });

  return blob;
}

export async function downloadServiceReport(service: any, aircraft?: any) {
  const blob = await generateServiceReport(service, aircraft);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const prefix = aircraft?.prefix || service.aircraft_prefix || "servico";
  const date = service.performed_at || format(new Date(), "yyyy-MM-dd");
  a.download = `relatorio-${prefix}-${date}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return blob;
}