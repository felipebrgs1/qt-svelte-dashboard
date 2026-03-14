// [INFLECTION POINT]: Theme Management
// Context: Using Svelte 5 Runes ($state) for global reactive state.
// This allows theme synchronization across the entire application without using traditional stores.
// Next Step: If we add more global settings, consider merging into a 'settings.svelte.ts' class.

type Theme = "light" | "dark";

class ThemeState {
	#mode = $state<Theme>("dark");

	constructor() {
		// Initialize from localStorage or system preference if available
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("theme") as Theme;
			if (saved) {
				this.#mode = saved;
			} else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
				this.#mode = "light";
			}
			this.applyTheme();
		}
	}

	get mode() {
		return this.#mode;
	}

	set mode(value: Theme) {
		this.#mode = value;
		this.applyTheme();
	}

	toggle() {
		this.mode = this.#mode === "light" ? "dark" : "light";
	}

	private applyTheme() {
		if (typeof document === "undefined") return;

		const root = document.documentElement;
		if (this.#mode === "dark") {
			root.classList.add("dark");
		} else {
			root.classList.remove("dark");
		}
		localStorage.setItem("theme", this.#mode);
	}
}

export const theme = new ThemeState();
