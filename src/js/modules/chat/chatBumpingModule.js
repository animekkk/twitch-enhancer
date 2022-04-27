import { Module } from '../module.js';
import { logger } from '../../utils/logger.js';
import { getChatMessage, getChatMessages } from '../../utils/twitch.js';

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
    const messageContent = message.props?.message?.message;
    if(messageContent && messageContent === '^' && message.props.reply) {
        element.remove();
        const bumpElement = getMessageById(message.props.reply.parentMsgId);
        const bumps = addBump(bumpElement);
        showBumps(bumps, bumpElement);
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

function showBumps(amount, element) {
    let bumpsElement;
    if(element.querySelector('.te-bumps')) {
        bumpsElement = element.querySelector('.te-bumps');
    } else {
        const messageContent = element.querySelector('.message') || element.querySelector('.seventv-message-context') || element.querySelector('span[data-test-selector="chat-line-message-body"]');
        bumpsElement = document.createElement('span');
        bumpsElement.className = 'te-bumps';
        messageContent.appendChild(bumpsElement);
    }
    bumpsElement.innerHTML = 'Bumps: ' + amount;
}