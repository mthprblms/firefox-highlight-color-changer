// Create context menu items
browser.contextMenus.create({
    id: "highlight-root",
    title: "Highlight Color Changer",
    contexts: ["all"]
});

browser.contextMenus.create({
    id: "copy-highlights",
    parentId: "highlight-root",
    title: "Copy All Highlights",
    contexts: ["all"]
});

browser.contextMenus.create({
    id: "save-highlights",
    parentId: "highlight-root",
    title: "Save Highlights as Text",
    contexts: ["all"]
});

browser.contextMenus.create({
    id: "email-highlights",
    parentId: "highlight-root",
    title: "Email Highlights",
    contexts: ["all"]
});

browser.contextMenus.create({
    id: "separator-1",
    parentId: "highlight-root",
    type: "separator",
    contexts: ["all"]
});

browser.contextMenus.create({
    id: "clear-highlights",
    parentId: "highlight-root",
    title: "Clear All Highlights",
    contexts: ["all"]
});

// Handle context menu clicks
browser.contextMenus.onClicked.addListener((info, tab) => {
    switch (info.menuItemId) {
        case "copy-highlights":
            browser.tabs.sendMessage(tab.id, { action: "copyAllHighlights" });
            break;

        case "save-highlights":
            browser.tabs.sendMessage(tab.id, { action: "getHighlights" }).then(response => {
                if (response && response.text) {
                    const blob = new Blob([response.text], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const date = new Date().toISOString().split('T')[0];
                    const hostname = new URL(tab.url).hostname;

                    browser.downloads.download({
                        url: url,
                        filename: `highlight-${date}-${hostname}.txt`,
                        saveAs: true
                    });
                }
            });
            break;

        case "email-highlights":
            browser.tabs.sendMessage(tab.id, { action: "getHighlights" }).then(response => {
                if (response && response.text) {
                    const subject = encodeURIComponent("Highlights from " + tab.title);
                    const body = encodeURIComponent(response.text + "\n\nSource: " + tab.url);
                    browser.tabs.create({
                        url: `mailto:?subject=${subject}&body=${body}`
                    });
                }
            });
            break;

        case "clear-highlights":
            browser.tabs.sendMessage(tab.id, { action: "clearHighlights" });
            break;
    }
});
