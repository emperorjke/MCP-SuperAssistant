/**
 * Scira website components for MCP-SuperAssistant
 *
 * This file implements the MCP popover button for Scira website with toggle functionality:
 * 1. MCP ON/OFF toggle
 * 2. Auto Insert toggle
 * 3. Auto Submit toggle
 * 4. Auto Execute toggle
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { MCPPopover } from '../../components/mcpPopover/mcpPopover';
import type { AdapterConfig, ToggleStateManager, SimpleSiteAdapter } from './common';
import {
  initializeAdapter,
  MCPToggleState,
  insertToggleButtonsCommon, // Import common inserter if needed
} from './common';

// Keep Scira-specific functions or overrides

// Find where to insert the MCP popover in Scira UI
function findSciraButtonInsertionPoint(): Element | null {
  // Look for the composer footer actions container first
  // const composerFooter = document.querySelector('[data-testid="composer-footer-actions"]');
  // if (composerFooter) {
  //   console.debug('[Scira Adapter] Found composer footer actions container');
  //   return composerFooter;
  // }

  // Try specific selectors first based on observed structure
  // const specificContainer = document.querySelector('textarea + div .flex.items-center.gap-2');
  // if (specificContainer) {
  //   console.debug('[Scira Adapter] Found specific button container (textarea + div .flex...)');
  //   return specificContainer;
  // }

  // const buttonContainer = document.querySelector('.flex.items-center.gap-2.overflow-x-auto');
  // if (buttonContainer) {
  //   console.debug('[Scira Adapter] Found primary button container (.flex.items-center.gap-2.overflow-x-auto)');
  //   return buttonContainer;
  // }

  // Try alternative selectors
  // const altButtonContainer = document.querySelector('.max-xs\\:gap-1.flex.items-center.gap-2');
  // if (altButtonContainer) {
  //   console.debug('[Scira Adapter] Found alternative button container (.max-xs...flex.items-center.gap-2)');
  //   return altButtonContainer;
  // }

  // Try parent of tools button as fallback
  // const toolsButton = document.querySelector('[aria-label*="tool"]'); // More generic label search
  // if (toolsButton && toolsButton.parentElement) {
  //   console.debug('[Scira Adapter] Found tools button parent as fallback');
  //   return toolsButton.parentElement;
  // }

  // Placeholder selector
  const placeholderContainer = document.querySelector('#mcp-button-placeholder');
  if (placeholderContainer) {
    console.debug('[Scira Adapter] Found placeholder container for MCP button');
    return placeholderContainer;
  }

  console.warn('[Scira Adapter] Could not find any suitable container for MCP button');
  return null;
}

// Custom insertion logic for Scira to place the button correctly (e.g., as the third button)
function insertSciraButtons(config: AdapterConfig, stateManager: ToggleStateManager): void {
  console.debug(`[${config.adapterName}] Inserting MCP popover button (Scira specific)`);

  if (document.getElementById('mcp-popover-container')) {
    console.debug(`[${config.adapterName}] MCP popover already exists, applying state.`);
    stateManager.applyLoadedState();
    return;
  }

  // Use the specific finder function - note it returns Element | null, not the object structure
  const container = config.findButtonInsertionPoint() as Element | null;
  if (!container) {
    console.debug(`[${config.adapterName}] Could not find insertion point, retrying...`);
    setTimeout(() => insertSciraButtons(config, stateManager), 1000);
    return;
  }

  try {
    // Scira Specific: Create a wrapper div that matches other action buttons' structure
    const buttonWrapper = document.createElement('div');
    buttonWrapper.style.viewTransitionName = 'var(--vt-composer-mcp-action)';

    // Create the React container
    const reactContainer = document.createElement('div');
    reactContainer.id = 'mcp-popover-container';
    reactContainer.style.display = 'inline-block';
    reactContainer.className = 'mcp-popover-wrapper';
    reactContainer.style.margin = '0 4px'; // Consistent spacing

    // Add the React container inside the wrapper
    buttonWrapper.appendChild(reactContainer);

    // Ensure container is still in the DOM
    if (!document.body.contains(container)) {
      console.debug(`[${config.adapterName}] Insertion container is no longer in the DOM, retrying...`);
      setTimeout(() => insertSciraButtons(config, stateManager), 1000);
      return;
    }

    // Insert the wrapper as a direct child of the composer footer actions container
    // This places it at the same level as other action buttons
    container.appendChild(buttonWrapper);
    console.debug(`[${config.adapterName}] Inserted MCP button wrapper as direct child of actions container.`);

    // Render the React MCPPopover using the common method's approach
    ReactDOM.createRoot(reactContainer).render(
      React.createElement(MCPPopover, {
        toggleStateManager: {
          getState: stateManager.getState.bind(stateManager),
          setMCPEnabled: stateManager.setMCPEnabled.bind(stateManager),
          setAutoInsert: stateManager.setAutoInsert.bind(stateManager),
          setAutoSubmit: stateManager.setAutoSubmit.bind(stateManager),
          setAutoExecute: stateManager.setAutoExecute.bind(stateManager),
          updateUI: stateManager.updateUI.bind(stateManager),
        },
      }),
    );

    console.debug(`[${config.adapterName}] MCP popover rendered successfully.`);
    stateManager.applyLoadedState();
  } catch (error) {
    console.error(`[${config.adapterName}] Error inserting MCP popover:`, error);
    // Fallback to common inserter? Or just retry specific one?
    // setTimeout(() => insertSciraButtons(config, stateManager), 2000);
  }
}

// Scira-specific sidebar handling
function showSciraSidebar(adapter: SimpleSiteAdapter | null): void {
  console.debug('[Scira Adapter] MCP Enabled - Showing sidebar');
  if (adapter?.showSidebarWithToolOutputs) {
    adapter.showSidebarWithToolOutputs();
  } else if (adapter?.toggleSidebar) {
    adapter.toggleSidebar(); // Fallback
  } else {
    console.warn('[Scira Adapter] No method found to show sidebar.');
  }
}

function hideSciraSidebar(adapter: SimpleSiteAdapter | null): void {
  console.debug('[Scira Adapter] MCP Disabled - Hiding sidebar');
  if (adapter?.hideSidebar) {
    adapter.hideSidebar();
  } else if (adapter?.sidebarManager?.hide) {
    adapter.sidebarManager.hide();
  } else if (adapter?.toggleSidebar) {
    adapter.toggleSidebar(); // Fallback
  } else {
    console.warn('[Scira Adapter] No method found to hide sidebar.');
  }
}

// Scira-specific URL key generation
function getSciraURLKey(): string {
  const url = window.location.href;
  // Example: Use 'scira_chat' for main chat, maybe different for settings etc.
  if (url.includes('/c/')) {
    // If it's a specific chat URL
    // Could potentially use the chat ID, but might create too many keys.
    // Let's stick to a general key for chats.
    return 'scira_chat';
  }
  // Default key for other Scira pages (e.g., main page without /c/)
  if (url.includes('scira.ai')) {
    return 'scira_main';
  }
  // Fallback generic key
  return 'scira_default';
}

// Scira Adapter Configuration
const sciraAdapterConfig: AdapterConfig = {
  adapterName: 'Scira',
  storageKeyPrefix: 'mcp-scira-state', // Uses localStorage
  findButtonInsertionPoint: findSciraButtonInsertionPoint, // Use the specific finder
  insertToggleButtons: insertSciraButtons, // Use the specific inserter
  getStorage: () => localStorage, // Scira uses localStorage
  getCurrentURLKey: getSciraURLKey, // Use specific URL key logic
  onMCPEnabled: showSciraSidebar,
  onMCPDisabled: hideSciraSidebar,
};

// Initialize Scira components using the common initializer
export function initSciraComponents(): void {
  console.debug('Initializing Scira components using common framework');
  const stateManager = initializeAdapter(sciraAdapterConfig);

  // Expose manual injection for debugging (optional)
  window.injectMCPButtons = () => {
    console.debug('Manual injection for Scira triggered');
    const insertFn = (window as any)[`injectMCPButtons_${sciraAdapterConfig.adapterName}`];
    if (insertFn) {
      insertFn();
    } else {
      // Fallback to calling the specific insert function directly if global not set
      // Need the stateManager instance, which isn't easily available here.
      // Re-running init might be an option, or just rely on the auto-retry logic.
      console.warn('Manual injection function not found. Re-initialization might be needed.');
      // insertSciraButtons(sciraAdapterConfig, stateManager); // stateManager not available here
    }
  };

  console.debug('Scira components initialization complete.');
}

// --- Removed Code ---
// - SimpleSiteAdapter interface (moved to common)
// - Global window interface extension (handled in common)
// - MCPToggleState interface (moved to common)
// - defaultState constant (moved to common)
// - toggleState variable (managed within common)
// - toggleStateManager object (replaced by ToggleStateManager class in common)
// - loadState/saveState functions (handled by ToggleStateManager)
// - updateButtonStates (handled by ToggleStateManager.updateUI)
// - showSidebar/hideSidebar/showSidebarWithToolOutputs (integrated via config callbacks)
// - handleAutoInsert/handleAutoInsertWithFile/handleAutoSubmit (moved to common)
// - Event listener setup (handled by setupToolExecutionListener in common)
// - applyLoadedState (handled by ToggleStateManager)
// - Initialization logic structure (replaced by initializeAdapter)
// - MutationObserver and interval checks (handled within initializeAdapter)
