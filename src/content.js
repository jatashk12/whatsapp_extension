
if (!window.injectScriptLoaded) {
  window.injectScriptLoaded = true;

  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("inject.js");
  script.onload = function () {
    this.remove(); // Clean up after execution
  };
  (document.head || document.documentElement).appendChild(script);
}

chrome.storage.local.get('whatsappTabId', function (result) {
  if (result.whatsappTabId) {
    // A WhatsApp Web tab was already opened by the background script
    console.log("WhatsApp Web tab was previously opened.");
  } else {
    // No WhatsApp Web tab was opened before, so send a message to background
    chrome.runtime.sendMessage({ action: "checkWhatsAppTab" }, function (response) {
      if (response && response.tabExists) {
        console.log("WhatsApp Web tab is already open.");
      } else {
        console.log("WhatsApp Web tab was not open. Opening a new tab...");
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "DISPATCH_SEND_MESSAGE") {
    const data = message.payload;

    // Start processing messages and notify completion
    (async () => {
      try {
        await processMessages(data);
      } finally {
        try { chrome.runtime.sendMessage({ type: 'SEND_ALL_COMPLETE' }); } catch (e) {}
      }
    })();
  }
});

async function processMessages(data) {
  const { numbers, message, excelArray, msgTimeGap, batch, batchTimeGap } = data;

  if (batch && batchTimeGap) {
    if (Array.isArray(excelArray)) {
      for (let i = 0; i < excelArray.length; i += batch) {
        const batchNumbers = excelArray.slice(i, i + batch);
        for (const excelObj of batchNumbers) {
          await sendMessageToNumber(excelObj.number[0], excelObj.message);
          await delay(msgTimeGap); // Wait for timegap between individual messages
        }

        if (i + batch < excelArray.length) {
          await delay(batchTimeGap); // Wait for batchTimeGap before starting the next batch
        }
      }
    } else {
      for (let i = 0; i < numbers.length; i += batch) {
        const batchNumbers = numbers.slice(i, i + batch);
        for (const number of batchNumbers) {
          await sendMessageToNumber(number, message);
          await delay(msgTimeGap); // Wait for timegap between individual messages
        }

        if (i + batch < numbers.length) {
          await delay(batchTimeGap); // Wait for batchTimeGap before starting the next batch
        }
      }
    }

  } else {
    if (Array.isArray(excelArray)) {
      for (const excelData of excelArray) {
        await sendMessageToNumber(excelData.number[0], excelData.message);
        await delay(msgTimeGap)
      }
    } else {
      for (const number of numbers) {
        await sendMessageToNumber(number, message);
        await delay(msgTimeGap);
      }

    }
  }

}

async function sendMessageToNumber(number, message) {
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent("#send-message-number", {
        detail: {
          number: number,
          message: message,
        },
      })
    );
    resolve();
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// attachment new code

chrome.runtime.onMessage.addListener(async(message, sender, sendResponse) => {
  if (message.type === "DISPATCH_ATTACHMENTS") {
    const data = message.payload;

    // Start processing messages
   await processAttachmentMessages(data);
   try { chrome.runtime.sendMessage({ type: 'SEND_ALL_COMPLETE' }); } catch (e) {}
  }
});

async function processAttachmentMessages(data) {
  const { numbers, message, msgTimeGap, batch, batchTimeGap } = data;
  let attachments;
  try {
    attachments = await getAttachmentsData(); // Await the asynchronous call
    console.log("attachments", attachments)
  
  } catch (error) {
    console.error('Error retrieving attachments:', error);
  }
  
  if (batch && batchTimeGap) {
      for (let i = 0; i < numbers.length; i += batch) {
        const batchNumbers = numbers.slice(i, i + batch);
        for (const number of batchNumbers) {
          await sendAttachmentToNumberNew(number, attachments, null);
          await delay(msgTimeGap); // Wait for timegap between individual messages
        }

        if (i + batch < numbers.length) {
          await delay(batchTimeGap); // Wait for batchTimeGap before starting the next batch
        }
    }

  } else {
      for (const number of numbers) {
        await sendAttachmentToNumberNew(number, attachments, null);
        await delay(msgTimeGap);
      }
  }

}

async function sendAttachmentToNumberNew(number, attachments, caption) {
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent("PRIMES::send-attachments", {
        detail: {
          number: number,
          attachments: attachments,
          caption: caption,
        },
      })
    );
    resolve();
  });
}
// attachment new code ends


// chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
//   if (message.type === "DISPATCH_ATTACHMENTS") {
//     const data = message.payload;

