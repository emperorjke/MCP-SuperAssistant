/**
 * SciraPlatform.ts - Enhanced Scira.AI Integration
 * Platform implementation for Scira.AI integration with MCP SuperAssistant
 * Updated with real Scira.AI DOM selectors and Next.js specifics
 */

import { BasePlatform } from './BasePlatform';
import { ToolCall, PlatformConfig } from '../types';

export class SciraPlatform extends BasePlatform {
  readonly name = 'scira';
  readonly displayName = 'Scira AI';
  readonly domain = 'scira.ai';

  private lastProcessedContent = '';
  private observer?: MutationObserver;

  // Updated selectors based on real Scira.AI DOM structure
  private readonly selectors = {
    // Input elements - Scira.AI uses a search input
    inputField: [
      'input[type="text"][placeholder*="search"]',
      'input[type="text"][placeholder*="Search"]',
      'input[type="search"]',
      'textarea[placeholder*="Ask"]',
      'textarea[placeholder*="search"]',
      '[data-testid="search-input"]',
      '[data-testid="query-input"]',
      '.search-input',
      '.query-input',
      'input[name="q"]',
      'input[name="query"]',
      // Next.js app selectors
      '[role="searchbox"]',
      'input[aria-label*="search"]',
      'textarea[aria-label*="search"]'
    ],

    // Chat/response containers - Scira.AI displays results in a main area
    chatContainer: [
      '[data-testid="search-results"]',
      '[data-testid="results-container"]',
      '.search-results',
      '.results-container',
      '.content-container',
      '[role="main"]',
      'main',
      '.main-content',
      // Next.js app containers
      '#__next main',
      '.next-container',
      '.app-container'
    ],

    // Response areas where AI outputs appear
    responseArea: [
      '[data-testid="ai-response"]',
      '[data-testid="answer-area"]',
      '.ai-response',
      '.answer-container',
      '.response-container',
      '.result-content',
      '.search-answer',
      '[role="article"]',
      '.markdown-content',
      // Scira.AI specific (based on typical Next.js structure)
      '.prose',
      '.answer-section',
      '.ai-answer'
    ],

    // Submit buttons
    submitButton: [
      'button[type="submit"]',
      '[data-testid="search-button"]',
      '[data-testid="submit-button"]',
      '.search-button',
      '.submit-button',
      'button[aria-label*="Search"]',
      'button[aria-label*="Submit"]',
      // Icon buttons common in search interfaces
      'button svg[data-icon="search"]',
      'button .search-icon'
    ]
  };

  constructor(config?: PlatformConfig) {
    super(config);
    this.initializePlatform();
  }

  /**
   * Initialize Scira.AI specific platform features
   */
  private initializePlatform(): void {
    // Wait for Next.js hydration
    this.waitForNextJSReady().then(() => {
      this.setupContentObserver();
      this.detectTheme();
      this.injectPlatformStyles();
      this.setupNavigationHandling();
    });
  }

  /**
   * Wait for Next.js app to be ready
   */
  private async waitForNextJSReady(): Promise<void> {
    return new Promise((resolve) => {
      // Check if Next.js app is hydrated
      const checkReady = () => {
        const nextApp = document.getElementById('__next');
        const mainContent = document.querySelector('main');
        if (nextApp && mainContent) {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkReady);
      } else {
        checkReady();
      }
    });
  }

  /**
   * Get the main input element for queries
   */
  getInputElement(): HTMLElement | null {
    return this.findElementBySelectors(this.selectors.inputField);
  }

  /**
   * Get the chat container element
   */
  getChatContainer(): HTMLElement | null {
    return this.findElementBySelectors(this.selectors.chatContainer);
  }

  /**
   * Get the response area where AI outputs appear
   */
  getResponseArea(): HTMLElement | null {
    return this.findElementBySelectors(this.selectors.responseArea);
  }

