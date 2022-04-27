import { Module } from '../module.js';
import { logger } from '../../utils/logger.js';
import { getChatMessage, getChatMessages, getChatService, getChat } from '../../utils/twitch.js';
import { tooltip } from '../../utils/tooltip.js';


export const chatBumpingModule = new Module('chatMessages', callback);

function callback(element) {
    element.setAttribute('twitch-enhancer', '');
    const callback = (mutationList, observer) => {
        for(const mutation of mutationList) {
            if(mutation.type === 'childList' && mutation.addedNodes) {
                for(const message of mutation.addedNodes) {
                    checkMessage(getChatMessage(message), message);
                }
            }
        }
    }
    const chatObserver = new MutationObserver(callback);
    chatObserver.observe(element, { attributes: true, childList: true });
    logger.info('Chat bumping observer started.');
    setTimeout(1000, () => {
        for(const message of document.querySelectorAll('chat-line__message')) {
            const twitchMessage = getChatMessage(message);
            if(!twitchMessage) continue;
            if(!message.hasAttribute('data-message-id')) message.setAttribute('data-message-id', message.props?.message?.id);
        }
    });
}

function checkMessage(message, element) {
    if(!message) return;
    element.setAttribute('data-message-id', message.props?.message?.id);
    const messageContent = message.props?.message?.messageBody;
    const regex = /[a-zA-Z0-9]/gm;
    if(messageContent && messageContent.includes('^') && message.props.message.reply && !regex.test(messageContent)) {
        element.style.display = 'none';
        const id = message.props.reply.parentMsgId;
        const bumpElement = getMessageById(id);
        const bumps = addBump(bumpElement);
        showBumps(bumps, bumpElement, id);
    }
}

function getMessageById(id) {
    return document.querySelector(`div[data-message-id="${id}"]`);
} 

function addBump(message) {
    let bumps = 1;
    if(message.hasAttribute('te-bumps')) {
        bumps += parseInt(message.getAttribute('te-bumps'));
    }
    message.setAttribute('te-bumps', bumps);
    return bumps;
}

function showBumps(amount, element, id, allowBump = true) {
    if(element.querySelector('.te-bumps')) element.querySelector('.te-bumps').remove();
    const messageContent = element.querySelector('.message') || element.querySelector('.seventv-message-context') || element.querySelector('span[data-test-selector="chat-line-message-body"]');
    const bumpsElement = document.createElement('div');
    bumpsElement.className = 'te-bumps';
    messageContent.appendChild(bumpsElement);
    
    bumpsElement.innerHTML = '+' + amount + `<span class="te-tooltip te-bump-${element.dataset.messageId} te-tooltip-top">Bumps</span>`;

    if(allowBump) bumpsElement.addEventListener('click', () => sendBump(id, element));
    else bumpsElement.style.cursor = 'no-drop';
    tooltip(bumpsElement, `te-bump-${element.dataset.messageId}`);

    return bumpsElement;
}

async function sendBump(messageId, message) {
    getChatService().client.connection.ws.send(`@reply-parent-msg-id=${messageId} PRIVMSG #${getChat().props.channelLogin} :^`);

    if(message) {
        const element = showBumps(addBump(message), message, messageId, false);
        setTimeout(() => {
            element.style.cursor = 'pointer';
            element.addEventListener('click', () => sendBump(messageId, message));
        }, 5000);
    }
}