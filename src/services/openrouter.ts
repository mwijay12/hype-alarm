import { invoke } from "@tauri-apps/api/core";

export const openrouterService = {
  async testApiKey(apiKey: string): Promise<string> {
    return await invoke<string>("test_ai_connection", { apiKey });
  },
};
