"use client";

import type { MlbBook, MlbChapter, MlbMessage } from "./types";
import { getMlbAgent } from "./agents";

function loadJsPDF() {
  return import("jspdf").then((m) => m.jsPDF);
}

type Doc = InstanceType<Awaited<ReturnType<typeof loadJsPDF>>>;

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 22;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Palette « Le Monde de MLB »
const PEARL: [number, number, number] = [249, 246, 241];
const BLUSH: [number, number, number] = [225, 193, 182];
const GOLD: [number, number, number] = [214, 189, 159];
const TAUPE: [number, number, number] = [142, 126, 115];
const INK: [number, number, number] = [74, 64, 58];

function addWrapped(doc: Doc, text: string, x: number, y: number, maxW: number, lh: number): number {
  for (const para of text.split("\n")) {
    if (para.trim() === "") {
      y += lh;
      continue;
    }
    const lines = doc.splitTextToSize(para, maxW) as string[];
    for (const line of lines) {
      if (y > PAGE_H - MARGIN - 12) {
        doc.addPage();
        paintBackground(doc);
        y = MARGIN + 6;
      }
      doc.text(line, x, y);
      y += lh;
    }
  }
  return y;
}

function paintBackground(doc: Doc) {
  doc.setFillColor(...PEARL);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
}

function drawHeader(doc: Doc, title: string, subtitle: string) {
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, PAGE_W, 26, "F");
  doc.setFillColor(...BLUSH);
  doc.rect(0, 26, PAGE_W, 2, "F");
  doc.setFont("times", "bolditalic");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(title || "Mon livre", MARGIN, subtitle ? 16 : 18);
  if (subtitle) {
    doc.setFont("times", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(subtitle, MARGIN, 22);
  }
}

function drawFooter(doc: Doc, page: number, bookTitle: string) {
  void page;
  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...TAUPE);
  // Bas de page : uniquement le nom du livre
  doc.text(bookTitle, PAGE_W / 2, PAGE_H - 10, { align: "center" });
}

/**
 * Construit le PDF d'un chapitre.
 * @param withConversation inclut l'échange complet Plume / Margaux après le texte final.
 */
export async function buildChapterPdf(
  book: MlbBook,
  chapter: MlbChapter,
  messages: MlbMessage[],
  withConversation: boolean
): Promise<{ blob: Blob; filename: string }> {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ unit: "mm", format: "a4" });

  paintBackground(doc);
  drawHeader(doc, book.title, book.subtitle || "");
  drawFooter(doc, 1, book.title);

  let y = 46;

  // Titre du chapitre
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...TAUPE);
  doc.text(`CHAPITRE ${chapter.number}`, MARGIN, y);
  y += 9;
  doc.setFont("times", "bolditalic");
  doc.setFontSize(24);
  doc.setTextColor(...INK);
  y = addWrapped(doc, chapter.title || "Sans titre", MARGIN, y, CONTENT_W, 10);
  y += 4;

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, MARGIN + 40, y);
  y += 12;

  // Texte final du chapitre
  const text = chapter.finalText?.trim() || chapter.idea?.trim() || "(Chapitre encore vide)";
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  y = addWrapped(doc, text, MARGIN, y, CONTENT_W, 6.4);

  // Conversation complète (optionnelle)
  if (withConversation && messages.length > 0) {
    doc.addPage();
    paintBackground(doc);
    drawHeader(doc, book.title, "L'atelier — Plume & Margaux");
    let yy = 46;
    doc.setFont("times", "bolditalic");
    doc.setFontSize(16);
    doc.setTextColor(...TAUPE);
    doc.text("L'atelier d'écriture", MARGIN, yy);
    yy += 12;

    for (const m of messages) {
      if (yy > PAGE_H - 40) {
        doc.addPage();
        paintBackground(doc);
        drawHeader(doc, book.title, "L'atelier — Plume & Margaux");
        yy = 46;
      }
      const label =
        m.author === "user"
          ? "Marie-Laure"
          : `${getMlbAgent(m.author).emoji} ${getMlbAgent(m.author).name}`;
      doc.setFont("times", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...TAUPE);
      doc.text(label, MARGIN, yy);
      yy += 6;
      doc.setFont("times", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(...INK);
      yy = addWrapped(doc, m.content, MARGIN, yy, CONTENT_W, 5.4);
      yy += 7;
    }
  }

  const safe = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "chapitre";
  const filename = `MLB-${safe(book.title)}-Ch${chapter.number}-${safe(chapter.title)}.pdf`;
  return { blob: doc.output("blob"), filename };
}

/**
 * Enregistre le PDF sur le téléphone.
 * Sur iPhone/Android : ouvre la feuille de partage (« Enregistrer dans Fichiers »).
 * Sinon : téléchargement classique.
 */
export async function saveOrSharePdf(blob: Blob, filename: string): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "application/pdf" });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: filename });
      return "shared";
    } catch {
      /* annulé → on bascule sur téléchargement */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}
