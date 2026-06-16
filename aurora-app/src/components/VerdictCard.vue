<script setup lang="ts">
import { computed } from 'vue'

import { LEVEL_COLOR } from '../lib/visibility'
import { SKY_DARKNESS_LABEL } from '../lib/solar'

import type { VisibilityVerdict } from '../lib/visibility'

const props = defineProps<{
  verdict: VisibilityVerdict
}>()

const accentColor = computed(() => LEVEL_COLOR[props.verdict.level])
const darknessLabel = computed(() => SKY_DARKNESS_LABEL[props.verdict.darkness])
</script>

<template>
  <section class="card verdict" :style="{ '--accent': accentColor }">
    <p class="verdict-question">今晚在赫尔辛基能看到极光吗？</p>
    <h2 class="verdict-title">{{ verdict.title }}</h2>
    <p class="verdict-darkness">当前天色：{{ darknessLabel }}</p>
    <ul class="verdict-reasons">
      <li v-for="reason in verdict.reasons" :key="reason">{{ reason }}</li>
    </ul>
  </section>
</template>

<style scoped>
.verdict {
  border-left: 4px solid var(--accent);
}
.verdict-question {
  margin: 0;
  color: var(--text-dim);
  font-size: 0.9rem;
}
.verdict-title {
  margin: 0.4rem 0;
  font-size: 1.8rem;
  color: var(--accent);
}
.verdict-darkness {
  margin: 0 0 0.6rem;
  color: var(--text-dim);
  font-size: 0.85rem;
}
.verdict-reasons {
  margin: 0;
  padding-left: 1.2rem;
  color: var(--text);
  font-size: 0.95rem;
  line-height: 1.7;
}
</style>
