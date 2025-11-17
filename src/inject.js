console.log("Injected into page context!");
// ======= CORE INJECT JS CODE STARTS =======
const isWhatsappLoaded = () => (document.querySelector('#pane-side') ? true : false);

const isWebpackLoaded = () => ('function' === typeof webpackJsonp || window.webpackChunkwhatsapp_web_client || window.require);

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

// Custom console funtions
console.logSuccess = (message) => console.log(`%c${message}`, 'color: lightGreen; font-weight: bold; font-size: 14px;');
console.logError = (message) => console.log(`%c${message}`, 'color: red; font-weight: bold;');
console.logWarn = (message) => console.log(`%c${message}`, 'color: orange; font-weight: bold;');

// Init Store Object Function
const initStore = function (useOldMethod = true) {
    if (useOldMethod) {
        return initStoreOld();
    } else {
        return initStoreNew();
    }
}

const initStoreOld = function () {
    const inject = function () {
        return (
            (inject.mID = Math.random().toString(36).substring(7)),
            (inject.mObj = {}),
            (window.webpackChunkbuild || window.webpackChunkwhatsapp_web_client).push([
                [inject.mID],
                {},
                function (i) {
                    Object.keys(i.m).forEach(function (n) {
                        inject.mObj[n] = i(n);
                    });
                },
            ]),
            {
                modules: inject.mObj,
                constructors: inject.cArr,
                findModule: function (i) {
                    let obj = [];
                    return (
                        Object.keys(inject.mObj).forEach(function (a) {
                            let element = inject.mObj[a];
                            if (void 0 !== element)
                                if ("string" == typeof i) {
                                    if ("object" == typeof element.default)
                                        for (let e in element.default) e == i && obj.push(element);
                                    for (let e in element) e == i && obj.push(element);
                                } else {
                                    if ("function" != typeof i)
                                        throw new TypeError(
                                            "findModule can only find via string and function, " +
                                            typeof i +
                                            " was passed"
                                        );
                                    i(element) && obj.push(element);
                                }
                        }),
                        obj
                    );
                },
                get: function (i) {
                    return inject.mObj[i];
                },
            }
        );
    };

    return new Promise((resolve, reject) => {
        try {
            if (window.require && window.importDefault) {
                // Create store by importing whatsapp collection
                const e = (e) => window.require(e);
                const i = (e) => window.importDefault(e);

                window.Store = {
                    Chat: e("WAWebChatCollection")?.ChatCollection,
                    Contact: e("WAWebContactCollection")?.ContactCollection,
                    Msg: e("WAWebMsgCollection")?.MsgCollection,
                    MsgKey: i("WAWebMsgKey"),
                    BusinessProfile: e("WAWebBusinessProfileCollection")?.BusinessProfileCollection,
                    GroupMetadata: i("WAWebGroupMetadataCollection"),
                    TextMsgChatAction: e("WAWebSendTextMsgChatAction"),
                    MediaCollection: i("WAWebAttachMediaCollection"),
                    UserConstructor: i("WAWebWid"),
                    EnumTypes: e("WAWebWamEnumMediaPickerOriginType"),
                    WidFactory: e("WAWebWidFactory")
                };

                if (window.Store) {
                    window.Store.InitType = "old_method_1";
                }
            } else {
                // Create store using inject function
                let mR = inject();
                window.Store = Object.assign({}, mR.findModule(e => e.default && e.default.Chat)[0]?.default || {});
                window.Store.MediaCollection = mR.findModule(e => e.default && e.default.prototype?.processAttachments)[0]?.default;
                window.Store.UserConstructor = mR.findModule(e => e.default && e.default.prototype?.isServer && e.default.prototype?.isUser)[0]?.default;
                window.Store.TextMsgChatAction = mR.findModule("sendTextMsgToChat")[0];
                window.Store.WidFactory = mR.findModule("createWid")[0];
                window.Store.Cmd = mR.findModule("Cmd")[0]?.Cmd;
                window.Store.ChatState = mR.findModule("sendChatStateComposing")[0];
                window.Store.ContactMethods = mR.findModule("getUserid")[0];
                window.Store.ChatHelper = mR.findModule("findChat")[0];
                window.Store.EnumTypes = mR.findModule("MEDIA_PICKER_ORIGIN_TYPE")[0];
                window.Store.MenuClasses = mR.findModule(e => e?.default?.menu && e?.default?.item ? e.default : null)[0]?.default;

                if (window.Store) {
                    window.Store.InitType = "old_method_2";
                }
            }

            // Extend Store functionality
            if (window.Store?.Chat?.modelClass?.prototype) {
                window.Store.Chat.modelClass.prototype.sendMessage = function (e) {
                    window.Store.TextMsgChatAction.sendTextMsgToChat(this, ...arguments);
                };
            }

            if (window.Store?.Chat && !window.Store.Chat._find) {
                window.Store.Chat._findAndParse = window.Store.BusinessProfile?._findAndParse;
                window.Store.Chat._find = window.Store.BusinessProfile?._find;
            }

            resolve();
        } catch (error) {
            reject("InjectJS :: initStoreOld :: Error :: " + error);
        }
    });
}

