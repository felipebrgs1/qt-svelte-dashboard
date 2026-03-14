<script lang="ts">
    import { Library, History, Star, Plus, BookOpen } from "lucide-svelte";
    import * as Card from "@/lib/components/ui/card";
    import { cn } from "@/lib/utils";

    interface Props {
        class?: string;
        onOpenFile?: () => void;
    }

    let { class: className, onOpenFile }: Props = $props();

    // [INFLECTION POINT]: Sidebar State Management
    // Context: Using $state for navigation to allow future easy integration with a router.
    let activeTab = $state("library");

    const menuItems = [
        { id: "library", label: "Library", icon: Library },
        { id: "recent", label: "Recent", icon: History },
        { id: "favorites", label: "Favorites", icon: Star },
    ];
</script>

<aside
    class={cn(
        "flex h-full w-64 flex-col border-r bg-card/50 backdrop-blur-sm",
        className,
    )}
>
    <!-- Logo Section -->
    <div class="flex h-16 items-center px-6 border-b">
        <div class="flex items-center gap-3">
            <div
                class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            >
                <BookOpen size={20} />
            </div>
            <span class="text-lg font-bold tracking-tight">QtReader</span>
        </div>
    </div>

    <!-- Navigation Section -->
    <nav class="flex-1 space-y-2 p-4">
        <div class="px-2 py-2">
            <h2
                class="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
                Menu
            </h2>
            <div class="space-y-1">
                {#each menuItems as item}
                    <Button
                        variant={activeTab === item.id ? "secondary" : "ghost"}
                        class="w-full justify-start gap-3"
                        onclick={() => (activeTab = item.id)}
                    >
                        <item.icon size={18} />
                        {item.label}
                    </Button>
                {/each}
            </div>
        </div>

        <div class="px-2 py-2">
            <h2
                class="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
                Quick Actions
            </h2>
            <Button
                variant="outline"
                class="w-full justify-start gap-3 border-dashed"
                onclick={onOpenFile}
            >
                <Plus size={18} />
                Open PDF
            </Button>
        </div>
    </nav>

    <!-- Footer / Info Section -->
    <div class="p-4 mt-auto">
        <Card.Root class="bg-primary/5 border-primary/10">
            <Card.Content class="p-4">
                <p class="text-xs font-medium text-primary/80">
                    Powered by Qt 6 & Svelte 5
                </p>
            </Card.Content>
        </Card.Root>
    </div>
</aside>
