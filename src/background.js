chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js", "messenger.js"] // Inject the content script
    });
  });


  chrome.runtime.onInstalled.addListener((async function(e) {

    // Check if there is an open WhatsApp Web tab
    chrome.tabs.query({ url: "*://web.whatsapp.com/*" }, function (tabs) {
        if (tabs.length > 0) {
            // If WhatsApp Web is already open, activate that tab and reload it
            chrome.tabs.update(tabs[0].id, { active: true }, function () {
                chrome.tabs.reload(tabs[0].id);
            });
        } else {
            // Else open a new WhatsApp Web tab
            chrome.tabs.create({ url: "https://web.whatsapp.com/" });
        }
    });
}));


// chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
//     if (message.action === "checkWhatsAppTab") {
//       chrome.tabs.query({ url: "*://web.whatsapp.com/*" }, function (tabs) {
//         if (tabs.length > 0) {
//           // WhatsApp Web is already open
//           console.log("WhatsApp Web is already open:", tabs);
//           chrome.tabs.update(tabs[0].id, { active: true }, function () {
//             // chrome.tabs.reload(tabs[0].id); // Reload the tab
//           });
//           sendResponse({ tabExists: true });
//         } else {
//           // WhatsApp Web is not open, so create a new tab
//           console.log("WhatsApp Web is not open. Opening a new tab...");
//           chrome.tabs.create({ url: "https://web.whatsapp.com/" }, function (newTab) {
//             // Store the new tab's ID to avoid opening another one on page reload
//             chrome.storage.local.set({ whatsappTabId: newTab.id });
//           });
//           sendResponse({ tabExists: false });
//         }
//       });
  
//       return true; // Keep the message channel open for asynchronous response
//     }
//   });
  

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SEND_MESSAGE') {
        // Send message to content script
        chrome.tabs.query({ url: "*://web.whatsapp.com/*" }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: "DISPATCH_SEND_MESSAGE",
                    payload: {
                        numbers: message.phoneNumber,
                        message: message.messageContent,
                        excelArray: message.excelArray,
                        msgTimeGap: message.msgTimeGap,
                        batch: message.batch,
                        batchTimeGap: message.batchTimeGap,
                    },
                   
                });
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: "No active tab found" });
            }
        });
        return true; // Keep the message channel open for async response
    } else {
        sendResponse({ success: false, error: "Invalid message type" });
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SEND_ATTACHMENTS') {
        // Send message to content script
        chrome.tabs.query({ url: "*://web.whatsapp.com/*" }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: "DISPATCH_ATTACHMENTS",
                    payload: {
                        numbers: message.phoneNumber,
                        message: message.messageContent,
                        msgTimeGap: message.msgTimeGap,
                        batch: message.batch,
                        batchTimeGap: message.batchTimeGap,
                    },
                });
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: "No active tab found" });
            }
        });
        return true; // Keep the message channel open for async response
    } else {
        sendResponse({ success: false, error: "Invalid message type" });
    }
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'DOWNLOAD_GROUP_CONTACT') {
        // Send message to content script
        chrome.tabs.query({ url: "*://web.whatsapp.com/*" }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: "DISPATCH_DOWNLOAD_GROUP_CONTACT",
                    payload: {
                        groupArray: message.groupArray
                    },
                });
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: "No active tab found" });
            }
        });
        return true; // Keep the message channel open for async response
    } else {
        sendResponse({ success: false, error: "Invalid message type" });
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SEND_MESSAGE_TO_GROUP') {
        // Send message to content script
        chrome.tabs.query({ url: "*://web.whatsapp.com/*" }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: "DISPATCH_SEND_MESSAGE_TO_GROUP",
                    payload: {
                        groupArray: message.groupArray,
                        message: message.messageContent,
                    },
                });
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: "No active tab found" });
            }
        });
        return true; // Keep the message channel open for async response
    } else {
        sendResponse({ success: false, error: "Invalid message type" });
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SEND_ATTACHMENT_TO_GROUP') {
        // Send message to content script
        chrome.tabs.query({ url: "*://web.whatsapp.com/*" }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: "DISPATCH_ATTACHMENT_TO_GROUP",
                    payload: {
                        groupArray: message.groupArray,
                        caption: ""
                    },
                });
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: "No active tab found" });
            }
        });
        return true; // Keep the message channel open for async response
    } else {
        sendResponse({ success: false, error: "Invalid message type" });
    }
});