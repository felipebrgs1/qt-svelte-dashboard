/**
 * BRIDGE CONTRACT
 * This file is the single source of truth for communication between
 * the C++ Backend (Qt) and the TypeScript Frontend (Svelte).
 */

export interface BridgeContract {
    /**
     * METHODS (Frontend calling Backend)
     */
    methods: {
        /** Opens a native system file dialog to select a PDF */
        openFileDialog(): Promise<string>;

        /** Loads a PDF from the given local file path */
        loadPdf(path: string): void;

        /**
         * Sends text to the backend to be translated
         * @param text The source text
         * @param targetLang Target language code (e.g., 'pt', 'en')
         */
        translate(text: string, targetLang: string): void;
    };

    /**
     * SIGNALS (Backend notifying Frontend)
     */
    signals: {
        /**
         * Emitted when a PDF is loaded.
         * @param pdfUrl  A "pdfreader://" URL (e.g. pdfreader:///home/user/file.pdf)
         *                served by PdfSchemeHandler — NO base64, NO QWebChannel data transfer.
         * @param pageCount  Always 0 from C++; pdf.js resolves the real count after loading.
         */
        pdfLoaded(pdfUrl: string, pageCount: number): void;

        /** Emitted when a translation request is complete. */
        translationReady(original: string, translated: string): void;

        /** Emitted when an error occurs in the backend. */
        errorOccurred(message: string): void;
    };
}

/**
 * Utility type to extract signals as Connectable objects
 * (This is how QWebChannel exposes signals in JS)
 */
export type Signal<T extends (...args: any[]) => void> = {
    connect(callback: T): void;
    disconnect(callback: T): void;
};

/**
 * The final typed Bridge object that the Frontend sees
 */
export interface QtBridge {
    openFileDialog: BridgeContract['methods']['openFileDialog'];
    loadPdf: BridgeContract['methods']['loadPdf'];
    translate: BridgeContract['methods']['translate'];

    pdfLoaded: Signal<BridgeContract['signals']['pdfLoaded']>;  // arg0 = pdfreader:// URL
    translationReady: Signal<BridgeContract['signals']['translationReady']>;
    errorOccurred: Signal<BridgeContract['signals']['errorOccurred']>;
}
