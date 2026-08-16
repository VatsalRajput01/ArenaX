// client/js/chatManager.js
import * as SocketClient from './socketClient.js';
import AudioEngine from './audioEngine.js';
import { premiumStickers } from './premiumStickers.js';
import * as CONSTANTS from './constants.js';

const dom = {
    chatInput: document.getElementById('chatInput'),
    btnSendChat: document.getElementById('btnSendChat'),
    chatMessages: document.getElementById('chatMessages'),
    typingIndicator: document.getElementById('typingIndicator'),
    btnEmojiToggle: document.getElementById('btnEmojiToggle'),
    emojiPicker: document.getElementById('emojiPicker'),
    p1Bubble: document.getElementById('p1Bubble'),
    p2Bubble: document.getElementById('p2Bubble')
};

let p1BubbleTimeout = null;
let p2BubbleTimeout = null;
let typingTimeout = null;
let isOnlineMode = false;

const ChatManager = {

    // Synchronize the network mode to restrict typing indicators to online matches
    setMode: function (mode) {
        isOnlineMode = (mode === CONSTANTS.MODES.ONLINE);
    },

    // Activate chat interface elements
    enable: function () {
        dom.chatInput.disabled = false;
        dom.btnSendChat.disabled = false;
        dom.btnEmojiToggle.disabled = false;
    },

    // Deactivate chat interface elements
    disable: function () {
        dom.chatInput.disabled = true;
        dom.btnSendChat.disabled = true;
        dom.btnEmojiToggle.disabled = true;
    },

    // Reset chat history to the default connection message
    clearHistory: function () {
        dom.chatMessages.innerHTML = '<div class="chat-message system">Chat Connected.</div>';
    },

    // Manage the typing indicator bubble above the opponent's profile
    showTypingBubble: function (isTyping) {
        const bubble = dom.p2Bubble;
        if (!bubble) return;

        if (isTyping) {
            if (bubble.getAttribute('data-typing') === 'true') return;

            if (!bubble.hasAttribute('data-typing') && !bubble.classList.contains('hidden')) return;

            clearTimeout(p2BubbleTimeout);
            bubble.setAttribute('data-typing', 'true');

            // Render the animated typing dots inside the opponent's speech bubble
            bubble.innerHTML = `
                <div style="display: inline-flex; align-items: flex-end; gap: 4px;">
                    <span style="font-size: 0.85rem; font-weight: 700; opacity: 0.9; letter-spacing: 0.5px; line-height: 1;">Typing</span>
                    <div style="display: flex; gap: 4px; margin-bottom: 2px;">
                        <div class="typing-dot" style="width: 4px; height: 4px; background-color: #f1f5f9;"></div>
                        <div class="typing-dot" style="width: 4px; height: 4px; background-color: #f1f5f9;"></div>
                        <div class="typing-dot" style="width: 4px; height: 4px; background-color: #f1f5f9;"></div>
                    </div>
                </div>
            `;
            bubble.classList.remove('hidden');
        } else {
            if (bubble.getAttribute('data-typing') === 'true') {
                bubble.classList.add('hidden');
                bubble.removeAttribute('data-typing');
            }
        }
    },

    // Display temporary speech bubbles over the player profiles
    showSpeechBubble: function (playerNum, text) {
        const bubble = playerNum === 1 ? dom.p1Bubble : dom.p2Bubble;
        if (!bubble) return;

        if (playerNum === 2) {
            bubble.removeAttribute('data-typing');
        }

        // Render sticker image if the text matches a premium sticker code, otherwise render standard text
        if (Object.hasOwn(premiumStickers, text)) {
            bubble.innerHTML = `<img src="${premiumStickers[text]}" alt="${text}" class="chat-sticker-img" style="width: 35px; height: 35px;" draggable="false" />`;
        } else {
            bubble.innerText = text;
        }

        bubble.classList.remove('hidden');

        // Set a timer to automatically hide the speech bubble
        if (playerNum === 1) {
            clearTimeout(p1BubbleTimeout);
            p1BubbleTimeout = setTimeout(() => bubble.classList.add('hidden'), 3000);
        } else {
            clearTimeout(p2BubbleTimeout);
            p2BubbleTimeout = setTimeout(() => bubble.classList.add('hidden'), 3000);
        }
    },

    // Append a new message or sticker to the main chat history panel
    appendMessage: function (text, type) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${type}`;

        if (Object.hasOwn(premiumStickers, text)) {
            msgDiv.classList.add('sticker');
            const img = document.createElement('img');
            img.src = premiumStickers[text];
            img.className = 'chat-sticker-img';
            img.draggable = false;
            img.alt = text;
            msgDiv.appendChild(img);
        } else {
            msgDiv.innerText = text;
        }

        dom.chatMessages.appendChild(msgDiv);

        // Maintain a maximum of 50 messages in the DOM to ensure performance
        if (dom.chatMessages.childElementCount > 50) dom.chatMessages.removeChild(dom.chatMessages.firstChild);

        // Scroll to the latest message
        dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
    },

    // Process and transmit the user's chat input
    handleSendChat: function () {
        const text = dom.chatInput.value.trim();
        if (text.length > 0) {
            // Require server acknowledgment before rendering the message locally
            SocketClient.sendChatMessage(text, (response) => {
                if (response && response.success) {
                    ChatManager.appendMessage(response.text, 'self');
                    ChatManager.showSpeechBubble(1, response.text);
                }
            });

            dom.chatInput.value = '';
            SocketClient.sendTypingState(false);
            clearTimeout(typingTimeout);
        }
    },

    // Initialize event listeners and socket subscriptions
    init: function () {
        // Local interaction listeners
        dom.btnSendChat.addEventListener('click', () => this.handleSendChat());
        dom.chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.handleSendChat(); });

        let isTyping = false; // Local state tracker for typing status

        // Broadcast typing state to the server with a debounce mechanism
        dom.chatInput.addEventListener('input', () => {
            if (!isOnlineMode) return;

            if (!isTyping) {
                isTyping = true;
                SocketClient.sendTypingState(true);
            }

            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                isTyping = false;
                SocketClient.sendTypingState(false);
            }, 1500);
        });

        // Toggle emoji picker visibility
        dom.btnEmojiToggle.addEventListener('click', () => { dom.emojiPicker.classList.toggle('hidden'); });

        // Handle emoji selection and transmission
        document.querySelectorAll('.emoji-opt').forEach(emoji => {
            emoji.addEventListener('click', (e) => {
                const stickerCode = e.target.getAttribute('data-code');
                AudioEngine.playEmojiSound(stickerCode);

                // Require server acknowledgment for stickers
                SocketClient.sendChatMessage(stickerCode, (response) => {
                    if (response && response.success) {
                        ChatManager.appendMessage(response.text, 'self');
                        ChatManager.showSpeechBubble(1, response.text);
                    }
                });
                dom.emojiPicker.classList.add('hidden');
            });
        });

        // Handle incoming chat messages from the server
        SocketClient.onChatMessage((data) => {
            if (Object.hasOwn(premiumStickers, data.text)) {
                AudioEngine.playEmojiSound(data.text);
            } else {
                AudioEngine.chatReceive();
            }
            ChatManager.appendMessage(data.text, 'opponent');
            ChatManager.showSpeechBubble(2, data.text);
        });

        // Handle incoming typing state indicators
        SocketClient.onTypingState((data) => {
            const isTypingActive = (typeof data === 'object' && data !== null)
                ? data.isTyping
                : (data === true || data === 'true');

            if (isTypingActive) {
                dom.typingIndicator.classList.add('active');
                ChatManager.showTypingBubble(true);
            } else {
                dom.typingIndicator.classList.remove('active');
                ChatManager.showTypingBubble(false);
            }
        });
    }
};

export default ChatManager;