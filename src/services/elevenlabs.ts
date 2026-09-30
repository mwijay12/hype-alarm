import { invoke } from "@tauri-apps/api/core";

export const elevenlabsService = {
  async testApiKey(apiKey: string): Promise<string> {
    return await invoke<string>("test_ai_connection", { apiKey });
  },
};
