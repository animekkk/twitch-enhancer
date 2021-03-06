import { Module } from '../module.js';
import { logger } from '../../utils/logger.js';
import { localBadges } from '../../data/badges.js';
import { openDatabase, getUser, addUser } from '../../utils/chatDatabase.js';
import { addText } from '../../utils/chatInput.js'; 
import { honors } from '../../data/honors.js';
import { customIcons } from '../../data/customIcons.js';
import { groups } from '../../data/groups.js';
import { twitchEnhancer } from '../../main.js'; 
import { bots } from '../../data/bots.js'
import { getChat, getChatService, sendMessage } from '../../utils/twitch.js';

export const chatMessagesModule = new Module('chatMessages', callback);

async function callback(element) {
    element.setAttribute('twitch-enhancer', '');
    if(twitchEnhancer.settings.te_group_badges || twitchEnhancer.settings.te_viewer_badges) {
        sendMessage('"Viewers Badges" are disabled for now, sorry.');
        openDatabase();
        const callback = (mutationList, observer) => {
            for(const mutation of mutationList) {
                if(mutation.type === 'childList' && mutation.addedNodes) {
                    for(const message of mutation.addedNodes) {
                        prepareMessage(message);
                    }
                }
            }
        }
        const chatObserver = new MutationObserver(callback);
        chatObserver.observe(element, { attributes: true, childList: true });
        logger.info('Chat messages observer started.');
        startUsersInterval();
    }
}

// function canDisplay() {
//     return new Promise((resolve) => {
//         let times = 0;
//         const badgesInterval = setInterval(() => {
//             if(getRoles()) {
//                 clearInterval(badgesInterval);
//                 resolve(checkRoles());
//                 logger.info('Chat badges found!');
//             }
//             if(times > 60) {
//                 if(typeof honors.find(honor => honor.name === getChat()?.props?.currentUserDisplayName?.toLowerCase()) !== undefined) {
//                     clearInterval(badgesInterval);
//                     resolve(true);
//                     return;
//                 }
//                 sendMessage('Could not find your chat roles. Try to restart this page to make "Viewer Badges" work.');
//                 clearInterval(badgesInterval);
//                 resolve(false);
//             }
//             times++;
//         }, 1000);
//     });
// }

// function checkRoles() {
//     const badges = getRoles();
//     if(!badges) return false;
//     logger.debug(`Your roles: ${Object.keys(badges).join(', ')} (${getChat().props.channelLogin})`);
//     return (typeof badges.broadcaster !== 'undefined' || typeof badges.moderator !== 'undefined' || 
//         typeof badges.vip !== 'undefined' || typeof badges.subscriber !== 'undefined' 
//         || typeof honors.find(honor => honor.name === getChat().props.currentUserDisplayName.toLowerCase()) !== undefined);
// }

// function getRoles() {
//     return getChatService().client?.session?.channelstate['#' + getChat().props.channelLogin]?.userState?.badges;
// }

async function prepareMessage(message) {
    const nameElement = message.querySelector('.chat-line__username');
    if(!nameElement) return;
    let name = nameElement.textContent.toLowerCase();
    if(name.includes('(')) name = name.substring(name.indexOf('(') + 1, name.indexOf(')'));
    if(bots.includes(name.toLowerCase())) return;
    nameElement.setAttribute('username', name);
    nameElement.addEventListener('contextmenu', mentionName);
    const badgesElement = message.querySelector('.chat-line__username-container')?.children[0] || message.querySelector('.chat-line__message--badges');
    badgesElement.classList.add(`te-${name}-badges`);
    badgesElement.setAttribute('username', name);
    const badgesList = [];

    if(honors.find(honor => honor.name.toLowerCase() === name.toLowerCase())) setHonor(nameElement);

    let viewerBadge = undefined; //await checkViewerBadges(name);
    if(viewerBadge?.streamer?.badge) viewerBadge = fixType(viewerBadge);

    if(viewerBadge) {
        viewerBadge = prepareViewerBadge(viewerBadge);

        if(twitchEnhancer.settings.te_viewer_actions) {
            const action = twitchEnhancer.settings.te_viewer_actions_list.find(action => action.name.toLowerCase() === viewerBadge.streamer.toLowerCase());
            if(action) performAction(action, message);
        }

        if(twitchEnhancer.settings.te_group_badges && !twitchEnhancer.settings.te_viewer_badges && viewerBadge.type === 'group') badgesList.push(viewerBadge);
        else if(twitchEnhancer.settings.te_viewer_badges) badgesList.push(viewerBadge);
    }

    const localBadges = checkLocalBadges(name);
    if(localBadges.length > 0) badgesList.push(...localBadges);
    
    if(badgesList.length > 0) addBadges(badgesElement, badgesList);
}

function prepareViewerBadge(viewerBadge) {
    if(twitchEnhancer.settings.te_group_badges) {
        const groupBadge = groups.find(group => group.streamers.includes(viewerBadge.streamer.toLowerCase()));
        if(groupBadge) {
            viewerBadge.suffix = `(${viewerBadge.streamer})`;
            viewerBadge.streamer = groupBadge.name;
            viewerBadge.badge = groupBadge.icon;
            viewerBadge.type = 'group';
        }
    }

    const customIcon = customIcons.find(icon => icon.name.toLowerCase() === viewerBadge.streamer.toLowerCase());
    if(customIcon) viewerBadge.badge = customIcon.icon;
    return viewerBadge;
}

