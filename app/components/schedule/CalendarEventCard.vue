<template>
  <v-sheet
    :color="event.color"
    class="calendar-event text-white"
    :title="event.title"
  >
    <template v-if="event.code">
      <div class="calendar-event__course">
        <strong>{{ event.code }} · {{ event.section }}</strong>
        — {{ event.courseName ?? event.name }}
      </div>
      <div v-if="event.teacherName" class="calendar-event__teacher">
        {{ event.teacherName }}
      </div>
    </template>
    <div v-else class="calendar-event__course calendar-event__activity">
      {{ event.title }}
    </div>
  </v-sheet>
</template>
<script setup lang="ts">
defineProps<{
  event: {
    color: string
    title: string
    code?: string
    section?: string
    type: string
    name: string
    courseName?: string
    teacherName?: string
  }
}>()
</script>
<style scoped>
.calendar-event {
  width: 100%;
  min-width: 0;
  height: 100%;
  padding: 2px 5px;
  border: 1px solid rgba(255, 255, 255, 0.65);
  border-radius: 5px;
  font-size: 0.8125rem;
  line-height: 1.15;
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
  container-type: size;
}
.calendar-event__course {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
  flex-shrink: 0;
}
.calendar-event__teacher {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}
.calendar-event__activity {
  font-weight: 600;
  -webkit-line-clamp: 2;
}
@container (min-height: 3rem) {
  .calendar-event__course {
    -webkit-line-clamp: 2;
  }
}
@container (min-height: 4rem) {
  .calendar-event__teacher {
    white-space: normal;
    overflow-wrap: anywhere;
  }
}
</style>