const initStoreNew = function () {
    let neededObjects = [
        { id: "MediaCollection", module: "WAWebAttachMediaCollection", conditions: (module) => (module.default && module.default.prototype && (module.default.prototype.processFiles !== undefined || module.default.prototype.processAttachments !== undefined)) ? module.default : null },
        { id: "Archive", module: "WAWebSetArchiveChatAction", conditions: (module) => (module.setArchive) ? module : null },
        { id: "Block", module: "WAWebBlockContactUtils", conditions: (module) => (module.blockContact && module.unblockContact) ? module : null },
        { id: "ChatUtil", module: "WAWebSendClearChatAction", conditions: (module) => (module.sendClear) ? module : null },
        { id: "GroupInvite", module: "WAWebGroupInviteJob", conditions: (module) => (module.queryGroupInviteCode) ? module : null },
        { id: "Wap", module: "WAWebCreateGroupAction", conditions: (module) => (module.createGroup) ? module : null },
        { id: "State", module: "WAWebSocketModel", conditions: (module) => (module.STATE && module.STREAM) ? module : null },
        { id: "_Presence", module: "WAWebContactPresenceBridge", conditions: (module) => (module.setPresenceAvailable && module.setPresenceUnavailable) ? module : null },
        { id: "WapDelete", module: "WAWebChatDeleteBridge", conditions: (module) => (module.sendConversationDelete && module.sendConversationDelete.length == 2) ? module : null },
        { id: "WapQuery", module: "WAWebQueryExistsJob", conditions: (module) => (module.queryExist) ? module : ((module.default && module.default.queryExist) ? module.default : null) },
        { id: "UserConstructor", module: "WAWebWid", conditions: (module) => (module.default && module.default.prototype && module.default.prototype.isServer && module.default.prototype.isUser) ? module.default : null },
        { id: "SendTextMsgToChat", module: "WAWebSendTextMsgChatAction", resolver: (module) => module.sendTextMsgToChat },
        { id: "ReadSeen", module: "WAWebUpdateUnreadChatAction", conditions: (module) => (module.sendSeen) ? module : null },
        { id: "sendDelete", module: "WAWebDeleteChatAction", conditions: (module) => (module.sendDelete) ? module.sendDelete : null },
        { id: "addAndSendMsgToChat", module: "WAWebSendMsgChatAction", conditions: (module) => (module.addAndSendMsgToChat) ? module.addAndSendMsgToChat : null },
        { id: "Catalog", module: "WAWebCatalogCollection", conditions: (module) => (module.Catalog) ? module.Catalog : null },
        { id: "MsgKey", module: "WAWebMsgKey", conditions: (module) => (module.default && module.default.toString && module.default.toString().includes('MsgKey error: obj is null/undefined')) ? module.default : null },
        { id: "Parser", module: "WAWebE2EProtoUtils", conditions: (module) => (module.convertToTextWithoutSpecialEmojis) ? module.default : null },
        { id: "Builders", module: "WAWebProtobufsE2E.pb", conditions: (module) => (module.TemplateMessage && module.HydratedFourRowTemplate) ? module : null },
        { id: "Me", module: "WAWebUserPrefsMeUser", conditions: (module) => (module.PLATFORMS && module.Conn) ? module.default : null },
        { id: "MyStatus", module: "WAWebContactStatusBridge", conditions: (module) => (module.getStatus && module.setMyStatus) ? module : null },
        { id: "ChatStates", module: "WAWebChatStateBridge", conditions: (module) => (module.sendChatStatePaused && module.sendChatStateRecording && module.sendChatStateComposing) ? module : null },
        { id: "GroupActions", module: "WAWebExitGroupAction", conditions: (module) => (module.sendExitGroup && module.localExitGroup) ? module : null },
        { id: "Participants", module: "WAWebGroupsParticipantsApi", conditions: (module) => (module.addParticipants && module.removeParticipants && module.promoteParticipants && module.demoteParticipants) ? module : null },
        { id: "WidFactory", module: "WAWebWidFactory", conditions: (module) => (module.isWidlike && module.createWid && module.createWidFromWidLike) ? module : null },
        { id: "Sticker", module: "WAWebStickerPackCollection", resolver: m => m.StickerPackCollection, conditions: (module) => (module.default && module.default.Sticker) ? module.default.Sticker : null },
        { id: "UploadUtils", module: "WAWebUploadManager", conditions: (module) => (module.default && module.default.encryptAndUpload) ? module.default : null }
    ];

    return new Promise((resolve, reject) => {
        try {
            const e = (m) => require("__debug").modulesMap[m] || false;

            const shouldRequire = m => {
                const a = e(m);
                if (!a) return false;
                return a.dependencies != null && a.depPosition >= a.dependencies.length
            };

            neededObjects.map((needObj) => {
                const m = needObj.module;
                if (!m) return;
                if (!e(m)) return;
                if (shouldRequire(m)) {
                    let neededModule = require(m)
                    needObj.foundedModule = neededModule;
                }
            });

            window.Store = {
                ...{ ...require("WAWebCollections") },
                ...(window.Store || {})
            }

            neededObjects.forEach((needObj) => {
                if (needObj.foundedModule) {
                    window.Store[needObj.id] = needObj.resolver ? needObj.resolver(needObj.foundedModule) : needObj.foundedModule;
                }
            });

            if (window.Store.Chat) {
                window.Store.Chat.modelClass.prototype.sendMessage = function (e) {
                    window.Store.SendTextMsgToChat(this, ...arguments);
                }
            }

            if (window.Store) {
                window.Store.InitType = "new_method";
            }

            resolve();
        } catch (error) {
            reject("InjectJS :: initStoreNew :: Error :: " + error);
        }
    });
}

