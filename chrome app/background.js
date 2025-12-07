// Create context menu items
chrome.contextMenus.create({
    id: "highlight-root",
    title: "Highlight Color Changer",
    contexts: ["all"]
});

chrome.contextMenus.create({
    id: "copy-highlights",
    parentId: "highlight-root",
    title: "Copy All Highlights",
    contexts: ["all"]
});

chrome.contextMenus.create({
    id: "save-highlights",
    parentId: "highlight-root",
    title: "Save Highlights as Text",
    contexts: ["all"]
});

chrome.contextMenus.create({
    id: "email-highlights",
    parentId: "highlight-root",
    title: "Email Highlights",
    contexts: ["all"]
});

chrome.contextMenus.create({
    id: "separator-1",
    parentId: "highlight-root",
    type: "separator",
    contexts: ["all"]
});

chrome.contextMenus.create({
    id: "clear-highlights",
    parentId: "highlight-root",
    title: "Clear All Highlights",
    contexts: ["all"]
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    switch (info.menuItemId) {
        case "copy-highlights":
            chrome.tabs.sendMessage(tab.id, { action: "copyAllHighlights" });
            break;

        case "save-highlights":
            chrome.tabs.sendMessage(tab.id, { action: "getHighlights" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError);
                    return;
                }
                if (response && response.text) {
                    // In MV3 service workers, we can't use URL.createObjectURL directly on Blobs easily
                    // But chrome.downloads.download accepts a data URL
                    const dataUrl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(response.text);
                    const date = new Date().toISOString().split('T')[0];
                    const hostname = new URL(tab.url).hostname;

                    chrome.downloads.download({
                        url: dataUrl,
                        filename: `highlight-${date}-${hostname}.txt`,
                        saveAs: true
                    });
                }
            });
            break;

        case "email-highlights":
            chrome.tabs.sendMessage(tab.id, { action: "getHighlights" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError);
                    return;
                }
                if (response && response.text) {
                    const subject = encodeURIComponent("Highlights from " + tab.title);
                    const body = encodeURIComponent(response.text + "\n\nSource: " + tab.url);
                    chrome.tabs.create({
                        url: `mailto:?subject=${subject}&body=${body}`
                    });
                }
            });
            break;

        case "clear-highlights":
            chrome.tabs.sendMessage(tab.id, { action: "clearHighlights" });
            break;
    }
});