function performAction(action, message) {
    setTimeout(() => { // 7TV fix :)
        if(action.action === 'hide') {
            const content = message.querySelector('[data-test-selector="chat-line-message-body"]') || message.querySelector('.message');
            content.innerHTML = `<span class="te-hidden-message">This message was hidden by Twitch Enhancer.</span>`
        }
        if(action.action === 'delete') message.remove();
    }, 150);
}

function checkLocalBadges(name) {
    const returnBadges = [];
    for(const badge of localBadges) {
        if(badge.name === name) returnBadges.push(badge);
    }
    return returnBadges;
}

function addBadges(badgeElement, badgesList) {
    for(const badge of badgesList) {
        const image = new Image();
        image.onload = () => {
            if(badgeElement.children.length < 1) badgeElement.appendChild(image);
            else badgeElement.insertBefore(image, badgeElement.firstChild);
        };
        image.src = badge.badge;
        image.className = 'chat-badge viewer-badge ffz-badge';
        image.setAttribute('streamer', badge.streamer);
        if(badge.suffix) image.setAttribute('suffix', badge.suffix);
        image.addEventListener('mouseenter', showPopup);
        image.addEventListener('mouseleave', hidePopup);
        image.addEventListener('click', mentionBadge);
        image.addEventListener('contextmenu', mentionBadge);
        badgeElement.classList.remove(`te-${badge.name}-badges`);
    }
}

function setHonor(nameElement) {
    const color = nameElement.style.color || nameElement.firstChild.firstChild.style.color || 'white';
    nameElement.style.textShadow = `${color} 0 0 10px`;
}

function showPopup(event) {
    let popup = document.querySelector('#te-badge-popup');
    if(popup) popup.remove();
    popup = document.createElement('div');
    popup.id = 'te-badge-popup';
    const streamer = event.srcElement.getAttribute('streamer');
    const suffix = event.srcElement.getAttribute('suffix');
    const title = `${streamer} ${suffix ? suffix : ''}`;
    popup.innerHTML += `<img src="${event.srcElement.src}" alt="${streamer}">`;
    popup.innerHTML += `<br /><span>${title}</span>`;
    let y = event.pageY - 50;
    popup.style.top = (y < 0 ? 0 : y) + 'px';
    popup.style.left = (event.pageX + 25) + 'px';
    document.getElementById('root').children[0].appendChild(popup);
}

function hidePopup() {
    const popup = document.querySelector('#te-badge-popup');
    if(!popup) return;
    popup.remove();
}

function mentionName(event) {
    let name = event.srcElement.parentElement.getAttribute('username');
    if(!name) name = event.srcElement.parentElement.parentElement.getAttribute('username');
    addText(`@${name} `, true, true);
    event.preventDefault();
}

function mentionBadge(event) {
    const name = event.srcElement.parentElement.getAttribute('username');
    const streamer = event.srcElement.getAttribute('streamer');
    const suffix = event.srcElement.getAttribute('suffix');
    addText(`@${name} - ${streamer} ${suffix ? suffix : 'Viewer'} `, true, true);
    event.preventDefault();
}

let users = [];
let block = 0;

async function checkViewerBadges(name) {
    const cacheUser = await getUser(name);
    if(cacheUser && !cacheUser.error) return cacheUser;
    if(cacheUser.error === 418) return;
    if(!users.includes(name)) users.push(name);
    return;
}

function fixType(user) {
    return {
        name: user.name,
        badge: user.streamer.badge,
        streamer: user.streamer.streamer
    }
}

const errors = {
    expire: 0,
    count: 0
};

function startUsersInterval() {
    setInterval(async () => {
        if(users.length < 1) return;
        if(block >= Date.now()) return;
        if((errors.expire + 180000) <= Date.now() && errors.count > 0) {
            errors.count = 0;
            errors.expire = 0;
            logger.info('Reseting chat errors.');
        } else if(errors.count >= 25) {
            logger.warn('Blocking users interval for 30 seconds (too many errors).');
            block = Date.now() + 30000;
            errors.count = 0;
            errors.expire = 0;
            return;
        }
        let names = users.shift();
        if(users.length > 25) {
            names = users.splice(0, 100).sort().join(',');
            block = Date.now() + 10000;
            logger.warn('Blocking users interval for 10 seconds.');
        }
        let json;
        try {
            const data = await fetch(`https://teapi.vopp.top/chat/${names}`);
            if(data.status !== 200) {
                errors.expire = Date.now();
                errors.count++;
            }
            json = await data.json();
        } catch(e) {
            errors.expire = Date.now();
            errors.count++;
        }
        if(!json) return;
        for(const user of json) {
            const cacheUser = {
                name: user.login,
                badge: user.watchtimes[0].streamer.profileImageUrl,
                streamer: user.watchtimes[0].streamer.displayName
            }
            addUser(cacheUser, user.cache * 1000);
            document.querySelectorAll(`.te-${cacheUser.name}-badges`).forEach(badgeElement => addBadges(badgeElement, Array.of(prepareViewerBadge(cacheUser))));
        }
    }, 1000);
    logger.info('Users interval started.');
}