document.addEventListener('DOMContentLoaded', function () {
    // Elements
    const colorOptions = document.querySelectorAll('.color-option');
    const customColor = document.getElementById('customColor');
    const highlightEnabled = document.getElementById('highlightEnabled');
    const opacitySlider = document.getElementById('opacitySlider');
    const opacityValue = document.getElementById('opacityValue');
    const clearHighlightsBtn = document.getElementById('clearHighlights');
    const copyHighlightsBtn = document.getElementById('copyHighlights');
    const applyToSelectionBtn = document.getElementById('applyToSelection');

    let currentColor = '#ffeb3b';

    // Load saved settings
    chrome.storage.local.get(['highlightColor', 'highlightEnabled', 'opacity'], (result) => {
        if (result.highlightColor) {
            currentColor = result.highlightColor;
            customColor.value = currentColor;
            updateActiveColor(currentColor);
        }
        if (result.highlightEnabled !== undefined) {
            highlightEnabled.checked = result.highlightEnabled;
        }
        if (result.opacity) {
            opacitySlider.value = result.opacity;
            opacityValue.textContent = `${result.opacity}%`;
        }
    });

    // Color picker options
    colorOptions.forEach(option => {
        option.addEventListener('click', function () {
            currentColor = this.dataset.color;
            customColor.value = currentColor;
            updateActiveColor(currentColor);
            saveSettings();
        });
    });

    // Custom color picker
    customColor.addEventListener('input', function () {
        currentColor = this.value;
        updateActiveColor(currentColor);
        saveSettings();
    });

    // Enable/disable highlighting
    highlightEnabled.addEventListener('change', saveSettings);

    // Opacity slider
    opacitySlider.addEventListener('input', function () {
        opacityValue.textContent = `${this.value}%`;
        saveSettings();
    });

    // Clear all highlights
    clearHighlightsBtn.addEventListener('click', function () {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "clearHighlights"
            });
        });
    });

    // Copy all highlights
    copyHighlightsBtn.addEventListener('click', function () {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "copyAllHighlights"
            });
        });
    });

    // Apply to current selection
    applyToSelectionBtn.addEventListener('click', function () {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "highlightSelection",
                color: currentColor,
                opacity: opacitySlider.value
            });
        });
    });

    // Helper functions
    function updateActiveColor(color) {
        colorOptions.forEach(option => {
            option.classList.toggle('active', option.dataset.color === color);
        });
    }

    function saveSettings() {
        chrome.storage.local.set({
            highlightColor: currentColor,
            highlightEnabled: highlightEnabled.checked,
            opacity: opacitySlider.value
        });

        // Send settings to content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "updateSettings",
                color: currentColor,
                enabled: highlightEnabled.checked,
                opacity: opacitySlider.value
            });
        });
    }

    // Initialize
    updateActiveColor(currentColor);
});
