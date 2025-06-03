/**
 * Scira Adapter
 *
 * This file implements the site adapter for scira.ai
 */

import { BaseAdapter } from './common';
import { logMessage } from '../utils/helpers';
import { insertToolResultToChatInput, attachFileToChatInput, submitChatInput } from '../components/websites/scira';
import { SidebarManager } from '../components/sidebar';
import { initSciraComponents } from './adaptercomponents';
export class SciraAdapter extends BaseAdapter {
  name = 'Scira';
  hostname = ['scira.ai'];

  // Properties to track navigation
  private lastUrl: string = '';
  private urlCheckInterval: number | null = null;

  constructor() {
    super();
    // Create the sidebar manager instance
    this.sidebarManager = SidebarManager.getInstance('scira');
    logMessage('Created Scira sidebar manager instance');
    // initSciraComponents();
  }

  protected initializeSidebarManager(): void {
    this.sidebarManager.initialize();
  }

  protected initializeObserver(forceReset: boolean = false): void {
    // super.initializeObserver(forceReset);
    initSciraComponents();

    // Start URL checking to handle navigation within AiStudio
    if (!this.urlCheckInterval) {
      this.lastUrl = window.location.href;
      this.urlCheckInterval = window.setInterval(() => {
        const currentUrl = window.location.href;

        if (currentUrl !== this.lastUrl) {
          logMessage(`URL changed from ${this.lastUrl} to ${currentUrl}`);
          this.lastUrl = currentUrl;

          initSciraComponents();
          // Check if we should show or hide the sidebar based on URL
          this.checkCurrentUrl();
        }
      }, 1000); // Check every second
    }
  }

  cleanup(): void {
    // Clear interval for URL checking
    if (this.urlCheckInterval) {
      window.clearInterval(this.urlCheckInterval);
      this.urlCheckInterval = null;
    }

    // Call the parent cleanup method
    super.cleanup();
  }

  /**
   * Insert text into the Scira input field
   * @param text Text to insert
   */
  insertTextIntoInput(text: string): void {
    insertToolResultToChatInput(text);
    logMessage(`Inserted text into Scira input: ${text.substring(0, 20)}...`);
  }

  /**
   * Trigger submission of the Scira input form
   */
  triggerSubmission(): void {
    // Use the function to submit the form
    submitChatInput()
      .then((success: boolean) => {
        logMessage(`Triggered Scira form submission: ${success ? 'success' : 'failed'}`);
      })
      .catch((error: Error) => {
        logMessage(`Error triggering Scira form submission: ${error}`);
      });
  }

  /**
   * Check if Scira supports file upload
   * @returns true if file upload is supported
   */
  supportsFileUpload(): boolean {
    return true;
  }

  /**
   * Attach a file to the Scira input
   * @param file The file to attach
   * @returns Promise that resolves to true if successful
   */
  async attachFile(file: File): Promise<boolean> {
    try {
      const result = await attachFileToChatInput(file);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logMessage(`Error in adapter when attaching file to Scira input: ${errorMessage}`);
      console.error('Error in adapter when attaching file to Scira input:', error);
      return false;
    }
  }

  /**
   * Force a full document scan for tool commands
   * This is useful when we suspect tool commands might have been missed
   */
  public forceFullScan(): void {
    logMessage('Forcing full document scan for Scira');
  }

  /**
   * Check the current URL and show/hide sidebar accordingly
   */
  private checkCurrentUrl(): void {
    const currentUrl = window.location.href;
    logMessage(`Checking current Scira URL: ${currentUrl}`);

    // For AiStudio, we want to show the sidebar on all pages
    // You can customize this with specific URL patterns if needed
    if (this.sidebarManager && !this.sidebarManager.getIsVisible()) {
      logMessage('Showing sidebar for Scira URL');
      this.sidebarManager.showWithToolOutputs();
    }
  }
}