// Init PRIMES Object function
const initPrimes = function () {
    // Initalize PRIMES object
    window.PRIMES = { lastRead: {} };

    // _serializeRawObject
    window.PRIMES._serializeRawObject = (e) => {
        if (e) {
            let i = {};
            e = e.toJSON ? e.toJSON() : { ...e };
            for (let n in e)
                if (
                    ("statusMute" !== n) &
                    ("disappearingModeDuration" !== n) &
                    ("disappearingModeSettingTimestamp" !== n) &
                    ("forcedBusinessUpdateFromServer" !== n) &
                    ("privacyMode" !== n) &
                    ("sectionHeader" !== n) &
                    ("verifiedLevel" !== n)
                ) {
                    if ("id" === n) {
                        i[n] = { ...e[n] };
                        continue;
                    }
                    if ("object" == typeof e[n] && !Array.isArray(e[n])) {
                        i[n] = window.PRIMES._serializeRawObject(e[n]);
                        continue;
                    }
                    if (Array.isArray(e[n])) {
                        i[n] = e[n].map((e) =>
                            "object" == typeof e
                                ? window.PRIMES._serializeRawObject(e)
                                : e
                        );
                        continue;
                    }
                    i[n] = e[n];
                }
            return i;
        }
        return {};
    }

    // _serializeContactObject
    window.PRIMES._serializeContactObject = (e) => {
        return (e == null)
            ? null
            : Object.assign(window.PRIMES._serializeRawObject(e), {
                formattedName: e.formattedName,
                displayName: e.displayName,
                isMe: e.isMe,
                isMyContact: e.isMyContact,
                isPSA: e.isPSA,
                isUser: e.isUser,
                isVerified: e.isVerified,
                isWAContact: e.isWAContact,
            })
    };

    // Get group meta data
    // window.PRIMES.getGroupMetadata = async function (e, i) {
    //     let n = window.Store.GroupMetadata.get(e);
    //     return (
    //         void 0 !== n &&
    //         n.stale &&
    //         (await window.Store.GroupMetadata.update(e)),
    //         void 0 !== i && i(n),
    //         n
    //     );
    // }

    // OLD Code
    // window.PRIMES.sendAttachment = function (mediaBlob, chatid, caption, done) {
    //     var idUser = new window.Store.UserConstructor(chatid, { intentionallyUsePrivateConstructor: true });
    //     return Store.Chat.find(idUser).then((chat) => {
    //         var mc = new Store.MediaCollection(chat);
    //         mc.processAttachments([{ file: mediaBlob }], Store.EnumTypes.MEDIA_PICKER_ORIGIN_TYPE.CHAT_PHOTO_LIBRARY, chat).then(() => {
    //             var media = mc._models[0];
    //             media.sendToChat(chat, { caption: caption });
    //         });
    //     });
    // }
    // --------

    // Send media attachment
    window.PRIMES.sendAttachment = function (mediaBlob, chatid, caption, done) {
        return new Promise((resolve, reject) => {
            try {
                let chat = Store.Chat.get(chatid);
                var mc = new Store.MediaCollection(chat);
                mc.processAttachments([{ file: mediaBlob }, 1], chat, chat).then(() => {
                    try {
                        var media = mc._models[0];
                        let captionObject = {
                            quotedMsg: false,
                            isCaptionByUser: true,
                            type: mc._models[0].type,
                        };
                        /\S/.test(caption) && (captionObject.caption = caption);
                        media.sendToChat(chat, captionObject);
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    };

    // Get my contacts
    window.PRIMES.getMyContacts = function (callback) {
        const contacts = window.Store.Contact
            .filter(contact => contact.isAddressBookContact === 1)
            .map(contact => PRIMES._serializeContactObject(contact));

        if (callback) callback(contacts);
        return contacts;
    };

    // Get unsaved contacts
    window.PRIMES.getMyUnsavedContacts = function (callback) {
        const unsavedContacts = window.Store.Contact
            .filter(contact =>
                contact?.id.server === 'c.us' &&
                contact?.isAddressBookContact === 0 &&
                contact?.isBusiness !== true
            )
            .map(contact => ({ user: contact.id.user, pushname: contact.pushname || 'Unknown' }));
        if (callback) callback(unsavedContacts);
        return unsavedContacts;
    };

    // Get all contacts
    window.PRIMES.getAllContacts = function (done) {
        const contacts = window.Store.Contact.filter((contact) => {
            const isCusServer = contact?.id.server === 'c.us';
            const isNotInAddressBook = contact?.isAddressBookContact === 1;
            const isNotBusiness = (contact?.isBusiness !== true);
            return isCusServer && isNotInAddressBook && isNotBusiness;
        });

        if (done !== undefined) done(contacts);
        return contacts;
    }

    // Get group contacts
    window.PRIMES.getGroupContacts = function (group_id, callback) {
        let contacts = [];
        const groups = window.Store.Chat.filter(chat => chat?.id._serialized === group_id);
        if (groups.length > 0) {
            const participants = groups[0]?.groupMetadata?.participants;

            contacts = participants.map(p => {
                let name = p.contact?.name || p.contact?.pushname || p.contact?.shortname || 'Unknown';
                let number = '+' + p.contact?.phoneNumber.user;
                return { name, number };
            });
        }

        if (callback) callback(contacts);
        return contacts;
    };

    window.PRIMES.getGroupName = function (group_id, callback) {
        const groups = window.Store.Chat.filter(chat => chat?.id._serialized === group_id);
        let groupName = 'Group';
        if (groups.length > 0) {
            groupName = groups[0]?.formattedTitle || groups[0]?.attributes?.formattedTitle || 'Group';
        }
        if (callback) callback(groupName);
        return groupName;
    }

    // Get all groups
    window.PRIMES.getAllGroups = function (callback) {
        const groups = window.Store.Chat.filter(chat => {
            let isGroup = (chat?.groupMetadata) || (chat?.id.server === 'g.us');
            return isGroup;
        });
        if (callback) callback(groups);
        return groups;
    };

    // Get chat (group or contact) by id
    window.PRIMES.getChat = function (id, done) {
        // id = typeof id == "string" ? id : id._serialized;
        // const found = window.Store.Chat.get(id);
        // found.sendMessage = (found.sendMessage) ? found.sendMessage : function () { return window.Store.sendMessage.apply(this, arguments); };
        // if (done !== undefined) done(found);
        // return found;
        id = typeof id == "string" ? id : id._serialized;
        let found = window.Store.Chat.get(id);

        // If chat is not found, create a new chat for unsaved contacts
        if (!found) {
            console.log("Chat not found, creating new chat for:", id);

            // Use the WidFactory to create a new chat ID
            const wid = window.Store.WidFactory.createWid(id);
            const chatClass = window.Store.Chat.modelClass;
            found = new chatClass({ id: wid });

            // Manually add the chat to the Store.Chat collection
            window.Store.Chat.add(found);
            console.log("New chat created and added to Store.Chat:", id);
        }

        // Attach sendMessage method if it doesn't exist
        found.sendMessage = found.sendMessage || function () {
            return window.Store.sendMessage.apply(this, arguments);
        };

        if (done !== undefined) done(found);
        return found;
    }

    // Send a message
    window.PRIMES.sendMessage = function (id, message) {
        return new Promise((resolve, reject) => {
            try {
                if (!window.Store || !window.Store.Chat || !window.Store.TextMsgChatAction) {
                    initStoreOld();
                }
                var chat = PRIMES.getChat(id);
                if (chat !== undefined) {
                    chat.sendMessage(message);
                    resolve();
                } else {
                    reject("chat or group not found");
                }
            } catch (err) {
                reject(err);
            }
        });
    };
    

    // Convert base64 string data to File
    window.PRIMES.base64toFile = function (data, fileName) {
        let arr = data.split(",");
        let mime = arr[0].match(/:(.*?);/)[1];
        let bstr = atob(arr[1]);
        let n = bstr.length;
        let u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], fileName, { type: mime });
    }
}

// InitMain :: Load Store and PRIMES
var initStoreInterval = null;
var initStoreRetryCount = 0;
var useOldMethod = true;

const initMain = function () {
    initStoreRetryCount = 0;
    initStoreInterval = setInterval(() => {
        if (isWhatsappLoaded() && isWebpackLoaded()) {

            initStore(useOldMethod)
                .then(() => {
                    initPrimes();

                    // Check store and primes loaded or not
                    if (window.Store && window.PRIMES) {
                        clearInterval(initStoreInterval);
                        handleInitMainSuccess();
                    } else {
                        initStoreRetryCount++;
                        handleInitMainError();
                    }
                })
                .catch((e) => {
                    initStoreRetryCount++;
                    handleInitMainError();
                })

        } else {
            handleInitMainError();
        }

        if (!useOldMethod && initStoreRetryCount == 5) {
            reloadInitMain(true);
        }
    }, 1000);
}

const reloadInitMain = function (method) {
    clearInterval(initStoreInterval);
    setTimeout(() => {
        console.logWarn(`InjectJS :: reloadInitMain :: useOldMethod = ${method}`);
        useOldMethod = method;
        initMain();
    }, 2000)
}

const handleInitMainSuccess = function () {
    if (isWhatsappLoaded() && window.Store && window.PRIMES) {
        console.logSuccess(`InjectJS :: initMain - Success :: useOldMethod = ${useOldMethod}`);
        console.logSuccess(`InjectJS :: Init Store Type  :: ${getInitStoreType()}`);
        console.logSuccess(`InjectJS :: Whatsapp Version :: ${getWhatsappVersion()}`);

        getAllGroups();
        getAllContacts();
    }
}

const handleInitMainError = function (error = null) {
    let objName = null;
    if (!isWhatsappLoaded()) 
        objName = 'Whatsapp';
    else if (!isWebpackLoaded())
        objName = 'Webpack';
    else if (!window.Store) 
        objName = 'Store';
    else if (!window.PRIMES) 
        objName = 'PRIMES'; 

    if (error) {
        console.logError(`InjectJS :: initMain - Error :: useOldMethod = ${useOldMethod}`);
        console.error(error);
    } else if (objName) {
        console.logError(`InjectJS :: initMain - Error :: ${objName} is not loaded! :: useOldMethod = ${useOldMethod}`);
    } else {
        console.logError(`InjectJS :: initMain - Unkown Error :: useOldMethod = ${useOldMethod}`);
    }
}

// ======= CORE INJECT JS CODE ENDS HERE =======

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\

// ======= PRIME SENDER CODE STARTS =====

// Event Listeners and Prime Sender Functions
window.addEventListener('PRIMES::init', function (e) {
    reloadInitMain(e.detail.useOldMethod);
});

window.addEventListener('PRIMES::send-attachments', async function (e) {
    const attachments = e.detail.attachments;
    const caption = e.detail.caption;
    const number = e.detail.number;
    const chatId = number + '@c.us';

    try {
        const sendPromises = attachments.map(async (file, index) => {
            const fileData = await JSON.parse(file.data);
            const fileBlob = await window.PRIMES.base64toFile(fileData, file.name);
            await window.PRIMES.sendAttachment(fileBlob, chatId);
        });

        await Promise.all(sendPromises);
        window.postMessage({
            type: "send_attachments",
            payload: {
                chat_id: chatId,
                is_attachments_sent: "YES",
                comments: ""
            }
        }, "*");
    } catch (error) {
        console.error(error);
        window.postMessage({
            type: "send_attachments_error",
            payload: {
                chat_id: chatId,
                error: error,
                is_attachments_sent: "NO",
                comments: "Error while sending the attachments to number"
            }
        }, "*");
    }
});


window.addEventListener("#send-message-number", async function (e) {
    const number = e.detail.number;
    const message = e.detail.message;
    const chatId = number + '@c.us';

    try {
        await window.PRIMES.sendMessage(chatId, message);
        window.postMessage({
            type: "send_message",
            payload: {
                chat_id: chatId,
                is_message_sent: "YES",
                comments: ""
            }
        }, "*");
    } catch (error) {
        console.error(error);
        window.postMessage({
            type: "send_message_error",
            payload: {
                chat_id: chatId,
                error: error,
                is_message_sent: "NO",
                comments: "Error while sending the message to number"
            }
        }, "*");
    }
});

window.addEventListener('PRIMES::send-message-to-group', async function (e) {
    const groupId = e.detail.group_id;
    const message = e.detail.message;
    const groupIdObj = { "_serialized": e.detail.group_id };

    try {
        await window.PRIMES.sendMessage(groupIdObj, message);
        window.postMessage({
            type: "send_message_to_group",
            payload: {
                group_id: groupId,
                is_message_sent: "YES",
                comments: ""
            }
        }, "*");
    } catch (error) {
        console.error(error);
        window.postMessage({
            type: "send_message_to_group_error",
            payload: {
                chat_id: chatId,
                error: error,
                is_message_sent: "NO",
                comments: "Error while sending the message to group"
            }
        }, "*");
    }
});

window.addEventListener('PRIMES::send-attachments-to-group', async function (e) {
    const attachments = e.detail.attachments;
    const caption = e.detail.caption;
    const groupId = e.detail.groupId;

    try {
        const sendPromises = attachments.map(async (file, index) => {
            const fileData = await JSON.parse(file.data);
            const fileBlob = await window.PRIMES.base64toFile(fileData, file.name);
            await window.PRIMES.sendAttachment(fileBlob, groupId, caption[index]);
        });

        await Promise.all(sendPromises);
        window.postMessage({
            type: "send_attachments_to_group",
            payload: {
                group_id: groupId,
                is_attachments_sent: "YES",
                comments: ""
            }
        }, "*");
    } catch (error) {
        console.error(error);
        window.postMessage({
            type: "send_attachments_to_group_error",
            payload: {
                group_id: groupId,
                error: error,
                is_attachments_sent: "NO",
                comments: "Error while sending the attachments to group"
            }
        }, "*");
    }
});

window.addEventListener('PRIMES::export-group', function (e) {
    const groupId = e.detail.groupId;

    try {
        let groupName = PRIMES.getGroupName(groupId);
        let contacts = PRIMES.getGroupContacts(groupId);
        let rows = [];

        contacts.forEach(contact => {
            rows.push([contact.number, contact.name]);
        })

        // rows.sort();
        rows.unshift(['Number', 'Name'])

        let csvContent = "data:text/csv;charset=utf-8," + rows.map(row => row.join(",")).join("\n");
        let data = encodeURI(csvContent);
        let link = document.createElement("a");

        link.setAttribute("href", data);
        link.setAttribute("download", groupName + ".csv");
        document.body.appendChild(link);
        link.click()
        document.body.removeChild(link);
    } catch (error) {
        window.postMessage({ type: "export_group_error", payload: { group_id: groupId, error: error } }, "*");
    }
});

window.addEventListener('PRIMES::export-unsaved-contacts', function (e) {
    let type = e.detail.type;

    try {
        let rows = [];
        let contacts = PRIMES.getMyUnsavedContacts();

        let numContacts = (type == 'Advance') ? contacts.length : 10;
        for (let i = 0; i < numContacts; i++) {
            let correctNumber = "+" + contacts[i].user;
            let whatsappName = contacts[i].pushname || 'Unknown';
            rows.push([correctNumber, whatsappName]);
        }

        rows.unshift(['Numbers', 'Name']);
        if (type == 'Expired') {
            for (let i = 0; i < 3; i++)
                rows.push([]);
            rows.push(['To download all contacts please buy Advance Premium']);
        }

        let csvContent = rows.map(row => row.join(",")).join("\n");
        let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

        let link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(blob));
        link.setAttribute("download", "Advanced_All_Unsaved_Chats_Export.csv");

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        window.postMessage({ type: "export_unsaved_contacts_error", payload: { type: type, error: error } }, "*");
    }
});

const getAllGroups = async function () {
    try {
        let groups = await PRIMES.getAllGroups();
        const allGroups = groups.map((group) => {
            return {
                id: group?.id || group?.attributes?.id,
                name: group?.formattedTitle || group?.attributes?.formattedTitle,
            }
        });
        window.postMessage({ type: "get_all_groups", payload: allGroups }, "*");
        return allGroups;
    } catch (error) {
        window.postMessage({ type: "get_all_groups_error", payload: { error: error } }, "*");
        return [];
    }
}

window.addEventListener('PRIMES::get-all-groups', getAllGroups);

const getAllContacts = async function () {
    try {
        let contacts = await PRIMES.getAllContacts();
        const allContacts = contacts.map((contact) => {
            return {
                id: contact.attributes.id,
                name: contact.attributes.name,
            }
        });
        window.postMessage({ type: "get_all_contacts", payload: allContacts }, "*");
        return allContacts;
    } catch (error) {
        window.postMessage({ type: "get_all_contacts_error", payload: { error: error } }, "*");
        return [];
    }
}

window.addEventListener('PRIMES::get-all-contacts', getAllContacts);

const getInitStoreType = function () {
    let InitType = window?.Store?.InitType;
    window.postMessage({ type: "get_init_store_type", payload: InitType }, "*");
    return InitType;
}

const getWhatsappVersion = function () {
    let whatsappVersion = (window?.Debug?.VERSION ? window.Debug.VERSION : 'Not Found');
    window.postMessage({ type: "get_whatsapp_version", payload: whatsappVersion }, "*");
    return whatsappVersion;
}

// Start Init Main
reloadInitMain(true);