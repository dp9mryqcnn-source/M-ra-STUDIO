// Le Monde de MLB — types

export type MlbAgentId = "plume" | "margaux";

export type MlbAuthor = "user" | MlbAgentId;

export interface MlbBook {
  id: string;
  title: string;
  subtitle: string;
  genre: string;
  createdAt: number;
  updatedAt: number;
}

export interface MlbChapter {
  id: string;
  bookId: string;
  number: number;
  title: string;
  /** L'idée brute de Marie-Laure */
  idea: string;
  /** Le texte final retenu pour le chapitre (sert au PDF) */
  finalText: string;
  status: "brouillon" | "en-cours" | "termine";
  updatedAt: number;
}

export interface MlbMessage {
  id: string;
  chapterId: string;
  author: MlbAuthor;
  content: string;
  /** Indique un message d'orchestration (passage d'un agent à l'autre) */
  handoff?: boolean;
  timestamp: number;
}
