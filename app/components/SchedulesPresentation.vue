<template>
  <v-card>
    <v-toolbar flat theme="dark" :color="color" class="px-2">
      <slot name="top-items-right" />
      <v-spacer />
      <ScheduleMode v-model:mode="mode" />
      <v-spacer />
      <slot name="top-items-left" :item="currentSchedule" />
    </v-toolbar>

    <div class="schedule-controls">
      <slot name="subtitle" :item="currentSchedule">
        <div class="schedule-primary-actions">
          <slot name="subtitle-items" :item="currentSchedule" />
        </div>
        <div
          v-if="schedules.length > 0 && currentSchedule"
          class="schedule-sharing-actions"
        >
          <ScheduleActionsBar
            :current-schedule="currentSchedule"
            :mode="mode"
            :path="path"
          />
        </div>
      </slot>
    </div>

    <div v-if="$slots.summary" class="schedule-summary">
      <slot name="summary" :item="currentSchedule" />
    </div>

    <v-divider />
    <schedules-list
      v-if="schedules.length > 0"
      v-model:current-schedule="currentSchedule"
      :schedules="schedules"
      :week-days="weekDays"
      :mode="mode"
    />
    <v-card-text v-else>
      <slot name="emptyBody">
        {{ emptyMessage }}
      </slot>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, shallowRef, watch, type PropType } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserPreferencesStore } from '~/stores/user-preferences'
import SchedulesList from '~/components/SchedulesWindow.vue'
import ScheduleActionsBar from '~/components/schedule/ActionsBar.vue'
import { ViewMode } from '~/models/ViewMode'
import type { IGeneratedSchedule } from '~/interfaces/schedule'
import ScheduleMode from './schedule/Mode.vue'

const props = defineProps({
  schedules: {
    type: Array as PropType<IGeneratedSchedule[]>,
    default: () => [],
  },
  path: {
    type: String,
    default: '/subject',
  },
  title: {
    type: String,
    default: '',
  },
  color: {
    type: String,
    default: 'primary',
  },
  emptyMessage: {
    type: String,
    default: '',
  },
  dialog: {
    type: Boolean,
    default: false,
  },
})

const store = useUserPreferencesStore()
const { weekDays } = storeToRefs(store)

const currentSchedule = shallowRef<IGeneratedSchedule>()
watch(
  () => props.schedules,
  (schedules) => {
    if (schedules.length === 0) currentSchedule.value = undefined
  },
)
const mode = ref(ViewMode.CALENDAR)
</script>

<style scoped>
.schedule-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 10px 16px;
}
.schedule-primary-actions,
.schedule-sharing-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.schedule-primary-actions {
  flex: 1 1 auto;
  min-width: 0;
}
.schedule-sharing-actions {
  margin-left: auto;
}
@media (max-width: 600px) {
  .schedule-sharing-actions {
    margin-left: 0;
  }
  .schedule-controls {
    padding: 12px;
  }
}
.schedule-summary {
  display: flex;
  justify-content: center;
  padding: 0 16px 10px;
}
</style>
