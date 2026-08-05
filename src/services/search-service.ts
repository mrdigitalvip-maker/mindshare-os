import { MODULES } from "@/lib/modules";
import { readMockDatabase } from "./local-store";

export const SearchService = {
  search(query: string) {
    const text = query.trim().toLowerCase();
    const database = readMockDatabase();
    return [
      ...MODULES.map((module) => ({
        id: module.id,
        title: module.label,
        description: module.description,
        path: module.path,
      })),
      ...database.projects.map((project) => ({
        id: project.id,
        title: project.title,
        description: "Project",
        path: "/projects",
      })),
      ...database.documents.map((document) => ({
        id: document.id,
        title: document.title,
        description: document.summary,
        path: "/documents",
      })),
    ].filter((item) => !text || `${item.title} ${item.description}`.toLowerCase().includes(text));
  },
};
