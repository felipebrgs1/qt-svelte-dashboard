<script lang="ts">
    import * as pdfjs from "pdfjs-dist";
    import workerUrl from "pdfjs-dist/build/pdf.worker.js?url";

    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

    let {
        pdfUrl = "",
        viewMode = "page",
        scale = $bindable(1.5),
        currentPage = $bindable(1),
        numPages = $bindable(0),
        onselection = null as
            | ((data: { text: string; rect: DOMRect }) => void)
            | null,
        onrendercomplete = null as ((canvas: HTMLCanvasElement) => void) | null,
    } = $props();

    let canvas = $state<HTMLCanvasElement | null>(null);
    let textLayer = $state<HTMLDivElement | null>(null);
    let container = $state<HTMLDivElement | null>(null);

    let pdfDoc = $state<pdfjs.PDFDocumentProxy | null>(null);
    let renderTask: pdfjs.RenderTask | null = null;
    let lastJumpedPage = 0;

    $effect(() => {
        if (pdfUrl) {
            loadPdf(pdfUrl);
        }
    });

    $effect(() => {
        if (pdfDoc && viewMode === "page" && canvas && textLayer) {
            // Re-run whenever pdfDoc, currentPage or scale changes
            renderPage(currentPage, scale);
        }
    });

    $effect(() => {
        // Re-render all pages when document, mode, or scale changes
        if (pdfDoc && viewMode === "scroll" && container) {
            // Reference scale to ensure re-render on zoom
            const _ = scale;
            renderAllPages();
        }
    });

    // Jump to page logic for scroll mode
    $effect(() => {
        if (viewMode === "scroll" && container && currentPage && pdfDoc) {
            // Only jump if the change came from external state (not scroll handler)
            if (currentPage === lastJumpedPage) return;

            const pageElement = container.querySelector(
                `[data-page="${currentPage}"]`,
            ) as HTMLElement;

            if (pageElement) {
                lastJumpedPage = currentPage;
                pageElement.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }
        }
    });

    async function loadPdf(url: string) {
        try {
            console.log("[PdfViewer] Loading PDF from URL:", url);
            let loadingTask = pdfjs.getDocument({ url });

            loadingTask.onPassword = (
                updatePassword: (password: string) => void,
                reason: number,
            ) => {
                const password = prompt(
                    reason === 1 // pdfjs.PasswordResponses.NEED_PASSWORD
                        ? "Este PDF está protegido por senha. Por favor, insira a senha:"
                        : "Senha incorreta. Tente novamente:",
                );
                if (password !== null) {
                    updatePassword(password);
                } else {
                    // Se o usuário cancelar, a promise de carregamento falhará
                }
            };

            const doc = await loadingTask.promise;
            numPages = doc.numPages;
            currentPage = 1;
            pdfDoc = doc;
            console.log(`[PdfViewer] PDF loaded with ${numPages} pages`);
        } catch (error: any) {
            if (error.name === "PasswordException") {
                console.warn(
                    "[PdfViewer] PDF loading cancelled or failed due to password.",
                );
            } else {
                console.error(
                    "[PdfViewer] Error loading PDF:",
                    error?.message || error,
                    JSON.stringify(error),
                );
            }
        }
    }

    async function renderAllPages() {
        if (!pdfDoc || !container) return;
        container.innerHTML = "";

        for (let i = 1; i <= numPages; i++) {
            const pageContainer = document.createElement("div");
            pageContainer.className = "relative shadow-md border bg-white mb-4";
            pageContainer.style.width = "fit-content";
            pageContainer.dataset.page = i.toString();

            const pageCanvas = document.createElement("canvas");
            const pageTextLayer = document.createElement("div");
            pageTextLayer.className = "textLayer absolute top-0 left-0";

            pageContainer.appendChild(pageCanvas);
            pageContainer.appendChild(pageTextLayer);
            container.appendChild(pageContainer);

            await renderPageToElements(i, scale, pageCanvas, pageTextLayer);
        }
    }

    async function renderPageToElements(
        pageNum: number,
        currentScale: number,
        targetCanvas: HTMLCanvasElement,
        targetTextLayer: HTMLDivElement,
    ) {
        if (!pdfDoc) return;
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: currentScale });

        const context = targetCanvas.getContext("2d")!;
        targetCanvas.height = viewport.height;
        targetCanvas.width = viewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: viewport,
        };

        await page.render(renderContext).promise;

        targetTextLayer.replaceChildren();
        targetTextLayer.style.width = `${viewport.width}px`;
        targetTextLayer.style.height = `${viewport.height}px`;
        targetTextLayer.style.setProperty(
            "--scale-factor",
            currentScale.toString(),
        );

        const textContent = await page.getTextContent();
        await pdfjs.renderTextLayer({
            textContentSource: textContent,
            container: targetTextLayer,
            viewport: viewport,
        }).promise;
    }

    async function renderPage(pageNum: number, currentScale: number) {
        if (!pdfDoc || !canvas || !textLayer) return;

        // Cancel previous render task if any to prevent multiple renders competing for the same canvas
        if (renderTask) {
            renderTask.cancel();
        }

        try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: currentScale });

            const context = canvas.getContext("2d")!;
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // @ts-expect-error - RenderParameters is strict but required for pdfjs
            const renderContext: pdfjs.RenderParameters = {
                canvasContext: context,
                viewport: viewport,
            };

            renderTask = page.render(renderContext);
            await renderTask.promise;
            renderTask = null;

            // Render text layer
            textLayer.replaceChildren(); // eslint-disable-line svelte/no-dom-manipulating
            textLayer.style.width = `${viewport.width}px`;
            textLayer.style.height = `${viewport.height}px`;
            textLayer.style.setProperty(
                "--scale-factor",
                currentScale.toString(),
            );

            const textContent = await page.getTextContent();
            const textLayerParameters = {
                textContentSource: textContent,
                container: textLayer,
                viewport: viewport,
            };
            await pdfjs.renderTextLayer(textLayerParameters).promise;

            if (onrendercomplete && canvas) {
                onrendercomplete(canvas);
            }
        } catch (error: any) {
            if (error.name === "RenderingCancelledException") {
                // Ignore cancellation errors
            } else {
                console.error("[PdfViewer] Render error:", error);
            }
        }
    }

    function handleScroll(e: Event) {
        if (viewMode !== "scroll" || !container) return;
        const children = Array.from(container.children) as HTMLElement[];
        const containerRect = container.getBoundingClientRect();

        for (const child of children) {
            const rect = child.getBoundingClientRect();
            // Consider a page active if its top is within the upper part of the viewport
            if (
                rect.top >= containerRect.top - 80 &&
                rect.top <= containerRect.top + 80
            ) {
                const page = parseInt(child.dataset.page || "1");
                if (currentPage !== page) {
                    currentPage = page;
                    lastJumpedPage = page; // Update jump tracker to prevent feedback
                }
                break;
            }
        }
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

<div
    bind:this={container}
    class="pdf-viewer-container flex flex-col items-center p-8 min-h-full overflow-auto"
    onscroll={handleScroll}
    onmouseup={handleMouseUp}
>
    {#if viewMode === "page"}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="relative shadow-2xl border bg-white"
            style="width: fit-content;"
        >
            <canvas bind:this={canvas}></canvas>
            <div
                bind:this={textLayer}
                class="textLayer absolute top-0 left-0"
            ></div>
        </div>
    {/if}
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
        white-space: pre;
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
