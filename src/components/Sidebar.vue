<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";
import { usePlayerStore } from "../stores/player";

const player = usePlayerStore();
const { playlists, activePlaylistId } = storeToRefs(player);

const showNewPlaylistInput = ref(false);
const newPlaylistName = ref("");

function submitNewPlaylist() {
  if (newPlaylistName.value.trim()) {
    player.createPlaylist(newPlaylistName.value);
  }
  newPlaylistName.value = "";
  showNewPlaylistInput.value = false;
}
</script>

<template>
  <aside class="flex w-60 shrink-0 flex-col border-r border-white/5 bg-neutral-950/60 p-4">
    <h2 class="mb-4 px-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
      Tus listas
    </h2>

    <nav class="flex-1 space-y-1 overflow-y-auto">
      <button
        v-for="playlist in playlists"
        :key="playlist.id"
        @click="player.setActivePlaylist(playlist.id)"
        class="group flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition"
        :class="playlist.id === activePlaylistId
          ? 'bg-emerald-600/20 text-emerald-400'
          : 'text-neutral-300 hover:bg-white/5'"
      >
        <span class="truncate">{{ playlist.name }}</span>
        <span class="flex items-center gap-2">
          <span class="text-xs text-neutral-500">{{ playlist.tracks.length }}</span>
          <span
            v-if="playlist.id !== 'library'"
            @click.stop="player.deletePlaylist(playlist.id)"
            class="hidden text-neutral-500 hover:text-red-400 group-hover:inline"
          >
            ✕
          </span>
        </span>
      </button>
    </nav>

    <div class="mt-4 border-t border-white/5 pt-4">
      <div v-if="showNewPlaylistInput" class="space-y-2">
        <input
          v-model="newPlaylistName"
          @keyup.enter="submitNewPlaylist"
          @keyup.esc="showNewPlaylistInput = false"
          autofocus
          placeholder="Nombre de la lista"
          class="w-full rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 outline-none ring-1 ring-white/10 focus:ring-emerald-500"
        />
        <button
          @click="submitNewPlaylist"
          class="w-full rounded-md bg-emerald-600 py-1.5 text-xs font-medium hover:bg-emerald-500"
        >
          Crear
        </button>
      </div>
      <button
        v-else
        @click="showNewPlaylistInput = true"
        class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-neutral-400 hover:bg-white/5 hover:text-neutral-100"
      >
        <span class="text-lg leading-none">+</span> Nueva lista
      </button>
    </div>
  </aside>
</template>
