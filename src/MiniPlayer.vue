<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Play, Pause, SkipBack, SkipForward, X } from "lucide-vue-next";

interface MiniState {
  trackName: string;
  artist: string;
  cover: string;
  isPlaying: boolean;
  accentColor: string | null;
}

const state = ref<MiniState>({
  trackName: "Nada reproduciéndose",
  artist: "",
  cover: "",
  isPlaying: false,
  accentColor: null,
});

const progress = ref({ position: 0, duration: 0 });
const progressPercent = () =>
  progress.value.duration > 0 ? Math.min(100, (progress.value.position / progress.value.duration) * 100) : 0;

let unlistenState: UnlistenFn | undefined;
let unlistenProgress: UnlistenFn | undefined;

onMounted(async () => {
  unlistenState = await listen<MiniState>("player-state", ({ payload }) => {
    state.value = payload;
  });
  unlistenProgress = await listen<{ position: number; duration: number }>("player-progress", ({ payload }) => {
    progress.value = payload;
  });
  void emit("player-request-state");
});

onUnmounted(() => {
  unlistenState?.();
  unlistenProgress?.();
});

function control(action: "playPause" | "next" | "prev") {
  void emit("player-control", { action });
}

function closeMini() {
  void getCurrentWindow().hide();
}

const bgStyle = () =>
  state.value.accentColor
    ? { background: `linear-gradient(120deg, ${state.value.accentColor}40, #0a0a0a 75%)` }
    : {};
</script>

<template>
  <div
    data-tauri-drag-region
    class="relative flex h-screen w-screen cursor-default select-none items-center gap-2 overflow-hidden border border-white/10 bg-neutral-950 px-3 text-neutral-100"
    :style="bgStyle()"
  >
    <div class="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-neutral-700 bg-neutral-800">
      <img
        v-if="state.cover"
        :src="state.cover"
        alt=""
        class="h-full w-full animate-spin-slow object-cover"
        :style="{ animationPlayState: state.isPlaying ? 'running' : 'paused' }"
      />
      <div
        v-else
        class="flex h-full w-full animate-spin-slow items-center justify-center bg-gradient-to-br from-neutral-700 to-neutral-900"
        :style="{ animationPlayState: state.isPlaying ? 'running' : 'paused' }"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
      </div>
    </div>

    <div class="min-w-0 flex-1">
      <p class="truncate text-xs font-medium text-neutral-100">{{ state.trackName }}</p>
      <p v-if="state.artist" class="truncate text-[10px] text-neutral-400">{{ state.artist }}</p>
    </div>

    <div class="flex shrink-0 items-center gap-1.5">
      <button @click="control('prev')" class="text-neutral-300 hover:text-white">
        <SkipBack :size="14" :fill="'currentColor'" />
      </button>
      <button
        @click="control('playPause')"
        class="flex h-7 w-7 items-center justify-center rounded-full bg-white text-black"
      >
        <Pause v-if="state.isPlaying" :size="12" :fill="'currentColor'" />
        <Play v-else :size="12" :fill="'currentColor'" class="ml-0.5" />
      </button>
      <button @click="control('next')" class="text-neutral-300 hover:text-white">
        <SkipForward :size="14" :fill="'currentColor'" />
      </button>
    </div>

    <button @click="closeMini" class="shrink-0 text-neutral-500 hover:text-neutral-200">
      <X :size="14" />
    </button>

    <div class="absolute inset-x-0 bottom-0 h-[3px] bg-white/5">
      <div
        class="h-full transition-[width] duration-300"
        :style="{ width: progressPercent() + '%', background: state.accentColor || '#34d399' }"
      ></div>
    </div>
  </div>
</template>
