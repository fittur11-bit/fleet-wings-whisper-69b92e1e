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

export async function generateServiceReport(service: any, aircraft?: any, partShipments: any[] = []): Promise<Blob> {
  let downloadedBytes = 0;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
      renderHeaderCompact();
    }
  };

  const renderHeaderCompact = () => {
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 0, pageW, 5, "F");
    y = margin + 5;
  };

  // Header
  doc.setFillColor(20, 20, 30);
  doc.rect(0, 0, pageW, 25, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("RELATÓRIO DE SERVIÇO", margin, 17);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text("FLIGHTCORE — AVIATION", margin, 21);
  
  doc.setTextColor(255, 255, 255);
  doc.text(
    `Emitido: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
    pageW - margin,
    17,
    { align: "right" }
  );
  
  y = 35;

  // Compact Info Grid
  const ac = aircraft || service.aircraft || {};
  const types = (service.service_types?.length ? service.service_types : [service.service_type])
    .filter(Boolean)
    .map((t: string) => SERVICE_TYPES.find((x) => x.value === t)?.label || t)
    .join(", ");

  const leftColX = margin;
  const rightColX = pageW / 2 + 5;
  const labelW = 35;

  const colW = (pageW - margin * 2) / 2 - 5;
  const valueMaxW = colW - labelW;

  const renderRow = (label: string, value: string, x: number, currentY: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 110);
    doc.text(`${label}:`, x, currentY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 30);
    const text = String(value || "—");
    const lines = doc.splitTextToSize(text, valueMaxW);
    doc.text(lines, x + labelW, currentY);
    return lines.length;
  };

  // Aircraft Section Header
  doc.setFillColor(245, 245, 250);
  doc.rect(margin, y - 5, pageW - margin * 2, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 30);
  doc.text("DADOS DA AERONAVE E SERVIÇO", margin + 2, y);
  y += 10;

  // Grid Layout
  const h1 = renderRow("Prefixo", ac.prefix || service.aircraft_prefix, leftColX, y);
  const h2 = renderRow("Status", service.status, rightColX, y);
  y += 6 * Math.max(h1, h2);

  const h3 = renderRow("Modelo", ac.model, leftColX, y);
  const h4 = renderRow("Data", service.performed_at ? format(parseISO(service.performed_at), "dd/MM/yyyy", { locale: ptBR }) : "", rightColX, y);
  y += 6 * Math.max(h3, h4);

  const h5 = renderRow("Fabricante", ac.manufacturer, leftColX, y);
  const h6 = renderRow("Horas Totais", ac.total_hours != null ? String(ac.total_hours) : "", rightColX, y);
  y += 6 * Math.max(h5, h6);

  const h7 = renderRow("N° Série", ac.serial_number, leftColX, y);
  const h8 = renderRow("Técnico", service.technician, rightColX, y);
  y += 6 * Math.max(h7, h8);
  // Proprietário pode ser longo — ocupa a linha inteira
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 110);
  doc.text("Proprietário:", leftColX, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(20, 20, 30);
  {
    const ownerLines = doc.splitTextToSize(String(ac.owner || "—"), pageW - margin * 2 - labelW);
    doc.text(ownerLines, leftColX + labelW, y);
    y += 6 * Math.max(1, ownerLines.length);
  }
  renderRow("Local", service.location, leftColX, y);
  y += 6;
  renderRow("Tipo(s)", types, leftColX, y);
  renderRow("Custo", service.cost != null ? `R$ ${Number(service.cost).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "", rightColX, y);
  
  y += 10;

  // Description and Notes
  if (service.description) {
    ensureSpace(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 30);
    doc.text("DESCRIÇÃO DOS SERVIÇOS", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const desc = doc.splitTextToSize(String(service.description), pageW - margin * 2);
    desc.forEach((line: string) => {
      ensureSpace(5);
      doc.text(line, margin, y);
      y += 5;
    });
    y += 5;
  }

  if (service.notes) {
    ensureSpace(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("OBSERVAÇÕES ADICIONAIS", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const notes = doc.splitTextToSize(String(service.notes), pageW - margin * 2);
    notes.forEach((line: string) => {
      ensureSpace(5);
      doc.text(line, margin, y);
      y += 5;
    });
    y += 5;
  }

  // Parts in Repair Section
  if (partShipments.length > 0) {
    ensureSpace(30);
    doc.setFillColor(245, 245, 250);
    doc.rect(margin, y - 5, pageW - margin * 2, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 30);
    doc.text("PEÇAS ENVIADAS PARA REPARO", margin + 2, y);
    y += 10;

    for (const ship of partShipments) {
      ensureSpace(25);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 30);
      doc.text(ship.part_name || "Peça sem nome", margin, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 90);
      
      const details = [
        ship.part_number ? `P/N: ${ship.part_number}` : null,
        ship.serial_number ? `S/N: ${ship.serial_number}` : null,
        ship.shipping_date ? `Enviado em: ${format(parseISO(ship.shipping_date), "dd/MM/yyyy")}` : null,
        ship.destination_workshop ? `Oficina: ${ship.destination_workshop}` : null,
        ship.status ? `Status: ${ship.status}` : null
      ].filter(Boolean).join("  •  ");

      doc.text(details, margin, y);
      y += 5;

      if (ship.notes) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 110);
        const notes = doc.splitTextToSize(`Obs: ${ship.notes}`, pageW - margin * 2);
        notes.forEach((line: string) => {
          ensureSpace(5);
          doc.text(line, margin, y);
          y += 4;
        });
      }

      // Show photo captions if they exist
      const partPhotos = ship.parts?.photos || [];
      const captions = partPhotos.map((p: any) => p.description).filter(Boolean);
      if (captions.length > 0) {
        doc.setFontSize(8);
        doc.setTextColor(110, 110, 120);
        captions.forEach((cap: string) => {
          ensureSpace(5);
          const capText = doc.splitTextToSize(`• Foto: ${cap}`, pageW - margin * 4);
          capText.forEach((line: string) => {
            doc.text(line, margin + 5, y);
            y += 4;
          });
        });
      }
      y += 3;
    }
    y += 5;
  }

  // Photos — ordered by upload timestamp
  const sortByUploadDate = (photos: any[]) => {
    const seen = new Set<string>();
    return photos
      .filter((p) => {
        const url = typeof p === 'string' ? p : p.url;
        if (!url || seen.has(url)) return false;
        seen.add(url);
        return true;
      })
      .map((p) => {
        const url = typeof p === 'string' ? p : p.url;
        const file = url.split("/").pop() || "";
        const ts = parseInt(file.split("-")[0], 10);
        return { 
          url, 
          description: typeof p === 'string' ? '' : p.description,
          ts: Number.isFinite(ts) ? ts : 0 
        };
      })
      .sort((a, b) => a.ts - b.ts);
  };

  const renderPhotoSection = async (title: string, photoObjects: any[]) => {
    if (!photoObjects.length) return;
    
    ensureSpace(30);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20, 20, 30);
    doc.text(`${title} (${photoObjects.length})`, margin, y);
    y += 8;

    const cols = 2;
    const gap = 6;
    const cellW = (pageW - margin * 2 - gap * (cols - 1)) / cols;
    const cellH = cellW * 0.75; // 4:3 aspect ratio cells

    let col = 0;
    let xPos = margin;

    for (const photo of photoObjects) {
      const img = await fetchImageAsDataURL(photo.url);
      if (!img) continue;
      downloadedBytes += img.bytes;

      if (col === 0) {
        // Need space for image + description lines
        const needed = cellH + (photo.description ? 12 : 5);
        if (y + needed > pageH - margin) {
          doc.addPage();
          y = margin + 10;
          xPos = margin;
        }
      }

      // Fit image inside cell
      const ratio = img.w / img.h;
      let drawW = cellW;
      let drawH = cellW / ratio;
      if (drawH > cellH) {
        drawH = cellH;
        drawW = cellH * ratio;
      }
      const offX = xPos + (cellW - drawW) / 2;
      const offY = y + (cellH - drawH) / 2;

      // Draw image
      const fmt = img.data.startsWith("data:image/png") ? "PNG" : "JPEG";
      try {
        doc.addImage(img.data, fmt, offX, offY, drawW, drawH);
      } catch (e) {
        console.error("PDF Image error", e);
      }

      // Border
      doc.setDrawColor(220, 220, 225);
      doc.setLineWidth(0.1);
      doc.rect(xPos, y, cellW, cellH);

      // Description
      if (photo.description) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 70);
        const descLines = doc.splitTextToSize(photo.description, cellW);
        let descY = y + cellH + 4;
        descLines.slice(0, 2).forEach((line: string) => {
          doc.text(line, xPos, descY);
          descY += 4;
        });
      }

      col++;
      if (col >= cols) {
        col = 0;
        y += cellH + (photoObjects.some(p => p.description) ? 15 : 8);
        xPos = margin;
      } else {
        xPos += cellW + gap;
      }
    }
    if (col !== 0) y += cellH + 15;
  };

  const photos = sortByUploadDate(service.photos || []);
  
  // Collect photos from service and from linked part shipments
  const shipmentPhotos = partShipments.flatMap(s => {
    const partPhotos = s.parts?.photos || [];
    return partPhotos.map((p: any) => ({
      ...p,
      description: `[PEÇA: ${s.part_name}] ${p.description || ''}`
    }));
  });

  const repairPhotos = sortByUploadDate([...(service.repair_photos || []), ...shipmentPhotos]);
  
  await renderPhotoSection("FOTOS DO SERVIÇO", photos);
  await renderPhotoSection("FOTOS DE PEÇAS / REPARO", repairPhotos);

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(230, 230, 235);
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 150);
    doc.text(`Página ${i} de ${pageCount}`, pageW - margin, pageH - 8, { align: "right" });
    doc.text("Documento gerado eletronicamente por FlightCore Aviation System", margin, pageH - 8);
  }

  const blob = doc.output("blob");

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

export async function downloadServiceReport(service: any, aircraft?: any, partShipments: any[] = []) {
  const blob = await generateServiceReport(service, aircraft, partShipments);
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
