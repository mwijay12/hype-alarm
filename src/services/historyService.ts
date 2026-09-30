export interface HistoryRecord {
  id: string;
  alarmId: string;
  alarmTitle: string;
  firedAt: number;
  dismissedAt: number;
  snoozeCount: number;
}

export const historyService = {
  async getHistory(): Promise<HistoryRecord[]> {
    return [];
  },

  async exportToCSV(): Promise<string> {
    return "id,alarmTitle,firedAt,dismissedAt,snoozeCount\n";
  },
};
