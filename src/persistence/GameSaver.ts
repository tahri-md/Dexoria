import { writeFile, readFile, readdir, unlink } from "fs/promises";
import { resolve } from "path";
import type { SaveFileData, SaveMetadata } from "./types.ts";

const SAVES_DIR = resolve("./saves");

export class GameSaver {
  static async createSaveDirectory(): Promise<void> {
    try {
      await readdir(SAVES_DIR);
    } catch {
      console.log("Creating saves directory...");
      const fs = await import("fs");
      fs.mkdirSync(SAVES_DIR, { recursive: true });
    }
  }

  static async saveGame(
    saveData: SaveFileData,
    fileName: string
  ): Promise<string> {
    try {
      await this.createSaveDirectory();

      const sanitizedName = this.sanitizeFileName(fileName);
      const filePath = resolve(SAVES_DIR, `${sanitizedName}.json`);

      const jsonString = JSON.stringify(saveData, null, 2);
      await writeFile(filePath, jsonString, "utf-8");

      return filePath;
    } catch (error) {
      throw new Error(`Failed to save game: ${error}`);
    }
  }

  static async loadGame(fileName: string): Promise<SaveFileData> {
    try {
      const sanitizedName = this.sanitizeFileName(fileName);
      const filePath = resolve(SAVES_DIR, `${sanitizedName}.json`);

      const jsonString = await readFile(filePath, "utf-8");
      const saveData = JSON.parse(jsonString) as SaveFileData;

      return saveData;
    } catch (error) {
      throw new Error(`Failed to load game: ${error}`);
    }
  }

  static async listSaves(): Promise<SaveMetadata[]> {
    try {
      await this.createSaveDirectory();

      const files = await readdir(SAVES_DIR);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));

      const saves: SaveMetadata[] = [];

      for (const file of jsonFiles) {
        try {
          const filePath = resolve(SAVES_DIR, file);
          const jsonString = await readFile(filePath, "utf-8");
          const data = JSON.parse(jsonString) as SaveFileData;

          saves.push({
            fileName: file.replace(".json", ""),
            playerName: data.playerName,
            timestamp: data.timestamp,
            gamePhase: data.gamePhase,
          });
        } catch {
          continue;
        }
      }

      return saves.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error("Failed to list saves:", error);
      return [];
    }
  }

  static async deleteSave(fileName: string): Promise<void> {
    try {
      const sanitizedName = this.sanitizeFileName(fileName);
      const filePath = resolve(SAVES_DIR, `${sanitizedName}.json`);

      await unlink(filePath);
    } catch (error) {
      throw new Error(`Failed to delete save: ${error}`);
    }
  }

  private static sanitizeFileName(fileName: string): string {
    return fileName
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
      .substring(0, 50);
  }
}
