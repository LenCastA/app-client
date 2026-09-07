import { onUnmounted } from 'vue'
import CoreWorker from '@/assets/workers/core?worker'
import type {
  ScheduleGenerationResult,
  ScheduleWorkerInput,
  ScheduleWorkerResponse,
} from '~/interfaces/schedule-worker'

export const useSchedulesGenerator = () => {
  let cancelPending: ((reason: string) => void) | undefined

  const cancelGeneration = () => {
    cancelPending?.('Generación cancelada.')
  }
  onUnmounted(cancelGeneration)

  const loadSchedules = (
    ...input: ScheduleWorkerInput
  ): Promise<ScheduleGenerationResult> => {
    cancelGeneration()
    return new Promise((resolve, reject) => {
      let worker: Worker
      try {
        worker = new CoreWorker()
      } catch {
        reject(
          new Error(
            'No se pudo iniciar el generador en este navegador. Recarga la página e inténtalo nuevamente.',
          ),
        )
        return
      }
      const cleanup = () => {
        clearTimeout(timeout)
        worker.removeEventListener('message', onMessage)
        worker.removeEventListener('error', onError)
        worker.removeEventListener('messageerror', onMessageError)
        worker.terminate()
        cancelPending = undefined
      }
      const fail = (reason: string) => {
        cleanup()
        reject(new Error(reason))
      }
      const onMessage = (event: MessageEvent<ScheduleWorkerResponse>) => {
        const response = event.data
        if (!response) {
          fail('El generador devolvió una respuesta vacía.')
        } else if ('error' in response) {
          fail(response.error)
        } else {
          cleanup()
          resolve(response.result)
        }
      }
      const onError = (event: ErrorEvent) => {
        event.preventDefault()
        fail(event.message || 'El generador falló. Inténtalo nuevamente.')
      }
      const onMessageError = () =>
        fail('No se pudo leer el resultado de la generación.')
      const timeout = setTimeout(
        () =>
          fail(
            'La generación superó los 2 minutos. Reduce las secciones seleccionadas e inténtalo nuevamente.',
          ),
        120_000,
      )
      cancelPending = fail
      worker.addEventListener('message', onMessage)
      worker.addEventListener('error', onError)
      worker.addEventListener('messageerror', onMessageError)
      try {
        // Pinia inputs can contain nested Vue proxies; serialize only the small input.
        worker.postMessage(JSON.stringify(input))
      } catch {
        fail('No se pudieron enviar los cursos al generador.')
      }
    })
  }

  return { loadSchedules, cancelGeneration }
}
