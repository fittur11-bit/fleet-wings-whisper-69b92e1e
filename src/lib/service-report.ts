import { jsPDF } from "jspdf";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SERVICE_TYPES } from "./constants";

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

export async function generateServiceReport(service: any, aircraft?: any): Promise<Blob> {
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
  doc.text("FleetControl — Aviation", margin, y);
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

  // Checklist
  const checklist: Array<{ label: string; done?: boolean }> = service.checklist || [];
  if (checklist.length) {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(20, 20, 30);
    doc.text("Checklist", margin, y);
    y += 6;
    doc.setFontSize(10);
    checklist.forEach((it) => {
      ensureSpace(6);
      const mark = it.done ? "[X]" : "[ ]";
      doc.setFont("helvetica", "bold");
      doc.setTextColor(it.done ? 30 : 150, it.done ? 130 : 150, it.done ? 60 : 160);
      doc.text(mark, margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(20, 20, 30);
      const lines = doc.splitTextToSize(it.label, pageW - margin * 2 - 10);
      doc.text(lines, margin + 8, y);
      y += 5.5 * lines.length;
    });
    y += 4;
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

  // Photos
  const photos: string[] = (service.photos || []).filter(Boolean);
  if (photos.length) {
    doc.addPage();
    y = margin;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(20, 20, 30);
    doc.text(`Fotos (${photos.length})`, margin, y);
    y += 6;

    const cols = 2;
    const gap = 5;
    const imgW = (pageW - margin * 2 - gap * (cols - 1)) / cols;
    let col = 0;
    let rowH = 0;
    let xPos = margin;

    for (const url of photos) {
      const img = await fetchImageAsDataURL(url);
      if (!img) continue;
      const ratio = img.h / img.w;
      const h = imgW * ratio;
      if (col === 0) {
        ensureSpace(h + 4);
        xPos = margin;
        rowH = h;
      } else {
        rowH = Math.max(rowH, h);
      }
      const fmt = img.data.startsWith("data:image/png") ? "PNG" : "JPEG";
      try {
        doc.addImage(img.data, fmt, xPos, y, imgW, h);
      } catch {
        // skip unsupported format
      }
      col++;
      if (col >= cols) {
        col = 0;
        y += rowH + gap;
      } else {
        xPos += imgW + gap;
      }
    }
  }

  // Footer page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 150);
    doc.text(`Página ${i} de ${pageCount}`, pageW - margin, pageH - 8, { align: "right" });
    doc.text("FleetControl", margin, pageH - 8);
  }

  return doc.output("blob");
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