<template>
  <div class="subject-totals">
    <div v-if="$slots.actions" class="subject-totals__actions">
      <slot name="actions" />
    </div>
    <v-chip color="green" label> Total de créditos: {{ totalCredits }} </v-chip>
  </div>
</template>

<script setup lang="ts">
import type { ISubject } from '~/interfaces/subject'

const props = defineProps<{
  subjects: {
    subject: Pick<ISubject, 'credits'>
  }[]
}>()

const { subjects } = toRefs(props)

const totalCredits = computed(() => {
  return subjects.value.reduce((previousValue, currentValue) => {
    return currentValue.subject.credits + previousValue
  }, 0)
})
</script>

<style scoped>
.subject-totals {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 12px 16px;
}
.subject-totals__actions {
  margin-right: auto;
}
</style>
