/**
 * EchoSphere Unified Panel Conversation Ledger
 *
 * Preserves unbroken chronological conversation history across all 3 panelists
 * (Neerja, Prabhat, Madhur) and candidate speech turns.
 */

export interface PanelTurn {
  role: 'User' | 'Shravya' | 'Prabhat' | 'Madhur' | 'Neerja';
  content: string;
  timestamp?: string;
}

const globalForLedger = globalThis as unknown as {
  panelLedgerStore: Map<string, PanelTurn[]> | undefined;
};

const ledgerStore =
  globalForLedger.panelLedgerStore ?? new Map<string, PanelTurn[]>();

if (process.env.NODE_ENV !== 'production') {
  globalForLedger.panelLedgerStore = ledgerStore;
}

export class PanelLedger {
  /**
   * Retrieves all recorded turns for a session.
   */
  static getTurns(sessionId: string): PanelTurn[] {
    return ledgerStore.get(sessionId) ?? [];
  }

  /**
   * Appends a new turn (User or Panelist) to the session memory.
   */
  static append(sessionId: string, turn: PanelTurn): void {
    const turns = this.getTurns(sessionId);
    turns.push({
      ...turn,
      timestamp: turn.timestamp || new Date().toISOString(),
    });
    ledgerStore.set(sessionId, turns);
  }

  /**
   * Formats full chronological transcript string for LLM context injection.
   */
  static getChronologicalTranscript(sessionId: string): string {
    const turns = this.getTurns(sessionId);
    if (turns.length === 0) return 'No conversation history yet.';
    return turns.map((t) => `${t.role}: "${t.content}"`).join('\n');
  }

  /**
   * Clears ledger state for a session.
   */
  static clear(sessionId?: string): void {
    if (sessionId) {
      ledgerStore.delete(sessionId);
    } else {
      ledgerStore.clear();
    }
  }
}
