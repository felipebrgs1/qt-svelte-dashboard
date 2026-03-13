// @ts-nocheck
import { writable } from 'svelte/store';

declare global {
    interface Window {
        qt: {
            webChannelTransport: any;
        };
        QWebChannel: any;
    }
}

export const bridgeStore = writable<any>(null);

export async function initBridge() {
    if (typeof window.qt === 'undefined') {
        console.warn('Qt WebChannel transport not found. Are we running in a browser?');
        return;
    }

    return new Promise((resolve) => {
        new QWebChannel(window.qt.webChannelTransport, (channel) => {
            const bridge = channel.objects.bridge;
            bridgeStore.set(bridge);
            console.log('Bridge initialized:', bridge);
            resolve(bridge);
        });
    });
}
