<script lang="ts">
    import { bridgeStore, initBridge } from "./lib/bridge";
    import type { Book } from "@middlend/contract";
    import { Trash2, FileWarning, Loader2, ChevronLeft } from "lucide-svelte";
    import { onMount } from "svelte";

    // [INFLECTION POINT]: App State Management (Svelte 5 Runes)
    // Context: Using $state for all reactive variables.
    // Auto-imports are enabled for UI components (Button, Badge, Card, etc.)
    // Components with namespace (Card.Root) were switched to individual auto-imported names (Card, CardHeader, etc.)

    let books = $state<Book[]>([]);
    let pdfUrl = $state("");
    let translation = $state("");
    let currentPage = $state(1);
    let numPages = $state(0);
    let scale = $state(1.0);

    let selectionPos = $state({ x: 0, y: 0 });
    let isPopoverOpen = $state(false);
    let selectedText = $state("");
    let currentBookId = $state<string | null>(null);

    let errorMessage = $state("");
    let isLoading = $state(false);

    function showError(msg: string) {
        errorMessage = msg;
        setTimeout(() => {
            errorMessage = "";
        }, 5000);
    }

    async function refreshLibrary() {
        const bridge = $bridgeStore;
        if (bridge) {
            books = await bridge.getBooks();
        }
    }

    onMount(async () => {
        const bridge = await initBridge();
        if (bridge) {
            refreshLibrary();

            if (bridge.pdfLoaded) {
                bridge.pdfLoaded.connect((url: string, pages: number) => {
                    pdfUrl = url;
                    numPages = pages;
                    isLoading = false;
                });
            }

            if (bridge.translationReady) {
                bridge.translationReady.connect(
                    (_original: string, translated: string) => {
                        translation = translated;
                    },
                );
            }

            if (bridge.errorOccurred) {
                bridge.errorOccurred.connect((message: string) => {
                    console.error("Backend error:", message);
                    isLoading = false;
                    showError("Erro do backend: " + message);
                });
            }
        }
    });

    async function handleOpenFile() {
        const bridge = $bridgeStore;
        if (!bridge) {
            showError("Backend não conectado.");
            return;
        }

        const path = await bridge.openFileDialog();
        if (!path) return;

        isLoading = true;
        const newBook = await bridge.addBook(path);
        if (newBook) {
            currentBookId = newBook.id;
            await refreshLibrary();
        }
        bridge.loadPdf(path);
    }

    async function handleRemoveBook(id: string, event: MouseEvent) {
        event.stopPropagation();
        const bridge = $bridgeStore;
        if (!bridge) return;

        if (confirm("Deseja realmente remover este livro da biblioteca?")) {
            await bridge.removeBook(id);
            await refreshLibrary();
        }
    }

    async function handleOpenBook(book: Book) {
        const bridge = $bridgeStore;
        if (!bridge) return;

        if (!book.isValid) {
            showError(`O arquivo não foi encontrado em: ${book.path}`);
            return;
        }

        currentBookId = book.id;
        isLoading = true;
        bridge.loadPdf(book.path);
    }

    async function handleRenderComplete(canvas: HTMLCanvasElement) {
        if (currentBookId && currentPage === 1) {
            const bridge = $bridgeStore;
            if (!bridge) return;

            const book = books.find((b) => b.id === currentBookId);
            if (book && !book.cover) {
                const thumbnailCanvas = document.createElement("canvas");
                const ctx = thumbnailCanvas.getContext("2d");
                const MAX_WIDTH = 300;
                const ratio = MAX_WIDTH / canvas.width;
                thumbnailCanvas.width = MAX_WIDTH;
                thumbnailCanvas.height = canvas.height * ratio;

                ctx?.drawImage(
                    canvas,
                    0,
                    0,
                    thumbnailCanvas.width,
                    thumbnailCanvas.height,
                );
                const coverBase64 = thumbnailCanvas.toDataURL(
                    "image/jpeg",
                    0.8,
                );

                await bridge.updateBookCover(currentBookId, coverBase64);
                await refreshLibrary();
            }
        }
    }

    function handleSelection({ text, rect }: { text: string; rect: DOMRect }) {
        selectedText = text;
        selectionPos = {
            x: rect.left + rect.width / 2,
            y: rect.bottom + window.scrollY,
        };
        isPopoverOpen = true;
        translation = "";

        if ($bridgeStore) {
            $bridgeStore.translate(text, "pt");
        }
    }
</script>

