import { ref } from 'vue'
import { streamChat } from '@/api/streamChat'

// 用于写入流式消息内容的接口
type PendingWriter = {
  appendDelta: (delta: string) => void // 追加流式响应内容
  finish: (fullText: string) => void // 流式响应结束时调用
}

// useSessionStreamSender 选项参数类型
type UseSessionStreamSenderOptions = {
  sessionModel: 0 | 1 | 2 // 会话模型类型
  getActiveSessionId: () => number | null // 获取当前会话ID
  createPending: (text: string, sessionId: number) => PendingWriter // 生成待发送消息的写入器
  syncAfterDone?: (sessionId: number) => Promise<void> // 可选，消息发送完触发同步
  onError?: (message: string) => void // 可选，错误时回调
}

// 用于发送聊天流式消息的逻辑复用 Hook
export function useSessionStreamSender(options: UseSessionStreamSenderOptions) {
  // 标记当前是否处于发送中
  const sending = ref(false)
  // 记录当前会话的流请求代号，自增用于中止控制
  const streamEpoch = ref(0)

  // 停止当前激活的流（通过自增 epoch，让未来的流回调失效）
  const stopActiveStream = () => {
    streamEpoch.value += 1
    sending.value = false
  }

  // 发送流式请求
  const send = async (text: string) => {
    const sessionId = options.getActiveSessionId()
    // 未选中会话或已有请求在发送中，直接返回
    if (!sessionId || sending.value) {
      return
    }

    // 标记当前请求的 epoch，确保流回调只响应最新的请求
    const requestEpoch = streamEpoch.value + 1
    streamEpoch.value = requestEpoch
    sending.value = true

    // 创建“占位消息”写入控制器
    const pending = options.createPending(text, sessionId)

    try {
      await streamChat({
        sessionId,
        sessionModel: options.sessionModel,
        requestText: text,
        onEvent: (event) => {
          // 非本轮请求或会话已变化时跳过，防止旧流回调串写
          if (requestEpoch !== streamEpoch.value || options.getActiveSessionId() !== sessionId) {
            return
          }
          if (event.type === 'delta') {
            pending.appendDelta(event.text || '')
          }
          if (event.type === 'done') {
            pending.finish(event.response_text || '')
          }
          if (event.type === 'error') {
            options.onError?.(event.message || '流式请求失败')
          }
        }
      })
    } catch (error) {
      const err = error as Error
      // 只处理本轮请求的错误
      if (requestEpoch === streamEpoch.value) {
        options.onError?.(err.message || '流式请求失败')
      }
    } finally {
      // 不是当前流，直接返回避免重入
      if (requestEpoch !== streamEpoch.value) {
        return
      }
      sending.value = false
      // 当前会话仍是原会话，且定义了同步方法时，完成后同步对话
      if (options.getActiveSessionId() === sessionId && options.syncAfterDone) {
        await options.syncAfterDone(sessionId)
      }
    }
  }

  // 导出 sending 标记、停止流和发送主逻辑
  return {
    sending,
    stopActiveStream,
    send
  }
}
