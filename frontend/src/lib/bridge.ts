import { writable } from 'svelte/store';
// Note: We import from our shared contract in the middlend/ directory
import type { QtBridge } from '@middlend/contract';

declare global {
    interface Window {
        qt: {
            webChannelTransport: {
                send(data: string): void;
                onmessage: (message: { data: string }) => void;
            };
        };
        QWebChannel: new (
            transport: { send: (data: string) => void },
            callback: (channel: { objects: { bridge: QtBridge } }) => void
        ) => void;
    }
}

const QWebChannel = window.QWebChannel;

export const bridgeStore = writable<QtBridge | null>(null);
export type { QtBridge }; // Re-export for convenience

export async function initBridge(): Promise<QtBridge | undefined> {
    if (typeof window.qt === 'undefined') {
        console.warn('Qt WebChannel transport not found. Are we running in a browser?');
        return;
    }

    console.log('Initializing bridge...');
    return new Promise((resolve) => {
        try {
            new QWebChannel(window.qt.webChannelTransport, (channel) => {
                console.log('QWebChannel callback received');
                const bridge = channel.objects.bridge;
                if (!bridge) {
                    console.error('Bridge object not found in QWebChannel objects');
                    resolve(undefined);
                    return;
                }

                bridgeStore.set(bridge);
                console.log('Bridge initialized successfully:', bridge);
                resolve(bridge);
            });
        } catch (e) {
            console.error('Failed to initialize QWebChannel:', e);
            resolve(undefined);
        }
    });
}
