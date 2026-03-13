<script lang="ts">
    import * as pdfjs from 'pdfjs-dist';
    import workerUrl from 'pdfjs-dist/build/pdf.worker.js?url';

    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

    let {
        pdfUrl = '',
        scale = $bindable(1.5),
        currentPage = $bindable(1),
        numPages = $bindable(0),
        onselection = null as ((data: { text: string, rect: DOMRect }) => void) | null,
    } = $props();

    let canvas = $state<HTMLCanvasElement | null>(null);
    let textLayer = $state<HTMLDivElement | null>(null);

    let pdfDoc = $state<pdfjs.PDFDocumentProxy | null>(null);

    $effect(() => {
        if (pdfUrl) {
            loadPdf(pdfUrl);
        }
    });

    $effect(() => {
        if (pdfDoc && (currentPage || scale)) {
            renderPage(currentPage);
        }
    });

    async function loadPdf(url: string) {
        try {
            console.log('[PdfViewer] Loading PDF from URL:', url);
            const loadingTask = pdfjs.getDocument({ url });
            pdfDoc = await loadingTask.promise;
            numPages = pdfDoc.numPages;
            currentPage = 1;
            renderPage(1);
            console.log(`[PdfViewer] PDF loaded with ${numPages} pages`);
        } catch (error: any) {
            console.error('[PdfViewer] Error loading PDF:', error?.message || error, JSON.stringify(error));
        }
    }

    async function renderPage(pageNum: number) {
        if (!pdfDoc || !canvas || !textLayer) return;

        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        const context = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // @ts-expect-error - RenderParameters is strict but required for pdfjs
        const renderContext: pdfjs.RenderParameters = {
            canvasContext: context,
            viewport: viewport,
        };
        await page.render(renderContext).promise;

        // Render text layer
        textLayer.replaceChildren(); // eslint-disable-line svelte/no-dom-manipulating
        textLayer.style.width = `${viewport.width}px`;
        textLayer.style.height = `${viewport.height}px`;
        textLayer.style.setProperty('--scale-factor', scale.toString());

        const textContent = await page.getTextContent();
        await pdfjs.renderTextLayer({
            textContentSource: textContent,
            container: textLayer,
            viewport: viewport,
        }).promise;
    }

    function handleMouseUp() {
        const selection = window.getSelection();
        const text = selection?.toString().trim();
        if (text && text.length > 1 && onselection) {
            const range = selection!.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            onselection({ text, rect });
        }
    }
</script>

<div class="pdf-viewer-container flex flex-col items-center p-8 min-h-full">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="relative shadow-2xl border bg-white"
        style="width: fit-content;"
        onmouseup={handleMouseUp}
    >
        <canvas bind:this={canvas}></canvas>
        <div
            bind:this={textLayer}
            class="textLayer absolute top-0 left-0"
        ></div>
    </div>
</div>

<style>
    :global(.textLayer) {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        overflow: hidden;
        opacity: 0.2;
        line-height: 1;
        pointer-events: auto;
    }

    :global(.textLayer > span) {
        color: transparent;
        position: absolute;
        white-space: pre;
        cursor: text;
        transform-origin: 0% 0%;
    }

    :global(.textLayer ::selection) {
        background: rgba(0, 0, 255, 0.2);
    }
</style>