//     try {
//       const attachments = await getAttachmentsData(); // Await the asynchronous call
//       console.log("attachments", attachments)
//       if (attachments && attachments.length > 0) {
//         for (let i = 0; i < data.number.length; i++) {
//           sendAttachmentsToNumber(data.number[i], attachments, null);
//         }
//       }
//     } catch (error) {
//       console.error('Error retrieving attachments:', error);
//     }
//     // Optionally send a response back to the sender
//     sendResponse({ success: true });
//   }
//   // Return true to indicate that sendResponse will be called asynchronously
//   return true;
// });

async function getAttachmentsData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['attachmentsData'], (res) => {
      resolve(res.attachmentsData || []);
    });
  });
}

async function sendAttachmentsToNumber(number, attachments, caption) {
  window.dispatchEvent(new CustomEvent("PRIMES::send-attachments", {
    detail: {
      number: number,
      attachments: attachments,
      caption: caption,
    }
  }));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "DISPATCH_SEND_MESSAGE_TO_GROUP") {
    const data = message.payload;
    for (let i = 0; i < data.groupArray.length; i++) {
      sendMessageToGroups(data.groupArray[i], data.message)
    }
    try { chrome.runtime.sendMessage({ type: 'SEND_ALL_COMPLETE' }); } catch (e) {}
  }
});

async function sendMessageToGroups(group, message, caption) {
  window.dispatchEvent(new CustomEvent("PRIMES::send-message-to-group", {
    detail: {
      group_id: group.id._serialized,
      message: message
    }
  }));
}


chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === "DISPATCH_ATTACHMENT_TO_GROUP") {
    const data = message.payload;

    try {
      const attachments = await getAttachmentsData(); // Await the asynchronous call
      console.log("attachments", attachments)
      if (attachments && attachments.length > 0) {
        for (let i = 0; i < data.groupArray.length; i++) {
          sendAttachmentToGroups(data.groupArray[i], attachments, null);
        }
      }
    } catch (error) {
      console.error('Error retrieving attachments:', error);
    }
    // Optionally send a response back to the sender
    sendResponse({ success: true });
    try { chrome.runtime.sendMessage({ type: 'SEND_ALL_COMPLETE' }); } catch (e) {}
  }
  // Return true to indicate that sendResponse will be called asynchronously
  return true;
});

async function sendAttachmentToGroups(group, attachments, caption) {
  window.dispatchEvent(new CustomEvent("PRIMES::send-attachments-to-group", {
    detail: {
      attachments: attachments,
      caption: '',
      groupId: group.id._serialized,
    }
  }));
}

// grop contact download
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "DISPATCH_DOWNLOAD_GROUP_CONTACT") {
    const data = message.payload;
    for (let i = 0; i < data.groupArray.length; i++) {
      downloadGroupContact(data.groupArray[i].id);
    }
  }
});

async function downloadGroupContact(group_id) {
  window.dispatchEvent(new CustomEvent("PRIMES::export-group", {
    detail: {
      "groupId": group_id._serialized
    }
  }));
}



// InjectJS Message Listener 
window.addEventListener("message", injectMessageListner, false);

function injectMessageListner(event) {
  if (event.source != window || !event.data.type)
    return;

  let message_type = event.data.type;
  let message_payload = event.data.payload;

  // Handle message type
  switch (message_type) {

    case "get_all_groups":
      setGroupDataToLocalStorage(message_payload);
      break;

    case "get_all_contacts":
      setContactDataToLocalStorage(message_payload);
      break;

    default:
      break;
  }
}

function setGroupDataToLocalStorage(data) {
  let finalGroupData = data.map((group) => {
    return {
      ...group,
      objId: 'g' + group.id._serialized.replace(/\D+/g, ""),
    }
  })
  chrome.storage.local.set({ "allGroupData": finalGroupData });
}

function setContactDataToLocalStorage(data) {
  let finalContactData = data.map((contact) => {
    return {
      ...contact,
      objId: 'c' + contact.id._serialized.replace(/\D+/g, ""),
    }
  })
  chrome.storage.local.set({ "allContactData": finalContactData });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "DISPATCH_SEND_MESSAGE_EXCEL") {
    const data = message.payload;
    for (let i = 0; i < data.number.length; i++) {
      sendMessageToNumbers(data.number[i], data.message)
    }
  }
});

async function sendMessageToNumbersExcel(number, message) {
  window.dispatchEvent(new CustomEvent("#send-message-number", {
    detail: {
      number: number,
      message: message,
    }
  }));
}
