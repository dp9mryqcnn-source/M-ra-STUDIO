"use client";

import type { TenderDossier, CompanyProfile } from "./tender-types";

function loadJsPDF() {
  return import("jspdf").then((m) => m.jsPDF);
}

const PAGE_W = 210;
const PAGE_H = 297;
const M = 18;
const CW = PAGE_W - M * 2;

type Doc = InstanceType<Awaited<ReturnType<typeof loadJsPDF>>>;

function wrapped(doc: Doc, text: string, x: number, y: number, maxW: number, lh: number, onNewPage: () => void): number {
  const lines = doc.splitTextToSize(text, maxW) as string[];
  for (const line of lines) {
    if (y > PAGE_H - M - 14) {
      onNewPage();
      y = 42;
    }
    doc.text(line, x, y);
    y += lh;
  }
  return y;
}

export async function exportTenderPDF(dossier: TenderDossier, profile: CompanyProfile | null) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  let pageNum = 1;

  const drawHeader = () => {
    doc.setFillColor(7, 89, 133);
    doc.rect(0, 0, PAGE_W, 20, "F");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(profile?.name ?? "Candidat", M, 13);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Réf. ${dossier.reference}`, PAGE_W - M, 13, { align: "right" });
    doc.setDrawColor(14, 165, 233);
    doc.setLineWidth(0.4);
    doc.line(0, 20, PAGE_W, 20);
  };

  const drawFooter = () => {
    const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    doc.setFontSize(7.5);
    doc.setTextColor(130, 130, 150);
    doc.setFont("helvetica", "normal");
    doc.setDrawColor(210, 220, 230);
    doc.setLineWidth(0.2);
    doc.line(M, PAGE_H - 11, PAGE_W - M, PAGE_H - 11);
    doc.text(
      `${profile?.name ?? ""} — ${dossier.title} — Généré le ${date} — Page ${pageNum}`,
      PAGE_W / 2,
      PAGE_H - 6,
      { align: "center" }
    );
  };

  const addPage = () => {
    doc.addPage();
    pageNum++;
    drawHeader();
    drawFooter();
  };

  // ── Page 1: Couverture ──
  drawHeader();
  drawFooter();

  let y = 30;

  // Bandeau titre
  doc.setFillColor(240, 248, 254);
  doc.roundedRect(M, y, CW, 48, 2, 2, "F");
  doc.setDrawColor(7, 89, 133);
  doc.setLineWidth(0.8);
  doc.line(M, y, M, y + 48);

  y += 9;
  doc.setFontSize(7.5);
  doc.setTextColor(80, 130, 160);
  doc.setFont("helvetica", "bold");
  doc.text("DOSSIER DE CANDIDATURE — MARCHÉ PUBLIC", M + 5, y);

  y += 8;
  doc.setFontSize(13);
  doc.setTextColor(10, 20, 40);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(dossier.title, CW - 10) as string[];
  for (const line of titleLines) {
    doc.text(line, M + 5, y);
    y += 7;
  }

  y += 2;
  doc.setFontSize(9.5);
  doc.setTextColor(7, 89, 133);
  doc.setFont("helvetica", "bold");
  doc.text(`Acheteur : ${dossier.client}`, M + 5, y);
  y += 16;

  // Infos clés
  const statusLabel: Record<string, string> = {
    draft: "Brouillon", "in-progress": "En cours",
    submitted: "Soumis", won: "Gagné", lost: "Non retenu",
  };
  const infos = [
    ["Référence AO", dossier.reference],
    ["Catégorie", dossier.category],
    ["Date limite", new Date(dossier.deadline).toLocaleDateString("fr-FR")],
    ["Statut", statusLabel[dossier.status] ?? dossier.status],
    ...(dossier.estimatedValue ? [["Valeur estimée", `${dossier.estimatedValue.toLocaleString("fr-FR")} €`]] : []),
  ];

  for (let i = 0; i < infos.length; i += 2) {
    const l = infos[i];
    const r = infos[i + 1];
    doc.setFontSize(7.5);
    doc.setTextColor(100, 120, 140);
    doc.setFont("helvetica", "normal");
    doc.text(l[0], M, y);
    if (r) doc.text(r[0], PAGE_W / 2 + 2, y);
    y += 4.5;
    doc.setFontSize(9.5);
    doc.setTextColor(15, 25, 45);
    doc.setFont("helvetica", "bold");
    doc.text(l[1], M, y);
    if (r) doc.text(r[1], PAGE_W / 2 + 2, y);
    y += 9;
  }

  // Bloc candidat
  if (profile?.name) {
    y += 4;
    doc.setFillColor(236, 254, 250);
    doc.roundedRect(M, y, CW, 36, 2, 2, "F");
    doc.setDrawColor(13, 148, 136);
    doc.setLineWidth(0.6);
    doc.line(M, y, M, y + 36);

    y += 8;
    doc.setFontSize(7.5);
    doc.setTextColor(13, 148, 136);
    doc.setFont("helvetica", "bold");
    doc.text("CANDIDAT", M + 5, y);

    y += 6;
    doc.setFontSize(12);
    doc.setTextColor(10, 20, 40);
    doc.setFont("helvetica", "bold");
    doc.text(profile.name, M + 5, y);

    y += 5;
    doc.setFontSize(8.5);
    doc.setTextColor(60, 70, 90);
    doc.setFont("helvetica", "normal");
    doc.text(`${profile.legalForm} — SIRET : ${profile.siret || "N/A"} — Capital : ${profile.capital || "N/A"}`, M + 5, y);

    y += 5;
    const addr = [profile.address, `${profile.postalCode} ${profile.city}`, profile.country].filter(Boolean).join(", ");
    doc.text(addr, M + 5, y);
    y += 4;
    if (profile.email || profile.phone) {
      doc.text([profile.email, profile.phone].filter(Boolean).join("  ·  "), M + 5, y);
    }
    y += 12;
  }

  // ── Sections ──
  const filled = dossier.sections.filter((s) => s.content.trim().length > 0);

  for (const section of filled) {
    if (y > PAGE_H - 55) {
      addPage();
      y = 30;
    }

    // En-tête de section
    doc.setFillColor(7, 89, 133);
    doc.roundedRect(M, y, CW, 9, 1, 1, "F");
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(section.title, M + 4, y + 6.2);
    y += 13;

    // Contenu
    doc.setFontSize(9.5);
    doc.setTextColor(20, 30, 50);
    doc.setFont("helvetica", "normal");
    y = wrapped(doc, section.content, M, y, CW, 5.5, addPage);
    y += 8;

    doc.setDrawColor(190, 215, 235);
    doc.setLineWidth(0.2);
    doc.line(M, y - 4, PAGE_W - M, y - 4);
  }

  const fileName = `AO-${dossier.reference.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`;
  doc.save(fileName);
}
