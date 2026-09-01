<template>
  <v-dialog v-model="dialog" max-width="560">
    <template #activator="{ props: activatorProps }">
      <v-btn
        v-bind="activatorProps"
        color="primary"
        variant="tonal"
        :prepend-icon="mdiFileUploadOutline"
      >
        Subir boleta
      </v-btn>
    </template>

    <v-card title="Subir boleta de matrícula">
      <v-card-text>
        <p class="mb-4">
          Leeremos únicamente los códigos de curso y sus secciones. El PDF se
          procesa en este dispositivo y no se envía al servidor.
        </p>
        <v-file-input
          v-model="file"
          accept="application/pdf,.pdf"
          label="Boleta de matrícula (PDF)"
          :prepend-icon="mdiFilePdfBox"
          :disabled="loading"
          :error-messages="error"
          show-size
          clearable
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn :disabled="loading" @click="close">Cancelar</v-btn>
        <v-btn
          color="primary"
          :loading="loading"
          :disabled="!file"
          @click="readFile"
        >
          Revisar cursos
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { mdiFilePdfBox, mdiFileUploadOutline } from '@mdi/js'
import { readEnrollmentSlipPdf } from '~/utils/enrollment-slip'
import type { EnrollmentSlipEntry } from '~/utils/enrollment-slip'

const emit = defineEmits<{
  parsed: [entries: EnrollmentSlipEntry[]]
}>()

const dialog = ref(false)
const file = shallowRef<File>()
const loading = ref(false)
const error = ref<string>()

const close = () => {
  dialog.value = false
  file.value = undefined
  error.value = undefined
}

const readFile = async () => {
  const selectedFile = file.value
  if (!selectedFile) return
  if (selectedFile.size > 10 * 1024 * 1024) {
    error.value = 'El PDF no debe superar los 10 MB.'
    return
  }

  loading.value = true
  error.value = undefined
  try {
    const entries = await readEnrollmentSlipPdf(selectedFile)
    emit('parsed', entries)
    close()
  } catch (cause) {
    error.value =
      cause instanceof Error
        ? cause.message
        : 'No se pudo leer la boleta seleccionada.'
  } finally {
    loading.value = false
  }
}
</script>
