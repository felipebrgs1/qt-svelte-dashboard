<script lang="ts">
    import { ChevronLeft, ChevronRight } from "lucide-svelte";

    let { currentPage = $bindable(1), numPages = 0 } = $props();

    function nextPage() {
        if (currentPage < numPages) currentPage++;
    }

    function prevPage() {
        if (currentPage > 1) currentPage--;
    }
</script>

<div class="flex items-center gap-2">
    <Button
        variant="outline"
        size="icon"
        class="h-8 w-8"
        onclick={prevPage}
        disabled={currentPage <= 1}
    >
        <ChevronLeft class="h-4 w-4" />
    </Button>
    <div class="flex items-center gap-1 text-sm font-medium">
        <input
            type="number"
            bind:value={currentPage}
            min="1"
            max={numPages}
            class="w-12 h-8 px-1 text-center bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <span class="text-muted-foreground">/ {numPages}</span>
    </div>
    <Button
        variant="outline"
        size="icon"
        class="h-8 w-8"
        onclick={nextPage}
        disabled={currentPage >= numPages}
    >
        <ChevronRight class="h-4 w-4" />
    </Button>
</div>
