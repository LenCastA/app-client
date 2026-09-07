import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import CoreWorker from '@/assets/workers/core?worker'
import { useSchedulesGenerator } from '../schedules'

vi.mock('@/assets/workers/core?worker', () => ({ default: vi.fn() }))

class FakeWorker extends EventTarget {
  postMessage = vi.fn()
  terminate = vi.fn()
  override removeEventListener = vi.fn(super.removeEventListener)
}
let worker: FakeWorker
const result = { occurrences: [], combinations: [] }
const create = () =>
  mount(defineComponent({ setup: useSchedulesGenerator, template: '<div />' }))

beforeEach(() => {
  vi.clearAllMocks()
  worker = new FakeWorker()
  vi.mocked(CoreWorker).mockImplementation(function () {
    return worker as unknown as Worker
  })
})
afterEach(() => vi.useRealTimers())

describe('useSchedulesGenerator', () => {
  it('serializes inputs and releases the worker and listeners after success', async () => {
    const wrapper = create()
    const pending = wrapper.vm.loadSchedules([], [], { crossingHours: 1.5 })
    expect(JSON.parse(worker.postMessage.mock.calls[0]![0])).toEqual([
      [],
      [],
      { crossingHours: 1.5 },
    ])
    worker.dispatchEvent(new MessageEvent('message', { data: { result } }))
    await expect(pending).resolves.toEqual(result)
    expect(worker.terminate).toHaveBeenCalledOnce()
    expect(worker.removeEventListener).toHaveBeenCalledTimes(3)
    wrapper.unmount()
  })

  it.each(['error', 'messageerror', 'reported'])(
    'rejects %s without rerunning work on the UI thread',
    async (kind) => {
      const wrapper = create()
      const pending = wrapper.vm.loadSchedules([], [], {})
      const assertion = expect(pending).rejects.toThrow()
      worker.dispatchEvent(
        kind === 'reported'
          ? new MessageEvent('message', {
              data: { error: 'Invalid schedule time' },
            })
          : kind === 'error'
            ? new ErrorEvent('error', { message: 'Worker failed' })
            : new MessageEvent('messageerror'),
      )
      await assertion
      expect(worker.terminate).toHaveBeenCalledOnce()
      wrapper.unmount()
    },
  )

  it('rejects worker startup failures', async () => {
    vi.mocked(CoreWorker).mockImplementation(() => {
      throw new Error('Unavailable')
    })
    const wrapper = create()
    await expect(wrapper.vm.loadSchedules([], [], {})).rejects.toThrow(
      'No se pudo iniciar',
    )
    wrapper.unmount()
  })

  it('cancels a job and permits another generation', async () => {
    const wrapper = create()
    const pending = wrapper.vm.loadSchedules([], [], {})
    const assertion = expect(pending).rejects.toThrow('cancelada')
    wrapper.vm.cancelGeneration()
    await assertion
    const next = wrapper.vm.loadSchedules([], [], {})
    worker.dispatchEvent(new MessageEvent('message', { data: { result } }))
    await expect(next).resolves.toEqual(result)
    wrapper.unmount()
  })

  it('rejects pending work on unmount', async () => {
    const wrapper = create()
    const assertion = expect(
      wrapper.vm.loadSchedules([], [], {}),
    ).rejects.toThrow('cancelada')
    wrapper.unmount()
    await assertion
  })

  it('settles jobs that never send a response', async () => {
    vi.useFakeTimers()
    const wrapper = create()
    const assertion = expect(
      wrapper.vm.loadSchedules([], [], {}),
    ).rejects.toThrow('2 minutos')
    await vi.advanceTimersByTimeAsync(120_000)
    await assertion
    expect(worker.terminate).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('rejects serialization failures and releases the worker', async () => {
    worker.postMessage.mockImplementation(() => {
      throw new Error('DataCloneError')
    })
    const wrapper = create()
    await expect(wrapper.vm.loadSchedules([], [], {})).rejects.toThrow(
      'enviar los cursos',
    )
    expect(worker.terminate).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('cancels the previous request before starting a replacement', async () => {
    const wrapper = create()
    const assertion = expect(
      wrapper.vm.loadSchedules([], [], {}),
    ).rejects.toThrow('cancelada')
    const next = wrapper.vm.loadSchedules([], [], {})
    await assertion
    worker.dispatchEvent(new MessageEvent('message', { data: { result } }))
    await expect(next).resolves.toEqual(result)
    wrapper.unmount()
  })
})
