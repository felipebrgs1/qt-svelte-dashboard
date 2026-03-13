<script lang="ts">
    import { bridgeStore, initBridge } from './lib/bridge';
    import * as Card from '@/lib/components/ui/card';
    import { Button } from '@/lib/components/ui/button';
    import { Badge } from '@/lib/components/ui/badge';
    import PdfViewer from './lib/components/PdfViewer.svelte';
    import PageNav from './lib/components/PageNav.svelte';
    import { onMount } from 'svelte';

    let pdfUrl = $state('');
    let translation = $state('');
    let currentPage = $state(1);
    let numPages = $state(0);
    let scale = $state(1.5);

    let selectionPos = $state({ x: 0, y: 0 });
    let isPopoverOpen = $state(false);
    let selectedText = $state('');

    let errorMessage = $state('');
    let isLoading = $state(false);

    function showError(msg: string) {
        errorMessage = msg;
        setTimeout(() => { errorMessage = ''; }, 5000);
    }

    onMount(async () => {
        const bridge = await initBridge();
        if (bridge) {
            if (bridge.pdfLoaded) {
                bridge.pdfLoaded.connect((url: string, pages: number) => {
                    console.log('[App] pdfLoaded signal received, url:', url, 'pages:', pages);
                    pdfUrl = url;
                    numPages = pages;
                    isLoading = false;
                });
            } else {
                console.error('Signal "pdfLoaded" not found on bridge');
            }

            if (bridge.translationReady) {
                bridge.translationReady.connect((_original: string, translated: string) => {
                    console.log('Signal received:', translated);
                    translation = translated;
                });
            } else {
                console.error('Signal "translationReady" not found on bridge');
            }

            if (bridge.errorOccurred) {
                bridge.errorOccurred.connect((message: string) => {
                    console.error('Backend error:', message);
                    isLoading = false;
                    showError('Erro do backend: ' + message);
                });
            }


        }
    });

    async function handleOpenFile() {
        const bridge = $bridgeStore;
        if (!bridge) {
            showError('Backend não conectado. Aguarde a conexão e tente novamente.');
            return;
        }

        console.log('[App] Opening file dialog...');
        const path = await bridge.openFileDialog();
        console.log('[App] Dialog result path:', path);

        if (!path) {
            console.log('[App] No file selected (dialog cancelled).');
            return;
        }

        console.log('[App] Loading PDF from path:', path);
        isLoading = true;
        bridge.loadPdf(path);
    }

    function handleSelection({ text, rect }: { text: string, rect: DOMRect }) {
        selectedText = text;
        selectionPos = { x: rect.left + rect.width / 2, y: rect.bottom + window.scrollY };
        isPopoverOpen = true;
        translation = '';

        if ($bridgeStore) {
            $bridgeStore.translate(text, 'pt');
        }
    }
</script>

<main
    class="h-screen flex flex-col overflow-hidden bg-background text-foreground"
>
    <header
        class="flex items-center justify-between gap-4 p-2 px-4 border-b shrink-0 bg-muted/10"
    >
        <div class="flex items-center gap-4">
            <h1 class="text-lg font-bold tracking-tight">PDF Reader</h1>
            <Badge variant={$bridgeStore ? 'default' : 'secondary'}>
                {$bridgeStore ? 'Connected' : 'Disconnected'}
            </Badge>
        </div>

        {#if pdfUrl}
            <div class="flex items-center gap-8">
                <PageNav
                    bind:currentPage
                    {numPages}
                />

                <div class="flex items-center gap-2">
                    <span
                        class="text-xs font-medium text-muted-foreground uppercase"
                        >Zoom</span
                    >
                    <select
                        bind:value={scale}
                        class="h-8 w-24 px-2 text-sm bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                        <option value={0.5}>50%</option>
                        <option value={0.75}>75%</option>
                        <option value={1.0}>100%</option>
                        <option value={1.25}>125%</option>
                        <option value={1.5}>150%</option>
                        <option value={2.0}>200%</option>
                    </select>
                </div>
            </div>
        {/if}

        <div class="flex items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                onclick={handleOpenFile}
                disabled={isLoading}
            >
                {#if isLoading}
                    <svg class="animate-spin mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    Carregando...
                {:else}
                    Open PDF
                {/if}
            </Button>
        </div>
    </header>

    <div class="flex-1 overflow-hidden relative flex">
        {#if pdfUrl}
            <div class="flex-1 overflow-auto bg-neutral-100">
                <PdfViewer
                    pdfUrl={pdfUrl}
                    bind:scale
                    bind:currentPage
                    bind:numPages
                    onselection={handleSelection}
                />
            </div>
        {:else}
            <div
                class="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4"
            >
                <div
                    class="w-16 h-16 rounded-full bg-muted flex items-center justify-center"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="lucide lucide-file-text"
                        ><path
                            d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"
                        /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path
                            d="M10 9H8"
                        /><path d="M16 13H8" /><path d="M16 17H8" /></svg
                    >
                </div>
                <p>Nenhum PDF aberto. Clique em "Open PDF" para começar.</p>
                <Button
                            variant="secondary"
                            onclick={handleOpenFile}
                            disabled={isLoading}>Selecionar Arquivo</Button
                        >
            </div>
        {/if}

        {#if isPopoverOpen}
            <div
                class="absolute z-50 pointer-events-none"
                style="left: {selectionPos.x}px; top: {selectionPos.y}px;"
            >
                <div class="pointer-events-auto -translate-x-1/2 mt-2">
                    <Card.Root class="w-80 shadow-xl border-primary/20">
                        <Card.Header class="p-3 pb-0">
                            <Card.Title class="text-[10px] uppercase text-muted-foreground flex justify-between items-center">
                                Tradução
                                <button
                                    onclick={() => isPopoverOpen = false}
                                    class="hover:text-foreground p-1"
                                    aria-label="Fechar tradução"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                </button>
                            </Card.Title>
                        </Card.Header>
                        <Card.Content class="p-3 pt-2">
                            {#if translation}
                                <p class="text-sm leading-relaxed">{translation}</p>
                            {:else}
                                <div class="flex items-center gap-2 text-muted-foreground animate-pulse">
                                    <div class="w-2 h-2 rounded-full bg-primary/40"></div>
                                    <span class="text-xs">Traduzindo...</span>
                                </div>
                            {/if}
                            <div class="mt-2 text-[10px] text-muted-foreground italic truncate opacity-50">
                                "{selectedText}"
                            </div>
                        </Card.Content>
                    </Card.Root>
                </div>
            </div>
        {/if}
    </div>

    {#if errorMessage}
        <div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] max-w-md w-full px-4">
            <div class="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                <span class="flex-1">{errorMessage}</span>
                <button onclick={() => errorMessage = ''} class="shrink-0 hover:opacity-70" aria-label="Fechar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
            </div>
        </div>
    {/if}
</main>
