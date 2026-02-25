import { create } from 'zustand';
import type { Document, DocumentCategory, DocumentTag, FormTemplate } from '../types';

interface DocumentFilters {
  status?: string;
  category_id?: string;
  tag_id?: string;
  search?: string;
  doc_type?: string;
  page: number;
  limit: number;
}

interface DocumentState {
  documents: Document[];
  totalDocuments: number;
  currentDocument: Document | null;
  categories: DocumentCategory[];
  tags: DocumentTag[];
  templates: FormTemplate[];
  filters: DocumentFilters;

  setDocuments: (documents: Document[], total: number) => void;
  setCurrentDocument: (doc: Document | null) => void;
  setCategories: (categories: DocumentCategory[]) => void;
  setTags: (tags: DocumentTag[]) => void;
  setTemplates: (templates: FormTemplate[]) => void;
  setFilters: (filters: Partial<DocumentFilters>) => void;
  resetFilters: () => void;
  updateDocumentInList: (doc: Document) => void;
  removeDocumentFromList: (id: string) => void;
}

const defaultFilters: DocumentFilters = {
  page: 1,
  limit: 20,
};

export const useDocumentStore = create<DocumentState>((set) => ({
  documents: [],
  totalDocuments: 0,
  currentDocument: null,
  categories: [],
  tags: [],
  templates: [],
  filters: { ...defaultFilters },

  setDocuments: (documents, total) => set({ documents, totalDocuments: total }),

  setCurrentDocument: (doc) => set({ currentDocument: doc }),

  setCategories: (categories) => set({ categories }),

  setTags: (tags) => set({ tags }),

  setTemplates: (templates) => set({ templates }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  resetFilters: () => set({ filters: { ...defaultFilters } }),

  updateDocumentInList: (doc) =>
    set((state) => ({
      documents: state.documents.map((d) => (d.id === doc.id ? doc : d)),
    })),

  removeDocumentFromList: (id) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
      totalDocuments: state.totalDocuments - 1,
    })),
}));
