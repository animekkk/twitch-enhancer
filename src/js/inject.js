'use strict';

(async function () {
    const settings = await new Promise(resolve => {
        chrome.storage.sync.get({
            te_xayo_format: 'full',
            te_xayo_service: 'auto',
            te_viewer_badges: true,
            te_group_badges: true,
            te_viewer_actions: true,
            te_viewer_custom_icons: [],
            te_viewer_actions_list: [],
            te_real_vod_time: true,
            te_hide_chat_events: false
        }, options => {
            resolve(options)
        });
    });
    
    const twitchEnhancer = {
        settings,
        url: chrome.runtime.getURL('%name%')
    }
    
    const head = document.head || document.getElementsByTagName('head')[0] || document.documentElement;
    
    const injects = [
        {
            id: 'twitch-enhancer-settings',
            type: 'code',
            value: `window.twitchEnhancer = ${JSON.stringify(twitchEnhancer)};`,
        },
        {
            id: 'twitch-enhancer-script',
            type: 'url',
            value: chrome.runtime.getURL('js/main.js'),
            module: true
        }
    ];

    for(const inject of injects) {
        const script = document.createElement('script');
        script.id = inject.id;
        script.async = true;
        if(inject.module) script.type = 'module';
        if(inject.type === 'url') script.src = inject.value;
        else if(inject.type === 'code') script.text = inject.value; 
        head.insertBefore(script, head.lastChild);
        console.log(`[TE] ${script.id} injected!`);
    }
})();