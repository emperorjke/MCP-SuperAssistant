/**
 * background.ts
 * Service worker for MCP SuperAssistant Chrome extension
 */

// Chrome extension background script
console.log('[MCP SuperAssistant] Background script loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[MCP SuperAssistant] Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.local.set({
      mcpServerUrl: 'http://localhost:3006/sse',
      autoExecute: false,
      autoSubmit: false,
      sidebarPosition: 'right',
      sidebarWidth: 360,
      theme: 'auto'
    });
    
    // Open welcome page
    chrome.tabs.create({
      url: 'https://github.com/emperorjke/MCP-SuperAssistant/blob/main/README.md'
    });
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[MCP SuperAssistant] Message received:', message);
  
  switch (message.type) {
    case 'getStatus':
      handleGetStatus(sendResponse);
      break;
      
    case 'updateSettings':
      handleUpdateSettings(message.settings, sendResponse);
      break;
      
    case 'checkPlatformSupport':
      handleCheckPlatformSupport(message.url, sendResponse);
      break;
      
    case 'executeToolCall':
      handleExecuteToolCall(message.toolCall, sendResponse);
      break;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
  
  return true; // Keep message channel open for async response
});

/**
 * Handle status request
 */
function handleGetStatus(sendResponse: (response: any) => void) {
  chrome.storage.local.get(null, (settings) => {
    sendResponse({
      version: '0.2.0',
      settings,
      supported: true
    });
  });
}

/**
 * Handle settings update
 */
function handleUpdateSettings(settings: any, sendResponse: (response: any) => void) {
  chrome.storage.local.set(settings, () => {
    if (chrome.runtime.lastError) {
      sendResponse({ error: chrome.runtime.lastError.message });
    } else {
      sendResponse({ success: true });
    }
  });
}

/**
 * Check if URL/platform is supported
 */
function handleCheckPlatformSupport(url: string, sendResponse: (response: any) => void) {
  const supportedDomains = [
    'scira.ai',
    'chatgpt.com',
    'www.perplexity.ai',
    'gemini.google.com',
    'grok.x.ai',
    'aistudio.google.com',
    'openrouter.ai',
    'chat.deepseek.com',
    'kagi.com',
    't3.chat'
  ];
  
  try {
    const domain = new URL(url).hostname;
    const isSupported = supportedDomains.includes(domain);
    
    sendResponse({
      supported: isSupported,
      domain,
      platform: getPlatformName(domain)
    });
  } catch (error) {
    sendResponse({
      supported: false,
      error: 'Invalid URL'
    });
  }
}

/**
 * Get platform name from domain
 */
function getPlatformName(domain: string): string {
  const platformMap: Record<string, string> = {
    'scira.ai': 'scira',
    'chatgpt.com': 'chatgpt',
    'www.perplexity.ai': 'perplexity',
    'gemini.google.com': 'gemini',
    'grok.x.ai': 'grok',
    'aistudio.google.com': 'aistudio',
    'openrouter.ai': 'openrouter',
    'chat.deepseek.com': 'deepseek',
    'kagi.com': 'kagi',
    't3.chat': 't3chat'
  };
  
  return platformMap[domain] || 'unknown';
}

/**
 * Handle tool call execution (proxy to MCP server)
 */
async function handleExecuteToolCall(toolCall: any, sendResponse: (response: any) => void) {
  try {
    // Get MCP server URL from settings
    const settings = await new Promise<any>((resolve) => {
      chrome.storage.local.get(['mcpServerUrl'], resolve);
    });
    
    const serverUrl = settings.mcpServerUrl || 'http://localhost:3006';
    
    // Execute tool call via MCP server
    const response = await fetch(`${serverUrl}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'execute_tool',
        id: toolCall.id,
        tool_name: toolCall.name,
        arguments: toolCall.arguments
      })
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }
    
    const result = await response.json();
    sendResponse({ success: true, result });
    
  } catch (error) {
    console.error('[MCP SuperAssistant] Tool execution failed:', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

// Handle tab updates to inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const domain = new URL(tab.url).hostname;
    const supportedDomains = [
      'scira.ai',
      'chatgpt.com',
      'www.perplexity.ai',
      'gemini.google.com',
      'grok.x.ai',
      'aistudio.google.com',
      'openrouter.ai',
      'chat.deepseek.com',
      'kagi.com',
      't3.chat'
    ];
    
    if (supportedDomains.includes(domain)) {
      console.log(`[MCP SuperAssistant] Supported platform detected: ${domain}`);
      
      // Inject content script if not already injected
      chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          // Check if already injected
          if (!(window as any).MCPSuperAssistant) {
            console.log('[MCP SuperAssistant] Content script not found, injecting...');
            return false; // Not injected
          }
          return true; // Already injected
        }
      }).then((results) => {
        if (results && results[0] && !results[0].result) {
          // Inject content script
          chrome.scripting.executeScript({
            target: { tabId },
            files: ['content/index.iife.js']
          }).catch((error) => {
            console.error('[MCP SuperAssistant] Failed to inject content script:', error);
          });
        }
      }).catch((error) => {
        console.error('[MCP SuperAssistant] Failed to check injection status:', error);
      });
    }
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    // Send message to content script to toggle sidebar
    chrome.tabs.sendMessage(tab.id, {
      type: 'toggleSidebar'
    }).catch((error) => {
      console.error('[MCP SuperAssistant] Failed to send toggle message:', error);
    });
  }
});

// Set up context menu (optional)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'mcp-superassistant-execute',
    title: 'Execute MCP Tool',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'mcp-superassistant-execute' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'executeSelectedTool',
      text: info.selectionText
    });
  }
});

// Health check endpoint for debugging
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'health-check') {
    port.postMessage({ status: 'healthy', timestamp: Date.now() });
  }
});

export {}; // Make this a module