/**
 * BasePlatform.ts
 * Base class for all AI platform integrations in MCP SuperAssistant
 */

import { ToolCall, PlatformConfig, ToolResult, Logger, LogLevel } from '../types';

export abstract class BasePlatform {
  protected config?: PlatformConfig;
  protected logger: Logger;
  
  abstract readonly name: string;
  abstract readonly displayName: string;
  abstract readonly domain: string;
  
  constructor(config?: PlatformConfig) {
    this.config = config;
    this.logger = this.createLogger();
  }

  /**
   * Abstract methods that must be implemented by platform-specific classes
   */
  abstract getInputElement(): HTMLElement | null;
  abstract getChatContainer(): HTMLElement | null;
  abstract getResponseArea(): HTMLElement | null;
  abstract detectToolCalls(content: string): ToolCall[];
  abstract insertResults(results: string, toolCall: ToolCall): Promise<boolean>;

  /**
   * Platform identification - should be implemented by each platform
   */
  static identify(): boolean {
    throw new Error('identify() method must be implemented by platform class');
  }

  /**
   * Get platform configuration
   */
  abstract getConfig(): PlatformConfig;

  /**
   * Initialize the platform
   */
  initialize(): void {
    this.logger.info(`[${this.name}] Platform initialized`);
    this.setupEventListeners();
  }

  /**
   * Cleanup platform resources
   */
  cleanup(): void {
    this.logger.info(`[${this.name}] Platform cleanup`);
  }

  /**
   * Check if platform is ready
   */
  isReady(): boolean {
    const inputElement = this.getInputElement();
    const chatContainer = this.getChatContainer();
    return !!(inputElement && chatContainer);
  }

  /**
   * Set up event listeners for platform interactions
   */
  protected setupEventListeners(): void {
    // Listen for tool call events
    window.addEventListener('mcpToolCallsDetected', this.handleToolCallsDetected.bind(this));
    
    // Listen for page changes
    window.addEventListener('popstate', this.handlePageChange.bind(this));
    
    // Set up DOM observation
    this.observePageChanges();
  }

  /**
   * Handle detected tool calls
   */
  protected handleToolCallsDetected(event: CustomEvent): void {
    if (event.detail.platform !== this.name) {
      return;
    }
    
    const toolCalls = event.detail.toolCalls as ToolCall[];
    this.logger.info(`[${this.name}] Tool calls detected:`, toolCalls);
    
    // Emit to MCP SuperAssistant
    this.emitMCPEvent('tool_call_detected', { toolCalls });
  }

  /**
   * Handle page changes
   */
  protected handlePageChange(): void {
    this.logger.debug(`[${this.name}] Page change detected`);
    // Re-initialize if needed
    setTimeout(() => this.checkAndReinitialize(), 1000);
  }

  /**
   * Check if re-initialization is needed
   */
  protected checkAndReinitialize(): void {
    if (!this.isReady()) {
      this.logger.warn(`[${this.name}] Platform not ready, reinitializing...`);
      this.initialize();
    }
  }

  /**
   * Observe page changes using MutationObserver
   */
  protected observePageChanges(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          this.handleDOMChanges(mutation);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Handle DOM changes
   */
  protected handleDOMChanges(mutation: MutationRecord): void {
    // Default implementation - can be overridden by platforms
    this.logger.debug(`[${this.name}] DOM changes detected`);
  }

  /**
   * Execute a tool call via MCP
   */
  async executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
    this.logger.info(`[${this.name}] Executing tool call:`, toolCall);
    
    try {
      // Emit tool execution request
      const event = new CustomEvent('mcpExecuteToolCall', {
        detail: { toolCall, platform: this.name }
      });
      window.dispatchEvent(event);
      
      // Wait for result (this would be handled by the MCP client)
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Tool execution timeout'));
        }, 30000); // 30 second timeout
        
        const resultHandler = (event: CustomEvent) => {
          if (event.detail.toolCallId === toolCall.id) {
            clearTimeout(timeout);
            window.removeEventListener('mcpToolResult', resultHandler);
            resolve(event.detail.result);
          }
        };
        
        window.addEventListener('mcpToolResult', resultHandler);
      });
      
    } catch (error) {
      this.logger.error(`[${this.name}] Tool execution failed:`, error);
      throw error;
    }
  }

  /**
   * Auto-submit functionality (optional implementation)
   */
  async autoSubmit(): Promise<boolean> {
    this.logger.warn(`[${this.name}] Auto-submit not implemented`);
    return false;
  }

  /**
   * Get current page content for context
   */
  getPageContent(): string {
    const chatContainer = this.getChatContainer();
    if (chatContainer) {
      return chatContainer.textContent || '';
    }
    return document.body.textContent || '';
  }

  /**
   * Emit MCP event
   */
  protected emitMCPEvent(type: string, data: any): void {
    const event = new CustomEvent('mcpEvent', {
      detail: {
        type,
        data,
        platform: this.name,
        timestamp: Date.now()
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Create a logger instance
   */
  protected createLogger(): Logger {
    const logLevel: LogLevel = 'info'; // Could be configurable
    
    return {
      debug: (message: string, ...args: any[]) => {
        if (logLevel === 'debug') {
          console.debug(message, ...args);
        }
      },
      info: (message: string, ...args: any[]) => {
        if (['debug', 'info'].includes(logLevel)) {
          console.info(message, ...args);
        }
      },
      warn: (message: string, ...args: any[]) => {
        if (['debug', 'info', 'warn'].includes(logLevel)) {
          console.warn(message, ...args);
        }
      },
      error: (message: string, ...args: any[]) => {
        console.error(message, ...args);
      }
    };
  }

  /**
   * Utility method to wait for element to appear
   */
  protected waitForElement(selector: string, timeout = 5000): Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Utility method to find element by multiple selectors
   */
  protected findElementBySelectors(selectors: string[]): HTMLElement | null {
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector) as HTMLElement;
        if (element && this.isElementVisible(element)) {
          return element;
        }
      } catch (error) {
        // Ignore invalid selectors
        this.logger.debug(`Invalid selector: ${selector}`);
      }
    }
    return null;
  }

  /**
   * Check if element is visible and interactable
   */
  protected isElementVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      element.offsetParent !== null
    );
  }

  /**
   * Focus element and scroll into view
   */
  protected focusElement(element: HTMLElement): void {
    element.focus();
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /**
   * Simulate typing in an input element
   */
  protected simulateTyping(element: HTMLInputElement | HTMLTextAreaElement, text: string): void {
    // Clear existing content
    element.value = '';
    element.focus();

    // Simulate typing character by character
    let index = 0;
    const typeNextChar = () => {
      if (index < text.length) {
        element.value += text[index];
        
        // Trigger input events
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        
        index++;
        setTimeout(typeNextChar, 50); // 50ms delay between characters
      }
    };
    
    typeNextChar();
  }
}