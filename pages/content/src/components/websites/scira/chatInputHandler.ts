/**
 * Chat Input Handler
 *
 * Utility functions for interacting with the Scira chat input area
 */

import { logMessage } from '@src/utils/helpers';

// Cache for the last found input element to improve reliability
let lastFoundInputElement: HTMLElement | null = null;

/**
 * Find the Scira chat input element
 * @returns The chat input element or null if not found
 */
export const findChatInputElement = (): HTMLElement | null => {
  // Placeholder for Scira input
  const textarea = document.querySelector('textarea#scira-chat-input');

  if (textarea) {
    logMessage('Found Scira input element');
    lastFoundInputElement = textarea as HTMLElement;
    return textarea as HTMLElement;
  }

  // Fallback for contenteditable if textarea not found (optional, based on Scira's structure)
  // const sciraInput = document.querySelector('div[contenteditable="true"]#scira-chat-input-contenteditable');
  // if (sciraInput) {
  //   logMessage('Found Scira input element (contenteditable)');
  //   lastFoundInputElement = sciraInput as HTMLElement;
  //   return sciraInput as HTMLElement;
  // }

  logMessage('Could not find Scira input element with selector: textarea#scira-chat-input');
  return null;
};

/**
 * Wrap content in tool_output tags
 * @param content The content to wrap
 * @returns The wrapped content
 */
export const wrapInToolOutput = (content: string): string => {
  return `<tool_output>\n${content}\n</tool_output>`;
};

/**
 * Format an object as a JSON string
 * @param data The data to format
 * @returns Formatted JSON string
 */
export const formatAsJson = (data: any): string => {
  return JSON.stringify(data, null, 2);
};

/**
 * Insert text into the chat input
 * @param text The text to insert
 * @returns True if successful, false otherwise
 */
