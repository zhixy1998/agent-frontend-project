<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import MessageBubble from './MessageBubble.vue'
import type { UiMessage } from '@/types/chat'

const props = defineProps<{
  messages: UiMessage[]
  hasMore?: boolean
  loadingMore?: boolean
}>()

const emit = defineEmits<{
  loadMore: []
  openInterview: [interviewId: number]
}>()

const listRef = ref<HTMLElement | null>(null)
// 顶部加载更多时记录滚动位置，等数据插入后做高度补偿，避免列表“跳动”。
const pendingTopCompensation = ref<{ scrollTop: number; scrollHeight: number } | null>(null)
const requestedDuringLoading = ref(false)

const scrollToBottom = () => {
  if (!listRef.value) {
    return
  }
  listRef.value.scrollTop = listRef.value.scrollHeight
}

const onScroll = () => {
  if (!listRef.value) {
    return
  }
  if (!props.hasMore || props.loadingMore) {
    return
  }
  // 距离顶部 100px 触发上拉分页；loading 锁由 props.loadingMore 控制。
  if (listRef.value.scrollTop > 100 || requestedDuringLoading.value) {
    return
  }
  pendingTopCompensation.value = {
    scrollTop: listRef.value.scrollTop,
    scrollHeight: listRef.value.scrollHeight
  }
  requestedDuringLoading.value = true
  emit('loadMore')
}

watch(
  () => props.messages.length,
  async () => {
    if (props.loadingMore) {
      return
    }
    await nextTick()
    if (pendingTopCompensation.value && listRef.value) {
      const { scrollTop, scrollHeight } = pendingTopCompensation.value
      // 插入旧消息后恢复视觉位置：新高度 - 旧高度 = 需要补偿的偏移。
      const delta = listRef.value.scrollHeight - scrollHeight
      listRef.value.scrollTop = scrollTop + delta
      pendingTopCompensation.value = null
      requestedDuringLoading.value = false
      return
    }
    scrollToBottom()
  },
  { immediate: true }
)
</script>

<template>
  <section ref="listRef" class="message-list" @scroll="onScroll">
    <div class="message-list__inner">
      <p v-if="props.loadingMore" class="loading-hint">正在加载更多消息...</p>
      <MessageBubble
        v-for="message in props.messages"
        :key="message.id"
        :message="message"
        @open-interview="emit('openInterview', $event)"
      />
    </div>
  </section>
</template>

<style scoped lang="scss">
.message-list {
  flex: 1;
  overflow: auto;
  padding: 26px 24px 20px;
  background: #f0ece2;
}

.message-list__inner {
  width: min(1040px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: #7b8290;
}
</style>
