import { invoke } from "@tauri-apps/api/core";

export interface CliCommand {
  id: string;
  name: string;
  command: string;
  requires_root: boolean;
  envs: Record<string, string>;
}

// Read
export async function readCommands() {
  const commands = await invoke<CliCommand[]>("get_all_commands");
  return commands;
}
// Create
export async function createCommand(command: CliCommand) {
  await invoke("create_command", { data: command });
}
// Update
export async function updateCommand(command: CliCommand) {  
  await invoke("update_command", { data: command });
}
// Delete
export async function deleteCommand(id: string) {
  await invoke("delete_command", { id });
}
// Execute
export async function executeCommand(id: string): Promise<void> {
  await invoke("execute_command", { id });
}