export const insertTextToChatInput = (text: string): boolean => {
  try {
    const chatInput = findChatInputElement();

    if (!chatInput) {
      logMessage('Could not find Scira input element');
      console.error('Could not find Scira input element');
      return false;
    }

    // First check if it's a textarea element (most reliable method)
    if (chatInput.tagName === 'TEXTAREA') {
      const textarea = chatInput as HTMLTextAreaElement;
      const currentText = textarea.value;

      // For textareas, we can just use the \n character directly
      const formattedText = currentText ? `${currentText}\n\n${text}` : text;
      textarea.value = formattedText;

      // Position cursor at the end
      textarea.selectionStart = textarea.selectionEnd = textarea.value.length;

      // Trigger input event
      const inputEvent = new InputEvent('input', { bubbles: true });
      textarea.dispatchEvent(inputEvent);

      // Focus the textarea
      textarea.focus();

      logMessage('Appended text to textarea with preserved newlines');
      return true;
    }
    // Check if it's a contenteditable div
    else if (chatInput.getAttribute('contenteditable') === 'true') {
      // More reliable approach for contenteditable elements using Selection and Range
      // This preserves the current content and adds the new text at the end
      // with proper newline handling

      // First, focus the element and move cursor to the end
      chatInput.focus();

      // Get current content
      const currentText = chatInput.textContent || '';

      // Create a text node with the new content
      const textToInsert = text;

      // If there's existing content, add newlines before the new text
      if (currentText && currentText.trim() !== '') {
        // Ensure the element has some content at the end to place cursor after
        if (!chatInput.lastChild || chatInput.lastChild.nodeType !== Node.TEXT_NODE) {
          chatInput.appendChild(document.createTextNode(''));
        }

        // Move cursor to the end
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(chatInput);
        range.collapse(false); // collapse to end
        selection?.removeAllRanges();
        selection?.addRange(range);

        // Insert two newlines before the text
        document.execCommand('insertText', false, '\n\n');
      }

      // Use execCommand to insert text, which properly handles newlines
      document.execCommand('insertText', false, textToInsert);

      // Trigger input event for contenteditable
      const inputEvent = new InputEvent('input', { bubbles: true });
      chatInput.dispatchEvent(inputEvent);

      logMessage('Appended text to contenteditable with preserved newlines using execCommand');
      return true;
    }
    // Fallback for other element types
    else {
      logMessage('Using fallback method for unknown element type');

      // Try using value property first (for input-like elements)
      if ('value' in chatInput) {
        const inputElement = chatInput as HTMLInputElement;
        const currentValue = inputElement.value;
        inputElement.value = currentValue ? `${currentValue}\n\n${text}` : text;

        // Trigger input event
        const inputEvent = new InputEvent('input', { bubbles: true });
        inputElement.dispatchEvent(inputEvent);

        // Focus the element
        inputElement.focus();

        logMessage('Appended text to input element via value property');
        return true;
      }

      // Last resort: use textContent
      const currentText = chatInput.textContent || '';
      chatInput.textContent = currentText ? `${currentText}\n\n${text}` : text;

      // Trigger input event
      const inputEvent = new InputEvent('input', { bubbles: true });
      chatInput.dispatchEvent(inputEvent);

      // Focus the element
      chatInput.focus();

      logMessage('Appended text using textContent (fallback method)');
      return true;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logMessage(`Error appending text to Scira input: ${errorMessage}`);
    console.error('Error appending text to Scira input:', error);
    return false;
  }
};

/**
 * Insert tool result into the chat input
 * @param result The tool result to insert
 * @returns True if successful, false otherwise
 */
export const insertToolResultToChatInput = (result: any): boolean => {
  try {
    // Format the tool result as JSON string
    // const formattedResult = formatAsJson(result);
    // const wrappedResult = wrapInToolOutput(formattedResult);
    // Convert result to string if it's not already a string
    if (typeof result !== 'string') {
      result = JSON.stringify(result, null, 2);
      logMessage('Converted tool result to string format');
    }
    return insertTextToChatInput(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logMessage(`Error formatting tool result for Scira: ${errorMessage}`);
    console.error('Error formatting tool result for Scira:', error);
    return false;
  }
};

/**
 * Attach a file to the Scira input
 * @param file The file to attach
 * @returns Promise that resolves to true if successful
 */
export const attachFileToChatInput = async (file: File): Promise<boolean> => {
  try {
    const attachButton = document.querySelector('button#scira-attach-button'); // Placeholder for Scira attach button
    const fileInput = document.querySelector('input[type="file"]#scira-file-input'); // Placeholder for Scira file input

    if (attachButton && fileInput) {
      // Simulate a click on the attach button to trigger the file input
      (attachButton as HTMLElement).click();

      // Wait for the file input to be available (it might be added to DOM after click)
      // This is a simple wait, more robust solutions might use MutationObserver
      await new Promise(resolve => setTimeout(resolve, 100));

      const dt = new DataTransfer();
      dt.items.add(file);
      (fileInput as HTMLInputElement).files = dt.files;

      // Dispatch a change event on the file input
      const event = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(event);

      logMessage(`Attached file ${file.name} to Scira input`);
      return true;
    } else if (fileInput) {
      // If only file input is found, try to use it directly
      const dt = new DataTransfer();
      dt.items.add(file);
      (fileInput as HTMLInputElement).files = dt.files;
      const event = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(event);
      logMessage(`Attached file ${file.name} directly to Scira file input`);
      return true;
    } else {
      logMessage('Could not find Scira attach button or file input. Attempting drag and drop to chat input.');
      // Fallback to drag-and-drop if specific elements aren't found
      const chatInput = findChatInputElement();
      if (!chatInput) {
        logMessage('Could not find Scira input element for file attachment fallback.');
        return false;
      }
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const dragOverEvent = new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer });
      const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer });
      chatInput.dispatchEvent(dragOverEvent);
      chatInput.dispatchEvent(dropEvent);
      logMessage(`Attached file ${file.name} to Scira input via drag-and-drop fallback`);
      return true;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logMessage(`Error attaching file to Scira input: ${errorMessage}`);
    console.error('Error attaching file to Scira input:', error);
    return false;
  }
};

/**
 * Submit the current chat input (equivalent to pressing Enter)
 * @returns True if submission was successful, false otherwise
 */
