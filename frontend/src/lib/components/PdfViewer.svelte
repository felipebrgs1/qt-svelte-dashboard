<script lang="ts">
    import { onMount } from 'svelte';
    import * as pdfjs from 'pdfjs-dist';
    // @ts-ignore
    import * as pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs';

    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.mjs',
        import.meta.url
    ).toString();

    import { createEventDispatcher } from 'svelte';

    let { base64Data = '', scale = $bindable(1.5), currentPage = $bindable(1), numPages = $bindable(0), onselection = null } = $props();

    let canvas = $state<HTMLCanvasElement | null>(null);
    let textLayer = $state<HTMLDivElement | null>(null);
    
    let pdfDoc = $state<any>(null);

    $effect(() => {
        if (base64Data) {
            loadPdf(base64Data);
        }
    });

    $effect(() => {
        if (pdfDoc && (currentPage || scale)) {
            renderPage(currentPage);
        }
    });

    async function loadPdf(data: string) {
        try {
            const loadingTask = pdfjs.getDocument({ data: atob(data) });
            pdfDoc = await loadingTask.promise;
            numPages = pdfDoc.numPages;
            currentPage = 1;
            renderPage(1);
        } catch (err) {
            console.error('Error loading PDF:', err);
        }
    }

    async function renderPage(pageNum: number) {
        if (!pdfDoc || !canvas || !textLayer) return;

        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        const context = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        await page.render(renderContext).promise;

        // Render text layer
        textLayer.innerHTML = '';
        textLayer.style.width = `${viewport.width}px`;
        textLayer.style.height = `${viewport.height}px`;
        textLayer.style.setProperty('--scale-factor', scale.toString());
        
        const textContent = await page.getTextContent();
        // @ts-ignore
        await pdfjs.renderTextLayer({
            textContentSource: textContent,
            container: textLayer,
            viewport: viewport
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
    <div class="relative shadow-2xl border bg-white" style="width: fit-content;" onmouseup={handleMouseUp}>
        <canvas bind:this={canvas}></canvas>
        <div bind:this={textLayer} class="textLayer absolute top-0 left-0"></div>
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
        line-height: 1.0;
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
