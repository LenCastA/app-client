<template>
  <div class="d-flex align-center justify-center ga-1 flex-nowrap">
    <v-tooltip location="bottom">
      <template #activator="{ props }">
        <v-btn
          color="blue"
          variant="text"
          rounded="full"
          size="small"
          :icon="mdiPencil"
          aria-label="Modificar secciones"
          v-bind="props"
          @click="emit('click:edit', $event)"
        />
      </template>
      <span>Modificar secciones</span>
    </v-tooltip>
    <v-tooltip location="bottom">
      <template #activator="{ props }">
        <v-btn
          color="red"
          variant="text"
          rounded="full"
          size="small"
          :icon="mdiDelete"
          aria-label="Eliminar curso"
          v-bind="props"
          @click="emit('click:delete', $event)"
        />
      </template>
      <span>Eliminar</span>
    </v-tooltip>
  </div>
</template>

<script setup lang="ts">
import { mdiPencil, mdiDelete } from '@mdi/js'

const emit = defineEmits<{
  (type: 'click:edit' | 'click:delete', item: MouseEvent): void
}>()
</script>
