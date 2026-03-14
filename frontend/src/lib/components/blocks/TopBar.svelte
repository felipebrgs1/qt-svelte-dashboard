<script lang="ts">
    import { Search, Sun, Moon } from "lucide-svelte";
    import { theme } from "@/lib/state/theme.svelte";
    import { cn } from "@/lib/utils";

    interface Props {
        class?: string;
    }

    let { class: className }: Props = $props();

    // [INFLECTION POINT]: Search Logic
    // Context: Search is kept local for now.
    // Next Step: If we implement global PDF content search, move this state to a bridge-connected store.
    let searchQuery = $state("");
</script>

<header
    class={cn(
        "flex h-16 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className,
    )}
>
    <!-- Search Bar (Middle) -->
    <div class="flex flex-1 items-center justify-center">
        <div class="relative w-full max-w-md">
            <Search
                class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
                type="text"
                placeholder="Search documents..."
                bind:value={searchQuery}
                class="h-10 w-full rounded-full border border-input bg-muted/50 pl-10 pr-4 text-sm ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
        </div>
    </div>

    <!-- Actions (Right) -->
    <div class="flex items-center gap-2">
        <Button
            variant="ghost"
            size="icon"
            onclick={() => theme.toggle()}
            class="rounded-full"
            aria-label="Toggle theme"
        >
            {#if theme.mode === "dark"}
                <Moon size={20} class="transition-all hover:text-primary" />
            {:else}
                <Sun size={20} class="transition-all hover:text-primary" />
            {/if}
        </Button>

        <div class="h-8 w-[1px] bg-border mx-2"></div>

        <!-- Generic User Placeholder -->
        <div
            class="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground font-medium text-xs"
        >
            FB
        </div>
    </div>
</header>
