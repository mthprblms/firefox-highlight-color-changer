// Store highlight settings
let highlightSettings = {
  color: '#ffeb3b',
  enabled: true,
  opacity: 50
};

// Load saved settings
chrome.storage.local.get(['highlightColor', 'highlightEnabled', 'opacity'], (result) => {
  if (result.highlightColor) highlightSettings.color = result.highlightColor;
  if (result.highlightEnabled !== undefined) highlightSettings.enabled = result.highlightEnabled;
  if (result.opacity) highlightSettings.opacity = result.opacity;

  if (highlightSettings.enabled) {
    enableHighlighting();
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "highlightSelection":
      highlightSelectedText(message.color, message.opacity);
      break;

    case "clearHighlights":
      clearAllHighlights();
      break;

    case "updateSettings":
      highlightSettings.color = message.color || highlightSettings.color;
      highlightSettings.enabled = message.enabled !== undefined ? message.enabled : highlightSettings.enabled;
      highlightSettings.opacity = message.opacity || highlightSettings.opacity;

      if (highlightSettings.enabled) {
        enableHighlighting();
      } else {
        disableHighlighting();
      }
      break;

    case "copyAllHighlights":
      copyAllHighlights();
      break;

    case "getHighlights":
      sendResponse({ text: getAllHighlightsText() });
      break;
  }
  return true;
});

// Enable text selection highlighting
function enableHighlighting() {
  disableHighlighting();
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('keyup', handleTextSelection);
  document.addEventListener('keydown', handleCopyShortcut);
  console.log('Highlighting enabled');
}

// Disable text selection highlighting
function disableHighlighting() {
  document.removeEventListener('mouseup', handleTextSelection);
  document.removeEventListener('keyup', handleTextSelection);
  document.removeEventListener('keydown', handleCopyShortcut);
  console.log('Highlighting disabled');
}

// Handle text selection
function handleTextSelection() {

  const selection = window.getSelection();
  if (!selection || selection.toString().trim().length === 0) return;
  // Skip editable elements
  if (isEditableElement(selection.anchorNode)) return;


  // Apply highlight using current settings
  highlightSelectedText(highlightSettings.color, highlightSettings.opacity);
}

// Check if element is editable
function isEditableElement(node) {
  const element = node.nodeType === 3 ? node.parentElement : node;
  return element.isContentEditable ||
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA';
}

// Apply highlight to selected text
function highlightSelectedText(color, opacity) {

  const selection = window.getSelection();
  if (selection.rangeCount === 0 || selection.toString().trim().length === 0) return;

  const range = selection.getRangeAt(0);



  // Apply highlight styles to a node (span or link)


  const rgbaColor = hexToRgba(color, opacity / 100);

  // For simple text selections (within a single text node), use surroundContents
  if (range.commonAncestorContainer.nodeType === Node.TEXT_NODE) {
    const highlightSpan = document.createElement('span');
    highlightSpan.style.backgroundColor = rgbaColor;
    highlightSpan.style.display = 'inline';
    highlightSpan.style.padding = '0 0';
    highlightSpan.style.borderRadius = '2px';
    highlightSpan.className = 'custom-highlight';
    highlightSpan.dataset.highlighted = 'true';

    try {
      range.surroundContents(highlightSpan);
      selection.removeAllRanges();
    } catch (e) {
      // Fallback if something unexpected happens
      highlightComplexSelection(range, rgbaColor);
      selection.removeAllRanges();
    }
  } else {
    // For mixed content (text + links, or across elements), use the robust recursive method
    highlightComplexSelection(range, rgbaColor);
    selection.removeAllRanges();
  }
}

// Handle complex selections that cross element boundaries
function highlightComplexSelection(range, rgbaColor) {
  // Extract the selected fragment
  const fragment = range.extractContents();

  // Helper: wrap a text node in a styled span
  function wrapTextNode(textNode) {
    const span = document.createElement('span');
    span.style.backgroundColor = rgbaColor;
    span.style.display = 'inline';
    span.style.padding = '0 0';
    span.style.borderRadius = '2px';
    span.className = 'custom-highlight';
    span.dataset.highlighted = 'true';
    span.textContent = textNode.textContent;
    return span;
  }

  // Recursively walk the fragment and replace text nodes
  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const wrapped = wrapTextNode(node);
      node.parentNode.replaceChild(wrapped, node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // If the element is a link, style it directly without breaking the link
      if (node.tagName === 'A') {
        node.style.backgroundColor = rgbaColor;
        node.style.display = 'inline';
        node.style.padding = '0 0';
        node.style.borderRadius = '2px';
        node.classList.add('custom-highlight');
        node.dataset.highlighted = 'true';
        // Don't recurse into the link to avoid double-wrapping text
        return;
      }
      // Recurse into children
      const children = Array.from(node.childNodes);
      children.forEach(processNode);
    }
  }

  const topNodes = Array.from(fragment.childNodes);
  topNodes.forEach(processNode);

  // Insert the processed fragment back into the document at the original range position
  range.insertNode(fragment);
}

// Clear all highlights
function clearAllHighlights() {
  const highlights = document.querySelectorAll('.custom-highlight');
  highlights.forEach(highlight => {
    const parent = highlight.parentNode;

    // Replace the highlight span with its contents
    while (highlight.firstChild) {
      parent.insertBefore(highlight.firstChild, highlight);
    }

    // Remove the empty highlight span
    parent.removeChild(highlight);
  });
}

// Copy all highlighted text to clipboard
function copyAllHighlights() {
  const highlights = document.querySelectorAll('.custom-highlight');
  if (highlights.length === 0) {
    alert('No highlights to copy');
    return;
  }

  const textToCopy = Array.from(highlights)
    .map(el => el.textContent.trim())
    .filter(text => text.length > 0)
    .join('\n\n');

  if (textToCopy.length === 0) return;

  navigator.clipboard.writeText(textToCopy).then(() => {
    console.log('Highlights copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy highlights:', err);
  });
}

// Get all highlighted text as string
function getAllHighlightsText() {
  const highlights = document.querySelectorAll('.custom-highlight');
  if (highlights.length === 0) return "";

  return Array.from(highlights)
    .map(el => el.textContent.trim())
    .filter(text => text.length > 0)
    .join('\n\n');
}

// Handle Ctrl+C shortcut
function handleCopyShortcut(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
    const selection = window.getSelection();
    if (!selection || selection.toString().length === 0) {
      copyAllHighlights();
      e.preventDefault();
    }
  }
}

// Convert hex color to rgba
function hexToRgba(hex, opacity) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}