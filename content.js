// Store highlight settings
let highlightSettings = {
  color: '#ffeb3b',
  enabled: true,
  opacity: 50
};

// Load saved settings
browser.storage.local.get(['highlightColor', 'highlightEnabled', 'opacity']).then(result => {
  if (result.highlightColor) highlightSettings.color = result.highlightColor;
  if (result.highlightEnabled !== undefined) highlightSettings.enabled = result.highlightEnabled;
  if (result.opacity) highlightSettings.opacity = result.opacity;

  if (highlightSettings.enabled) {
    enableHighlighting();
  }
});

// Listen for messages from popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
});

// Enable text selection highlighting
function enableHighlighting() {
  // Remove existing listeners if any
  disableHighlighting();

  // Add mouseup listener for text selection
  document.addEventListener('mouseup', handleTextSelection);

  // Also handle keyboard selections
  document.addEventListener('keyup', handleTextSelection);

  // Handle Ctrl+C to copy all highlights if no selection
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
  if (selection.toString().trim().length === 0) return;

  // Check if selection is within an editable element
  if (isEditableElement(selection.anchorNode)) return;

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

  // Create highlight span
  const highlightSpan = document.createElement('span');
  const rgbaColor = hexToRgba(color, opacity / 100);
  highlightSpan.style.backgroundColor = rgbaColor;
  highlightSpan.style.padding = '1px 0';
  highlightSpan.style.borderRadius = '2px';
  highlightSpan.className = 'custom-highlight';
  highlightSpan.dataset.highlighted = 'true';

  try {
    // Surround the selected text with our highlight span
    range.surroundContents(highlightSpan);

    // Clear the selection
    selection.removeAllRanges();
  } catch (e) {
    // If surrounding fails (e.g., selection crosses element boundaries),
    // try a different approach
    if (e.name === 'InvalidStateError' || e.name === 'HierarchyRequestError') {
      highlightComplexSelection(range, rgbaColor);
      selection.removeAllRanges();
    }
  }
}

// Handle complex selections that cross element boundaries
function highlightComplexSelection(range, rgbaColor) {
  const documentFragment = range.extractContents();
  const wrapper = document.createElement('span');
  wrapper.style.backgroundColor = rgbaColor;
  wrapper.style.padding = '1px 0';
  wrapper.style.borderRadius = '2px';
  wrapper.className = 'custom-highlight';
  wrapper.dataset.highlighted = 'true';

  wrapper.appendChild(documentFragment);
  range.insertNode(wrapper);
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
    // Optional: Show a brief toast or notification
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
  // Check for Ctrl+C (or Cmd+C on Mac)
  if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
    const selection = window.getSelection();
    // Only copy all highlights if there is NO active text selection
    if (!selection || selection.toString().length === 0) {
      copyAllHighlights();
      // Prevent default copy action (though it wouldn't do much with no selection)
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