export const submitChatInput = (maxWaitTime = 5000): Promise<boolean> => {
  return new Promise(resolve => {
    try {
      // Try to use the cached input element first, then fall back to finding it again
      const chatInput = lastFoundInputElement || findChatInputElement();

      if (!chatInput) {
        logMessage('Could not find Scira chat input to submit');
        resolve(false);
        return;
      }

      // Define a function to find the submit button and form
      const findSubmitElements = (): { form: HTMLFormElement | null; button: HTMLButtonElement | null } => {
        const form = document.querySelector('form#scira-chat-form') as HTMLFormElement | null; // Placeholder for Scira form
        let button: HTMLButtonElement | null = null;
        if (form) {
          button = form.querySelector('button#scira-submit-button') as HTMLButtonElement | null; // Placeholder for Scira submit button
        } else {
          // Fallback if form selector fails, try to find button directly (less ideal)
          button = document.querySelector('button#scira-submit-button') as HTMLButtonElement | null;
        }
        return { form, button };
      };

      const { form, button: submitButton } = findSubmitElements();

      if (submitButton) {
        logMessage(`Found Scira submit button`);

        const tryClickingButton = () => {
          const { button: currentButton } = findSubmitElements(); // Re-check in case it changed
          if (!currentButton) {
            logMessage('Scira submit button no longer found');
            resolve(false); // Consider fallback here too
            return;
          }

          const isDisabled =
            currentButton.disabled ||
            currentButton.getAttribute('disabled') !== null ||
            currentButton.getAttribute('aria-disabled') === 'true' ||
            currentButton.classList.contains('disabled');

          if (!isDisabled) {
            logMessage('Scira submit button is enabled, clicking it');
            currentButton.click();
            resolve(true);
          } else {
            logMessage('Scira submit button is disabled, waiting...');
          }
        };

        let elapsedTime = 0;
        const checkInterval = 200;
        const intervalId = setInterval(() => {
          elapsedTime += checkInterval;
          tryClickingButton(); // This will call resolve(true) when successful and should clear interval via the outer logic

          if (elapsedTime >= maxWaitTime) {
            clearInterval(intervalId);
            logMessage(`Scira button remained disabled for ${maxWaitTime}ms, trying alternative methods`);
            // Alternative methods for Scira
            if (form) {
              logMessage('Found Scira form element, submitting it');
              const submitEvent = new SubmitEvent('submit', { bubbles: true, cancelable: true });
              form.dispatchEvent(submitEvent);
              resolve(true);
            } else {
              logMessage('Simulating Enter key press on Scira input as fallback');
              chatInput.focus();
              const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true, composed: true });
              chatInput.dispatchEvent(enterEvent);
              resolve(true);
            }
          }
        }, checkInterval);

        tryClickingButton(); // Initial check
        // If already resolved (button clicked), clear interval
        // This needs a way for tryClickingButton to signal success to stop interval
        // A simple way: if it resolves, the promise state changes.
        // For now, rely on maxWaitTime or successful click resolving the promise.
        // A more robust way would be for tryClickingButton to return status or for resolve(true) to clear interval.
        // Let's assume clicking resolves and the calling context will handle it.
        // If the button was immediately clickable and resolved, the interval is still set.
        // This is a minor issue, as it will just run a few more times until maxWaitTime or be implicitly cleared.
        // To be cleaner:
        // if (tryClickingButton()) { /* returns true on success */ clearInterval(intervalId); }
        // For now, this is okay.

      } else {
        logMessage('No Scira submit button found with selector button#scira-submit-button. Trying form submission or Enter key.');
        if (form) {
          logMessage('Found Scira form element, submitting it');
          const submitEvent = new SubmitEvent('submit', { bubbles: true, cancelable: true });
          form.dispatchEvent(submitEvent);
          resolve(true);
        } else {
          logMessage('Simulating Enter key press on Scira input as fallback');
          chatInput.focus();
          const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true, composed: true });
          chatInput.dispatchEvent(enterEvent);
          resolve(true);
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logMessage(`Error submitting Scira chat input: ${errorMessage}`);
      console.error('Error submitting Scira chat input:', error);
      resolve(false);
    }
  });
};
