import { invoke } from "@tauri-apps/api/core";
import { Alarm } from "../lib/types";

export const alarmService = {
  async getAll(): Promise<Alarm[]> {
    return await invoke<Alarm[]>("get_alarms");
  },

  async save(alarm: Alarm): Promise<Alarm> {
    return await invoke<Alarm>("save_alarm", { alarm });
  },

  async toggle(id: string, enabled: boolean): Promise<boolean> {
    return await invoke<boolean>("toggle_alarm", { id, enabled });
  },

  async delete(id: string): Promise<boolean> {
    return await invoke<boolean>("delete_alarm", { id });
  },
};
