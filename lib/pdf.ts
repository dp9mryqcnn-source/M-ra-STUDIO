"use client";

import type { Deliverable, Episode } from "./types";
import { AGENTS } from "./agents";

function loadJsPDF() {
  return import("jspdf").then((m) => m.jsPDF);
}

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

function addWrappedText(
  doc: InstanceType<Awaited<ReturnType<typeof loadJsPDF>>>,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  for (const line of lines) {
    if (y > PAGE_H - MARGIN - 10) {
      doc.addPage();
      y = MARGIN + 10;
    }
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

function drawHeader(doc: InstanceType<Awaited<ReturnType<typeof loadJsPDF>>>, subtitle: string) {
  doc.setFillColor(10, 10, 15);
  doc.rect(0, 0, PAGE_W, 28, "F");
  doc.setFontSize(18);
  doc.setTextColor(167, 139, 250);
  doc.setFont("helvetica", "bold");
  doc.text("MØRA STUDIO", MARGIN, 16);
  doc.setFontSize(9);
  doc.setTextColor(144, 144, 168);
  doc.setFont("helvetica", "normal");
  doc.text(subtitle, MARGIN, 23);
  doc.setDrawColor(42, 42, 58);
  doc.setLineWidth(0.3);
  doc.line(0, 28, PAGE_W, 28);
}

function drawFooter(doc: InstanceType<Awaited<ReturnType<typeof loadJsPDF>>>, pageNum: number) {
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 114);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Møra Studio — Page ${pageNum} — ${new Date().toLocaleDateString("fr-FR")}`,
    PAGE_W / 2,
    PAGE_H - 8,
    { align: "center" }
  );
}

export async function exportEpisodePDF(episode: Episode, deliverables: Deliverable[]) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  let page = 1;

  drawHeader(doc, `Épisode — ${episode.name}`);
  drawFooter(doc, page);

  let y = 38;

  // Episode title
  doc.setFontSize(20);
  doc.setTextColor(240, 240, 245);
  doc.setFont("helvetica", "bold");
  doc.text(episode.name, MARGIN, y);
  y += 8;

  if (episode.description) {
    doc.setFontSize(10);
    doc.setTextColor(144, 144, 168);
    doc.setFont("helvetica", "normal");
    y = addWrappedText(doc, episode.description, MARGIN, y, CONTENT_W, 5);
  }

  doc.setFontSize(8);
  doc.setTextColor(90, 90, 114);
  doc.text(
    `Créé le ${new Date(episode.createdAt).toLocaleDateString("fr-FR")} · ${deliverables.length} livrable(s) approuvé(s)`,
    MARGIN,
    y
  );
  y += 12;

  const sorted = [...deliverables].sort((a, b) => {
    const order = ["rea", "scena", "artia", "monty", "tikia", "compta", "lex", "sono"];
    return order.indexOf(a.agentId) - order.indexOf(b.agentId);
  });

  for (const d of sorted) {
    const agent = AGENTS.find((a) => a.id === d.agentId)!;

    if (y > PAGE_H - 50) {
      doc.addPage();
      page++;
      drawHeader(doc, `Épisode — ${episode.name}`);
      drawFooter(doc, page);
      y = 38;
    }

    // Section header
    doc.setFillColor(26, 26, 36);
    doc.roundedRect(MARGIN, y - 5, CONTENT_W, 14, 2, 2, "F");
    doc.setFontSize(11);
    doc.setTextColor(240, 240, 245);
    doc.setFont("helvetica", "bold");
    doc.text(`${d.agentEmoji}  ${d.agentName} — ${agent.shortRole}`, MARGIN + 4, y + 4);
    doc.setFontSize(7);
    doc.setTextColor(90, 90, 114);
    doc.text(
      new Date(d.approvedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }),
      PAGE_W - MARGIN,
      y + 4,
      { align: "right" }
    );
    y += 14;

    doc.setFontSize(9);
    doc.setTextColor(192, 192, 216);
    doc.setFont("helvetica", "normal");
    y = addWrappedText(doc, d.content, MARGIN, y, CONTENT_W, 5);
    y += 8;

    doc.setDrawColor(42, 42, 58);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 8;
  }

  doc.save(`Mora-${episode.name.replace(/\s+/g, "-")}.pdf`);
}

export async function exportAgentPDF(agentId: string, agentName: string, agentEmoji: string, deliverables: Deliverable[]) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  let page = 1;

  drawHeader(doc, `${agentEmoji} ${agentName} — Tous les livrables`);
  drawFooter(doc, page);

  let y = 38;

  doc.setFontSize(18);
  doc.setTextColor(240, 240, 245);
  doc.setFont("helvetica", "bold");
  doc.text(`${agentEmoji}  ${agentName}`, MARGIN, y);
  y += 7;

  const agent = AGENTS.find((a) => a.id === agentId);
  if (agent) {
    doc.setFontSize(10);
    doc.setTextColor(144, 144, 168);
    doc.setFont("helvetica", "normal");
    doc.text(agent.role, MARGIN, y);
    y += 5;
  }

  doc.setFontSize(8);
  doc.setTextColor(90, 90, 114);
  doc.text(`${deliverables.length} livrable(s) · Exporté le ${new Date().toLocaleDateString("fr-FR")}`, MARGIN, y);
  y += 12;

  const sorted = [...deliverables].sort((a, b) => a.approvedAt - b.approvedAt);

  for (const d of sorted) {
    if (y > PAGE_H - 50) {
      doc.addPage();
      page++;
      drawHeader(doc, `${agentEmoji} ${agentName}`);
      drawFooter(doc, page);
      y = 38;
    }

    doc.setFillColor(26, 26, 36);
    doc.roundedRect(MARGIN, y - 5, CONTENT_W, 14, 2, 2, "F");
    doc.setFontSize(10);
    doc.setTextColor(240, 240, 245);
    doc.setFont("helvetica", "bold");
    doc.text(d.episodeName, MARGIN + 4, y + 4);
    doc.setFontSize(7);
    doc.setTextColor(90, 90, 114);
    doc.text(
      new Date(d.approvedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }),
      PAGE_W - MARGIN,
      y + 4,
      { align: "right" }
    );
    y += 14;

    doc.setFontSize(9);
    doc.setTextColor(192, 192, 216);
    doc.setFont("helvetica", "normal");
    y = addWrappedText(doc, d.content, MARGIN, y, CONTENT_W, 5);
    y += 10;

    doc.setDrawColor(42, 42, 58);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y - 2, PAGE_W - MARGIN, y - 2);
    y += 6;
  }

  doc.save(`Mora-${agentName}-Livrables.pdf`);
}
