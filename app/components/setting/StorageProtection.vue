<template>
  <v-card class="pa-4 pa-md-6 rounded-xl border elevation-1" flat>
    <v-card-title class="text-h5 font-weight-bold px-0 pt-0 mb-1"
      >Almacenamiento local</v-card-title
    >
    <v-card-subtitle class="px-0 pb-4 text-body-1 text-medium-emphasis">
      Controla la protección de los datos guardados en este dispositivo.
    </v-card-subtitle>
    <v-card-text class="px-0 py-2">
      <v-chip :color="statusColor" variant="tonal" class="font-weight-medium">
        {{ statusLabel }}
      </v-chip>
      <p class="mt-3 text-body-2 text-medium-emphasis">
        La protección reduce el riesgo de que el navegador elimine
        automáticamente tus horarios y preferencias cuando necesite espacio. Aun
        así, puedes borrar los datos manualmente desde el navegador.
      </p>
      <v-alert v-if="requestFailed" class="mt-3" type="warning" variant="tonal">
        Chrome no concedió la protección por ahora. Puedes volver a intentarlo
        más adelante.
      </v-alert>
    </v-card-text>
    <v-card-actions class="px-0 pt-6 pb-0 justify-end">
      <v-btn
        :loading="status === StorageProtectionStatus.CHECKING"
        :prepend-icon="mdiRefresh"
        variant="text"
        class="text-none mr-2"
        @click="check"
      >
        Comprobar estado
      </v-btn>
      <v-btn
        v-if="status === StorageProtectionStatus.UNPROTECTED"
        color="primary"
        variant="flat"
        size="large"
        rounded="lg"
        class="font-weight-bold px-6 text-none"
        :loading="requesting"
        @click="request"
      >
        Activar protección
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { mdiRefresh } from '@mdi/js'
import { StorageProtectionStatus } from '~/models/StorageProtectionStatus'

const { status, requesting, requestFailed, check, request } =
  usePersistentStorage()

const statusLabel = computed(() => {
  switch (status.value) {
    case StorageProtectionStatus.PROTECTED:
      return 'Protegido'
    case StorageProtectionStatus.UNPROTECTED:
      return 'No protegido'
    case StorageProtectionStatus.UNSUPPORTED:
      return 'No compatible'
    default:
      return 'Comprobando…'
  }
})
const statusColor = computed(() => {
  if (status.value === StorageProtectionStatus.PROTECTED) return 'success'
  if (status.value === StorageProtectionStatus.UNPROTECTED) return 'warning'
  return 'default'
})

onMounted(check)
</script>
