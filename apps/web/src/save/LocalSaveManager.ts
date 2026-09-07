export interface SavedCharacterData {
  x: number;
  y: number;
  z: number;
  yaw: number;
  health: number;
  oxygen: number;
  suitTemperature: number;
  suitIntegrity: number;
}

export interface SavedRoverData {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface GameSaveState {
  schema_version: number;
  timestamp: number;
  character: SavedCharacterData;
  rover: SavedRoverData;
  habCycleCount: number;
}

export class LocalSaveManager {
  private static readonly STORAGE_KEY = 'adventuremnc_m4_quicksave';
  private static readonly CURRENT_SCHEMA_VERSION = 1;

  public static save(
    char: SavedCharacterData,
    rover: SavedRoverData,
    habCycleCount = 1
  ): boolean {
    try {
      const state: GameSaveState = {
        schema_version: this.CURRENT_SCHEMA_VERSION,
        timestamp: Date.now(),
        character: char,
        rover,
        habCycleCount,
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  public static load(): GameSaveState | null {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as GameSaveState;
      if (!parsed || parsed.schema_version !== this.CURRENT_SCHEMA_VERSION) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  public static hasSave(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) !== null;
  }

  public static clear(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
