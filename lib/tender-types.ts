export interface TenderReference {
  id: string;
  client: string;
  description: string;
  value?: number;
  year: number;
  contact?: string;
}

export interface CompanyProfile {
  name: string;
  legalForm: string;
  siret: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  capital: string;
  effectif: number;
  yearFounded: number;
  certifications: string[];
  description: string;
  references: TenderReference[];
  updatedAt: number;
}

export type TenderStatus = "draft" | "in-progress" | "submitted" | "won" | "lost";
export type SectionStatus = "empty" | "draft" | "ready";

export interface TenderSection {
  id: string;
  title: string;
  requirement: string;
  content: string;
  required: boolean;
  status: SectionStatus;
}

export interface TenderDossier {
  id: string;
  reference: string;
  title: string;
  client: string;
  deadline: number;
  estimatedValue?: number;
  status: TenderStatus;
  createdAt: number;
  updatedAt: number;
  sections: TenderSection[];
  notes: string;
  category: string;
}
