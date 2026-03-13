<script lang="ts">
    import { onMount } from 'svelte';
    import { dashboard } from './lib/ws';
    import * as Card from '@/lib/components/ui/card';
    import { Badge } from '@/lib/components/ui/badge';

    onMount(() => dashboard.connect());

    // Keep last 30 readings for the sparkline
    let history = $state<number[]>([]);

    $effect(() => {
        if ($dashboard) {
            history = [...history.slice(-29), $dashboard.temperature];
        }
    });
</script>

<main class="max-w-225 mx-auto p-8">
    <header class="flex items-center gap-4 mb-8">
        <h1 class="text-2xl font-semibold tracking-tight"
            >Qt + Svelte Dashboard</h1
        >
        <Badge
            variant={$dashboard ? 'default' : 'secondary'}
            class={$dashboard
                ? 'bg-green-900/30 text-green-400 border-green-900/50 hover:bg-green-900/40'
                : ''}
        >
            {$dashboard ? 'online' : 'connecting…'}
        </Badge>
    </header>

    {#if $dashboard}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card.Root>
                <Card.Header class="pb-2">
                    <Card.Title
                        class="text-xs font-medium text-muted-foreground uppercase tracking-wider"
                        >Temperature</Card.Title
                    >
                </Card.Header>
                <Card.Content>
                    <div class="text-3xl font-bold">
                        {$dashboard.temperature.toFixed(1)}<span
                            class="text-lg font-normal text-muted-foreground ml-1"
                            >°C</span
                        >
                    </div>
                </Card.Content>
            </Card.Root>

            <Card.Root>
                <Card.Header class="pb-2">
                    <Card.Title
                        class="text-xs font-medium text-muted-foreground uppercase tracking-wider"
                        >Pressure</Card.Title
                    >
                </Card.Header>
                <Card.Content>
                    <div class="text-3xl font-bold">
                        {$dashboard.pressure.toFixed(3)}<span
                            class="text-lg font-normal text-muted-foreground ml-1"
                            >bar</span
                        >
                    </div>
                </Card.Content>
            </Card.Root>

            <Card.Root>
                <Card.Header class="pb-2">
                    <Card.Title
                        class="text-xs font-medium text-muted-foreground uppercase tracking-wider"
                        >RPM</Card.Title
                    >
                </Card.Header>
                <Card.Content>
                    <div class="text-3xl font-bold">
                        {$dashboard.rpm}<span
                            class="text-lg font-normal text-muted-foreground ml-1"
                            >rpm</span
                        >
                    </div>
                </Card.Content>
            </Card.Root>
        </div>

        <!-- SVG sparkline of the last 30 temperature readings -->
        <Card.Root class="w-full">
            <Card.Header class="pb-2">
                <Card.Title
                    class="text-xs font-medium text-muted-foreground uppercase tracking-wider"
                    >Temperature history</Card.Title
                >
            </Card.Header>
            <Card.Content>
                <div class="h-15 w-full mt-2">
                    <svg
                        viewBox="0 0 300 60"
                        preserveAspectRatio="none"
                        class="w-full h-full"
                    >
                        <polyline
                            points={history
                                .map(
                                    (v, i) =>
                                        `${(i / 29) * 300},${60 - ((v - 18) / 14) * 60}`,
                                )
                                .join(' ')}
                            fill="none"
                            stroke="currentColor"
                            class="text-primary"
                            stroke-width="2"
                            stroke-linejoin="round"
                        />
                    </svg>
                </div>
            </Card.Content>
        </Card.Root>
    {:else}
        <div class="mt-8 text-muted-foreground animate-pulse">
            Aguardando conexão com o backend Qt…
        </div>
    {/if}
</main>
