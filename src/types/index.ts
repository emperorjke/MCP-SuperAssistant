/**
 * types.ts
 * Type definitions for MCP SuperAssistant platform integration
 */

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  content: string;
  timestamp?: number;
}

export interface PlatformConfig {
  name: string;
  displayName: string;
  domain: string;
  supportsAutoSubmit: boolean;
  supportsResultInsertion: boolean;
  supportedFormats: string[];
  theme: 'light' | 'dark';
}

export interface ToolResult {
  id: string;
  toolCallId: string;
  result: any;
  error?: string;
  timestamp: number;
}

export interface PlatformSelectors {
  inputField: string[];
  chatContainer: string[];
  responseArea: string[];
  submitButton: string[];
}

export interface MCPEvent {
  type: 'tool_call_detected' | 'tool_result_ready' | 'platform_ready';
  data: any;
  platform: string;
  timestamp: number;
}

export interface SidebarConfig {
  position: 'right' | 'left';
  width: number;
  theme: 'light' | 'dark' | 'auto';
  autoExecute: boolean;
  autoSubmit: boolean;
}

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  status: 'connected' | 'disconnected' | 'error';
  tools: MCPTool[];
}

export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  schema?: any;
}

export type PlatformTheme = 'light' | 'dark';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}