<div class="flex h-screen w-full overflow-hidden bg-background text-foreground">
    <!-- Sidebar (Auto-imported) -->
    <Sidebar onOpenFile={handleOpenFile} />

    <!-- Main Content Area -->
    <main class="flex flex-1 flex-col overflow-hidden">
        <!-- TopBar (Auto-imported) -->
        <TopBar />

        <!-- Dynamic Viewport -->
        <div class="flex-1 overflow-hidden relative">
            {#if pdfUrl}
                <!-- PDF Viewer Header (Sub-header) -->
                <div
                    class="flex h-12 items-center justify-between border-b bg-muted/30 px-4"
                >
                    <div class="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onclick={() => (pdfUrl = "")}
                            class="gap-2"
                        >
                            <ChevronLeft size={16} />
                            Back to Library
                        </Button>
                        <div class="h-4 w-[1px] bg-border"></div>
                        <!-- PageNav (Auto-imported) -->
                        <PageNav bind:currentPage {numPages} />
                    </div>

                    <div class="flex items-center gap-4">
                        <select
                            bind:value={scale}
                            class="h-8 w-24 rounded-md border bg-background px-2 text-xs focus:ring-1 focus:ring-ring"
                        >
                            <option value={0.5}>50%</option>
                            <option value={0.75}>75%</option>
                            <option value={1.0}>100%</option>
                            <option value={1.5}>150%</option>
                            <option value={2.0}>200%</option>
                        </select>
                    </div>
                </div>

                <!-- Reader Surface -->
                <div
                    class="h-[calc(100%-3rem)] overflow-auto bg-neutral-100 dark:bg-neutral-900/50"
                >
                    <!-- PdfViewer (Auto-imported) -->
                    <PdfViewer
                        {pdfUrl}
                        bind:scale
                        bind:currentPage
                        bind:numPages
                        onselection={handleSelection}
                        onrendercomplete={handleRenderComplete}
                    />
                </div>
            {:else}
                <!-- Library View -->
                <div class="h-full overflow-auto p-8">
                    <div class="mx-auto max-w-6xl">
                        <header class="mb-10 flex items-end justify-between">
                            <div>
                                <h2 class="text-3xl font-bold tracking-tight">
                                    Your Library
                                </h2>
                                <p class="text-muted-foreground">
                                    Manage and read your PDF documents.
                                </p>
                            </div>
                            <Badge
                                variant={$bridgeStore ? "default" : "secondary"}
                                class="mb-1"
                            >
                                {$bridgeStore
                                    ? "Native Bridge Active"
                                    : "Bridge Offline"}
                            </Badge>
                        </header>

                        {#if isLoading && books.length === 0}
                            <div
                                class="flex h-64 flex-col items-center justify-center gap-4"
                            >
                                <Loader2
                                    class="animate-spin text-primary"
                                    size={40}
                                />
                                <p class="text-muted-foreground">
                                    Initializing library...
                                </p>
                            </div>
                        {:else}
                            <div
                                class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                            >
                                {#each books as book (book.id)}
                                    <button
                                        class="group relative text-left transition-all hover:scale-[1.02]"
                                        onclick={() => handleOpenBook(book)}
                                    >
                                        <!-- Card components (Auto-imported) -->
                                        <Card
                                            class="overflow-hidden border-muted transition-colors hover:border-primary/50 {book.isValid
                                                ? ''
                                                : 'opacity-60'}"
                                        >
                                            <div
                                                class="relative aspect-[3/4] overflow-hidden bg-muted"
                                            >
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    class="absolute right-2 top-2 z-20 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                                                    onclick={(e) =>
                                                        handleRemoveBook(
                                                            book.id,
                                                            e,
                                                        )}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>

                                                {#if book.cover}
                                                    <img
                                                        src={book.cover}
                                                        alt={book.title}
                                                        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    />
                                                {:else}
                                                    <div
                                                        class="flex h-full w-full items-center justify-center p-12 text-muted-foreground/20"
                                                    >
                                                        <FileWarning
                                                            size={64}
                                                            strokeWidth={1}
                                                        />
                                                    </div>
                                                {/if}

                                                {#if !book.isValid}
                                                    <div
                                                        class="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[2px]"
                                                    >
                                                        <Badge
                                                            variant="destructive"
                                                            >File Missing</Badge
                                                        >
                                                    </div>
                                                {/if}
                                            </div>
                                            <CardHeader class="p-4">
                                                <CardTitle
                                                    class="line-clamp-2 h-10 text-sm font-semibold leading-tight"
                                                >
                                                    {book.title}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent class="px-4 pb-4 pt-0">
                                                <p
                                                    class="truncate text-[10px] text-muted-foreground"
                                                    title={book.path}
                                                >
                                                    {book.path}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </button>
                                {/each}
                            </div>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    </main>

    <!-- Popover for Translation -->
    {#if isPopoverOpen}
        <div
            class="pointer-events-none absolute z-50"
            style="left: {selectionPos.x}px; top: {selectionPos.y}px;"
        >
            <div class="pointer-events-auto mt-2 -translate-x-1/2">
                <Card
                    class="w-80 border-primary/20 shadow-2xl backdrop-blur-md"
                >
                    <CardHeader
                        class="flex flex-row items-center justify-between p-3 pb-0"
                    >
                        <span
                            class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                            >Translation</span
                        >
                        <Button
                            variant="ghost"
                            size="sm"
                            class="h-6 w-6 p-0"
                            onclick={() => (isPopoverOpen = false)}
                        >
                            <span class="sr-only">Close</span>
                            ×
                        </Button>
                    </CardHeader>
                    <CardContent class="p-3 pt-2">
                        {#if translation}
                            <p class="text-sm leading-relaxed">{translation}</p>
                        {:else}
                            <div
                                class="flex items-center gap-2 text-muted-foreground"
                            >
                                <Loader2 class="h-3 w-3 animate-spin" />
                                <span class="text-xs">Translating...</span>
                            </div>
                        {/if}
                        <div
                            class="mt-2 truncate text-[10px] italic text-muted-foreground opacity-40"
                        >
                            "{selectedText}"
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    {/if}

    <!-- Error Toast -->
    {#if errorMessage}
        <div
            class="fixed bottom-6 left-1/2 z-[100] w-full max-w-md -translate-x-1/2 px-4"
        >
            <div
                class="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive shadow-lg backdrop-blur-sm"
            >
                <FileWarning size={18} />
                <span class="flex-1 font-medium">{errorMessage}</span>
                <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => (errorMessage = "")}
                    class="h-8 w-8 p-0 hover:bg-destructive/20"
                >
                    ×
                </Button>
            </div>
        </div>
    {/if}
</div>
