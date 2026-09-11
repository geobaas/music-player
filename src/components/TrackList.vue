<script setup lang="ts">
import { storeToRefs } from "pinia";
import { usePlayerStore } from "../stores/player";

const player = usePlayerStore();
const { playlists, activePlaylist, currentTrack, isPlaying, isLoading } = storeToRefs(player);

function onMoveTrack(trackId: string, event: Event) {
  const targetId = (event.target as HTMLSelectElement).value;
  if (!targetId || !activePlaylist.value) return;
  player.moveTrackToPlaylist(trackId, activePlaylist.value.id, targetId);
  (event.target as HTMLSelectElement).value = "";
}
</script>

<template>
  <section class="flex flex-1 flex-col overflow-hidden">
    <header class="flex items-center justify-between border-b border-white/5 px-8 py-6">
      <div>
        <p class="text-xs uppercase tracking-wider text-neutral-500">Lista</p>
        <h1 class="text-2xl font-bold text-neutral-50">{{ activePlaylist?.name ?? "Biblioteca" }}</h1>
      </div>
      <button
        @click="player.importTracks()"
        :disabled="isLoading"
        class="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
      >
        + Importar canciones
      </button>
    </header>

    <div class="flex-1 overflow-y-auto px-4 py-2">
      <div
        v-if="!activePlaylist || activePlaylist.tracks.length === 0"
        class="flex h-full flex-col items-center justify-center gap-2 text-neutral-500"
      >
        <p>Esta lista está vacía.</p>
        <button @click="player.importTracks()" class="text-sm text-emerald-400 hover:underline">
          Importar canciones
        </button>
      </div>

      <ul v-else class="divide-y divide-white/5">
        <li
          v-for="(track, index) in activePlaylist.tracks"
          :key="track.id"
          @dblclick="player.playTrack(track)"
          class="group flex items-center gap-4 rounded-md px-4 py-3 hover:bg-white/5"
          :class="{ 'bg-emerald-600/10': currentTrack?.id === track.id }"
        >
          <span class="w-6 text-right text-sm text-neutral-500 group-hover:hidden">{{ index + 1 }}</span>
          <button
            @click="player.playTrack(track)"
            class="hidden w-6 text-emerald-400 group-hover:block"
          >
            {{ currentTrack?.id === track.id && isPlaying ? "⏸" : "▶" }}
          </button>
          <span
            class="flex-1 truncate text-sm"
            :class="currentTrack?.id === track.id ? 'text-emerald-400' : 'text-neutral-200'"
          >
            {{ track.name }}
          </span>

          <select
            v-if="playlists.length > 1"
            @change="onMoveTrack(track.id, $event)"
            class="hidden shrink-0 rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-300 outline-none group-hover:block"
          >
            <option value="">Mover a...</option>
            <option
              v-for="p in playlists.filter((pl) => pl.id !== activePlaylist?.id)"
              :key="p.id"
              :value="p.id"
            >
              {{ p.name }}
            </option>
          </select>
        </li>
      </ul>
    </div>
  </section>
</template>
