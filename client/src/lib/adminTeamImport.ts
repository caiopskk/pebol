import type { TeamImport } from "./teamImport.js";
import { parseImportedTeams } from "./teamImport.js";

export interface ImportTeamsFromFileOptions {
  isAdmin: boolean;
  createTeam: (team: TeamImport) => Promise<unknown>;
  onImported: (sourceKey: string) => void;
  onFinished: () => Promise<void>;
  showToast: (message: string) => void;
}

export async function importTeamsFromFileInput(
  input: HTMLInputElement,
  options: ImportTeamsFromFileOptions,
): Promise<void> {
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;

  try {
    const raw = JSON.parse(await file.text()) as unknown;
    const teams = parseImportedTeams(raw, options.isAdmin);
    if (!teams.length) {
      options.showToast("Nenhum time encontrado no JSON.");
      return;
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];
    for (const team of teams) {
      try {
        await options.createTeam(team);
        created++;
      } catch (e) {
        const msg = (e as Error).message || "";
        if (/já existe/i.test(msg)) skipped++;
        else errors.push(`${team.name}: ${msg}`);
      }
    }

    if (created) {
      options.onImported(`import:${file.name}:${file.size}:${Date.now()}`);
    }

    const parts: string[] = [];
    if (created) parts.push(`${created} importado${created > 1 ? "s" : ""}`);
    if (skipped) {
      parts.push(
        `${skipped} duplicado${skipped > 1 ? "s" : ""} ignorado${skipped > 1 ? "s" : ""}`,
      );
    }
    if (errors.length) parts.push(`${errors.length} com erro`);
    options.showToast(parts.join(" · ") || "Nenhum time importado.");
    if (errors.length) console.warn("Falhas na importação:", errors);
    await options.onFinished();
  } catch (e) {
    options.showToast((e as Error).message || "JSON inválido.");
  }
}