  /**
   * Enhanced tool call detection for Scira.AI
   */
  detectToolCalls(content: string): ToolCall[] {
    // Avoid re-processing the same content
    if (content === this.lastProcessedContent) {
      return [];
    }
    this.lastProcessedContent = content;

    try {
      const toolCalls = this.parseToolCalls(content);
      
      if (toolCalls.length > 0) {
        this.logger.info(`[SciraPlatform] Detected ${toolCalls.length} tool calls`);
        // Emit tool calls detected event
        this.emitToolCallsDetected(toolCalls);
      }

      return toolCalls;
    } catch (error) {
      this.logger.error('[SciraPlatform] Error detecting tool calls:', error);
      return [];
    }
  }

  /**
   * Parse tool calls from content using multiple formats
   */
  private parseToolCalls(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    const timestamp = Date.now();

    // JSON format: {"tool": {"name": "...", "arguments": {...}}}
    const jsonMatches = content.match(/\{"tool":\s*\{[^}]+\}[^}]*\}/g);
    if (jsonMatches) {
      jsonMatches.forEach((match, index) => {
        try {
          const parsed = JSON.parse(match);
          if (parsed.tool && parsed.tool.name) {
            toolCalls.push({
              id: `json-${timestamp}-${index}`,
              name: parsed.tool.name,
              arguments: parsed.tool.arguments || {},
              content: match,
              timestamp
            });
          }
        } catch (e) {
          this.logger.debug('Failed to parse JSON tool call:', match);
        }
      });
    }

    // XML format: <mcp:tool_name arg="value" />
    const xmlMatches = content.match(/<mcp:(\w+)[^>]*\/>/g);
    if (xmlMatches) {
      xmlMatches.forEach((match, index) => {
        const nameMatch = match.match(/<mcp:(\w+)/);
        if (nameMatch) {
          const name = nameMatch[1];
          const args: Record<string, any> = {};
          
          // Extract attributes
          const attrMatches = match.match(/(\w+)="([^"]+)"/g);
          if (attrMatches) {
            attrMatches.forEach(attr => {
              const [, key, value] = attr.match(/(\w+)="([^"]+)"/) || [];
              if (key && value) {
                args[key] = value;
              }
            });
          }

          toolCalls.push({
            id: `xml-${timestamp}-${index}`,
            name,
            arguments: args,
            content: match,
            timestamp
          });
        }
      });
    }

    // Function call format: tool_name(arg1="value1", arg2="value2")
    const funcMatches = content.match(/(\w+)\([^)]*\)/g);
    if (funcMatches) {
      funcMatches.forEach((match, index) => {
        const nameMatch = match.match(/^(\w+)\(/);
        if (nameMatch) {
          const name = nameMatch[1];
          const args: Record<string, any> = {};
          
          // Extract arguments
          const argMatches = match.match(/(\w+)=["']?([^,"']+)["']?/g);
          if (argMatches) {
            argMatches.forEach(arg => {
              const [, key, value] = arg.match(/(\w+)=["']?([^,"']+)["']?/) || [];
              if (key && value) {
                args[key] = value;
              }
            });
          }

          toolCalls.push({
            id: `func-${timestamp}-${index}`,
            name,
            arguments: args,
            content: match,
            timestamp
          });
        }
      });
    }

    return toolCalls;
  }

  /**
   * Enhanced result insertion with Scira.AI compatibility
   */
  async insertResults(results: string, toolCall: ToolCall, options?: {
    format?: 'text' | 'json' | 'markdown' | 'raw';
    mode?: 'append' | 'replace' | 'new_message';
    autoSubmit?: boolean;
    showPreview?: boolean;
  }): Promise<boolean> {
    try {
      const insertOptions = {
        format: 'text' as const,
        mode: 'append' as const,
        autoSubmit: false,
        showPreview: true,
        ...options
      };

      // Format results for Scira.AI
      const formattedResults = this.formatResultsForScira(results, toolCall, insertOptions.format);

      // Show preview if enabled
      if (insertOptions.showPreview) {
        const shouldProceed = await this.showInsertPreview(formattedResults, toolCall);
        if (!shouldProceed) {
          return false;
        }
      }

      // Wait for input element to be available
      const inputElement = await this.waitForInputElement();
      if (!inputElement) {
        this.logger.warn('[SciraPlatform] Input element not found');
        return false;
      }

      // Perform insertion
      let success = false;
      switch (insertOptions.mode) {
        case 'append':
          success = await this.appendToInput(formattedResults, inputElement);
          break;
        case 'replace':
          success = await this.replaceInputContent(formattedResults, inputElement);
          break;
        case 'new_message':
          success = await this.createNewSearch(formattedResults, inputElement);
          break;
      }

      if (success) {
        this.logger.info(`[SciraPlatform] Results inserted successfully (${insertOptions.mode} mode)`);
        
        // Auto-submit if enabled
        if (insertOptions.autoSubmit) {
          await this.autoSubmit();
        }
        
        // Emit success event
        this.emitResultInsertedEvent(toolCall, formattedResults);
      }

      return success;
    } catch (error) {
      this.logger.error('[SciraPlatform] Error inserting results:', error);
      return false;
    }
  }

  /**
   * Wait for input element with retry
   */
  private async waitForInputElement(timeout = 5000): Promise<HTMLElement | null> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const element = this.getInputElement();
      if (element && this.isElementVisible(element)) {
        return element;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return null;
  }

  /**
   * Format results specifically for Scira.AI
   */
  private formatResultsForScira(results: string | any, toolCall: ToolCall, format: 'text' | 'json' | 'markdown' | 'raw' = 'text'): string {
    const timestamp = new Date().toLocaleTimeString();
    let content: string;

    if (typeof results === 'string') {
      content = results;
    } else if (typeof results === 'object') {
      content = JSON.stringify(results, null, 2);
    } else {
      content = String(results);
    }

    // Format for Scira.AI search context
    switch (format) {
      case 'json':
        return `\`\`\`json\n${content}\n\`\`\``;
      case 'markdown':
        return `## 🔧 Tool Result: ${toolCall.name}\n\n${content}\n\n*Executed at ${timestamp}*`;
      case 'raw':
        return content;
      case 'text':
      default:
        // Clean format for search queries
        return `Tool "${toolCall.name}" result: ${content}`;
    }
  }

  /**
   * Append results to current input
   */
  private async appendToInput(results: string, inputElement: HTMLElement): Promise<boolean> {
    if (inputElement instanceof HTMLInputElement || inputElement instanceof HTMLTextAreaElement) {
      const currentValue = inputElement.value;
      const separator = currentValue.trim() ? ' ' : '';
      const newValue = currentValue + separator + results;
      
      this.setInputValue(inputElement, newValue);
      this.focusAndPosition(inputElement, newValue.length);
      return true;
    }
    return false;
  }

  /**
   * Replace input content with results
   */
  private async replaceInputContent(results: string, inputElement: HTMLElement): Promise<boolean> {
    if (inputElement instanceof HTMLInputElement || inputElement instanceof HTMLTextAreaElement) {
      this.setInputValue(inputElement, results);
      this.focusAndPosition(inputElement, results.length);
      return true;
    }
    return false;
  }

  /**
   * Create new search with results
   */
  private async createNewSearch(results: string, inputElement: HTMLElement): Promise<boolean> {
    const success = await this.replaceInputContent(results, inputElement);
    if (success) {
      return await this.autoSubmit();
    }
    return false;
  }

  /**
   * Enhanced auto-submit for Scira.AI
   */
  async autoSubmit(): Promise<boolean> {
    try {
      this.logger.debug('[SciraPlatform] Attempting auto-submit');

      // Strategy 1: Find and click submit button
      const submitButton = this.findElementBySelectors(this.selectors.submitButton);
      if (submitButton && submitButton instanceof HTMLElement && !submitButton.hasAttribute('disabled')) {
        // Wait a bit for any state updates
        await new Promise(resolve => setTimeout(resolve, 100));
        submitButton.click();
        this.logger.info('[SciraPlatform] Auto-submit via button click');
        return true;
      }

      // Strategy 2: Use Enter key on input element
      const inputElement = this.getInputElement();
      if (inputElement) {
        inputElement.focus();
        
        // Create proper keyboard event
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
          shiftKey: false,
          ctrlKey: false,
          altKey: false,
          metaKey: false
        });
        
        inputElement.dispatchEvent(enterEvent);
        
        // Also dispatch on form if exists
        const form = inputElement.closest('form');
        if (form) {
          form.dispatchEvent(enterEvent);
        }
        
        this.logger.info('[SciraPlatform] Auto-submit via Enter key');
        return true;
      }

      // Strategy 3: Form submission
      const form = document.querySelector('form');
      if (form) {
        form.requestSubmit();
        this.logger.info('[SciraPlatform] Auto-submit via form submission');
        return true;
      }

      this.logger.warn('[SciraPlatform] No auto-submit method available');
      return false;
    } catch (error) {
      this.logger.error('[SciraPlatform] Error in auto-submit:', error);
      return false;
    }
  }

  /**
   * Enhanced input value setting with React compatibility
   */
  private setInputValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    // For React inputs, we need to trigger the right events
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(element.constructor.prototype, 'value')?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(element, value);
    } else {
      element.value = value;
    }

    // Trigger React events
    this.triggerReactInputEvents(element);
  }

  /**
   * Trigger React-compatible input events
   */
  private triggerReactInputEvents(element: HTMLElement): void {
    // Standard DOM events
    const events = ['input', 'change', 'keyup'];
    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
    });

    // React-specific synthetic events
    try {
      // Find React fiber
      const reactKey = Object.keys(element).find(key =>
        key.startsWith('__reactInternalInstance') ||
        key.startsWith('__reactFiber') ||
        key.startsWith('_reactInternalFiber')
      );

      if (reactKey) {
        const reactInstance = (element as any)[reactKey];
        if (reactInstance?.memoizedProps?.onChange) {
          const syntheticEvent = {
            target: element,
            currentTarget: element,
            nativeEvent: new Event('input', { bubbles: true }),
            preventDefault: () => {},
            stopPropagation: () => {},
            persist: () => {}
          };
          reactInstance.memoizedProps.onChange(syntheticEvent);
        }
      }
    } catch (error) {
      this.logger.debug('[SciraPlatform] React event triggering failed:', error);
    }
  }

  /**
   * Focus and position cursor
   */
  private focusAndPosition(element: HTMLInputElement | HTMLTextAreaElement, position: number): void {
    element.focus();
    element.setSelectionRange(position, position);
  }

  /**
   * Setup content observer for dynamic changes
   */
  private setupContentObserver(): void {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              this.processNewContent(element);
            }
          });
        }
      });
    });

    // Start observing
    const container = this.getChatContainer() || document.body;
    this.observer.observe(container, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Process new content for tool calls
   */
  private processNewContent(element: Element): void {
    const textContent = element.textContent || '';
    if (textContent.trim() && textContent.length > 50) { // Avoid processing short content
      // Debounce to avoid excessive processing
      clearTimeout((this as any).processTimeout);
      (this as any).processTimeout = setTimeout(() => {
        this.detectToolCalls(textContent);
      }, 500);
    }
  }

  /**
   * Setup Next.js navigation handling
   */
  private setupNavigationHandling(): void {
    // Listen for Next.js router changes
    let currentUrl = window.location.href;
    
    const handleNavigation = () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        this.logger.debug('[SciraPlatform] Navigation detected, reinitializing...');
        
        // Reinitialize after navigation
        setTimeout(() => {
          this.setupContentObserver();
          this.detectTheme();
        }, 1000);
      }
    };

    // Listen for various navigation events
    window.addEventListener('popstate', handleNavigation);

    // Override Next.js router methods if available
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(handleNavigation, 100);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(handleNavigation, 100);
    };
  }

  /**
   * Enhanced theme detection for Scira.AI
   */
  private detectTheme(): 'light' | 'dark' {
    // Check various theme indicators
    const html = document.documentElement;
    const body = document.body;

    // Check for dark mode classes/attributes
    const isDark =
      html.classList.contains('dark') ||
      body.classList.contains('dark') ||
      html.getAttribute('data-theme') === 'dark' ||
      body.getAttribute('data-theme') === 'dark' ||
      html.style.colorScheme === 'dark';

    if (isDark) {
      return 'dark';
    }

    // Check computed styles
    const bodyStyles = window.getComputedStyle(body);
    const backgroundColor = bodyStyles.backgroundColor;
    
    if (backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
      const rgb = backgroundColor.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        const luminance = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
        return luminance < 128 ? 'dark' : 'light';
      }
    }

    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  }

  /**
   * Platform identification
   */
  static identify(): boolean {
    return window.location.hostname === 'scira.ai';
  }

  /**
   * Get platform-specific configuration
   */
  getConfig(): PlatformConfig {
    return {
      name: this.name,
      displayName: this.displayName,
      domain: this.domain,
      supportsAutoSubmit: true,
      supportsResultInsertion: true,
      supportedFormats: ['json', 'xml', 'text', 'markdown'],
      theme: this.detectTheme()
    };
  }

  /**
   * Cleanup when platform is destroyed
   */
  cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    clearTimeout((this as any).processTimeout);
    super.cleanup();
  }

  // Helper methods
  private emitToolCallsDetected(toolCalls: ToolCall[]): void {
    const event = new CustomEvent('mcpToolCallsDetected', {
      detail: { toolCalls, platform: this.name }
    });
    window.dispatchEvent(event);
  }

  private emitResultInsertedEvent(toolCall: ToolCall, results: string): void {
    const event = new CustomEvent('mcpResultInserted', {
      detail: {
        toolCall,
        results,
        platform: this.name,
        timestamp: Date.now()
      }
    });
    window.dispatchEvent(event);
  }

  private injectPlatformStyles(): void {
    const styles = `
      /* Scira.AI specific styles for MCP SuperAssistant */
      .mcp-sidebar-scira {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        --scira-primary: #007AFF;
        --scira-background: #FFFFFF;
        --scira-surface: #F8F9FA;
        --scira-text: #1C1C1E;
        --scira-border: #E5E5E7;
      }

      [data-theme="dark"] .mcp-sidebar-scira,
      .dark .mcp-sidebar-scira {
        --scira-background: #1C1C1E;
        --scira-surface: #2C2C2E;
        --scira-text: #FFFFFF;
        --scira-border: #38383A;
      }
    `;

    this.injectStyles(styles, 'scira-platform-styles');
  }

  private injectStyles(css: string, id: string): void {
    if (document.getElementById(id)) {
      return;
    }

    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }

  private async showInsertPreview(content: string, toolCall: ToolCall): Promise<boolean> {
    return new Promise((resolve) => {
      const modal = this.createPreviewModal(content, toolCall, resolve);
      document.body.appendChild(modal);
    });
  }

  private createPreviewModal(content: string, toolCall: ToolCall, resolve: (proceed: boolean) => void): HTMLElement {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const theme = this.detectTheme();
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: ${theme === 'dark' ? '#1C1C1E' : '#FFFFFF'};
      color: ${theme === 'dark' ? '#FFFFFF' : '#1C1C1E'};
      border-radius: 12px;
      padding: 24px;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;

    dialog.innerHTML = `
      <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">
        Insert Tool Result
      </h3>
      <p style="margin: 0 0 16px 0; color: #666; font-size: 14px;">
        Tool: <strong>${toolCall.name}</strong>
      </p>
      <div style="
        background: ${theme === 'dark' ? '#2C2C2E' : '#F8F9FA'};
        border: 1px solid ${theme === 'dark' ? '#38383A' : '#E5E5E7'};
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 20px;
        font-family: 'SF Mono', Monaco, monospace;
        font-size: 12px;
        white-space: pre-wrap;
        word-break: break-word;
        max-height: 300px;
        overflow-y: auto;
      ">${content}</div>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button id="cancel-btn" style="
          padding: 8px 16px;
          border: 1px solid ${theme === 'dark' ? '#38383A' : '#E5E5E7'};
          background: transparent;
          color: ${theme === 'dark' ? '#FFFFFF' : '#1C1C1E'};
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">Cancel</button>
        <button id="insert-btn" style="
          padding: 8px 16px;
          border: none;
          background: #007AFF;
          color: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        ">Insert</button>
      </div>
    `;

    modal.appendChild(dialog);

    const cleanup = () => modal.remove();

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        cleanup();
        resolve(false);
      }
    });

    dialog.querySelector('#cancel-btn')?.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    dialog.querySelector('#insert-btn')?.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve(false);
        document.removeEventListener('keydown', handleKeyDown);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return modal;
  }
}