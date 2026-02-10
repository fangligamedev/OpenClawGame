// server/src/utils/messageConfirmation.ts
// 消息发送确认和重试机制

import { EventEmitter } from 'events';
import { Message } from '../models/types';

export interface MessageConfirmationConfig {
  maxRetries: number;        // 最大重试次数
  retryDelay: number;        // 重试延迟（毫秒）
  confirmationTimeout: number; // 确认超时（毫秒）
}

// 默认配置
export const DEFAULT_CONFIRMATION_CONFIG: MessageConfirmationConfig = {
  maxRetries: 3,
  retryDelay: 1000,         // 1秒
  confirmationTimeout: 5000, // 5秒
};

export interface PendingMessage {
  messageId: string;
  sessionId: string;
  agentId: string;
  content: string;
  timestamp: number;
  status: 'pending' | 'sent' | 'confirmed' | 'failed';
  retryCount: number;
  confirmTimer?: NodeJS.Timeout;
}

export interface MessageReceipt {
  messageId: string;
  status: 'pending' | 'sent' | 'confirmed' | 'delivered' | 'failed';
  timestamp: number;
  retryCount: number;
}

export class MessageConfirmationHandler extends EventEmitter {
  private pendingMessages: Map<string, PendingMessage> = new Map();
  private confirmedMessages: Set<string> = new Set();
  private config: MessageConfirmationConfig;

  constructor(config: MessageConfirmationConfig = DEFAULT_CONFIRMATION_CONFIG) {
    super();
    this.config = config;
  }

  /**
   * 发送消息（带确认机制）
   */
  async sendMessageWithConfirmation(
    messageId: string,
    sessionId: string,
    agentId: string,
    content: string,
    sendFn: () => Promise<void>
  ): Promise<MessageReceipt> {
    const pendingMessage: PendingMessage = {
      messageId,
      sessionId,
      agentId,
      content,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
    };

    this.pendingMessages.set(messageId, pendingMessage);

    try {
      // 尝试发送
      await this.attemptSend(messageId, sendFn);
      
      // 设置确认超时定时器
      pendingMessage.confirmTimer = setTimeout(() => {
        this.onConfirmationTimeout(messageId, sendFn);
      }, this.config.confirmationTimeout);

      return {
        messageId,
        status: 'pending',
        timestamp: pendingMessage.timestamp,
        retryCount: 0,
      };
    } catch (error) {
      // 发送失败，进入重试
      return this.retryMessage(messageId, sendFn);
    }
  }

  /**
   * 尝试发送消息
   */
  private async attemptSend(
    messageId: string,
    sendFn: () => Promise<void>
  ): Promise<void> {
    const pendingMessage = this.pendingMessages.get(messageId);
    if (!pendingMessage) throw new Error('Message not found');

    try {
      await sendFn();
      pendingMessage.status = 'sent';
      
      console.log(`[MessageConfirmation] Message sent: ${messageId}`);
      this.emit('message-sent', messageId, pendingMessage);
    } catch (error) {
      console.error(`[MessageConfirmation] Send failed: ${messageId}`, error);
      throw error;
    }
  }

  /**
   * 重试发送
   */
  private async retryMessage(
    messageId: string,
    sendFn: () => Promise<void>
  ): Promise<MessageReceipt> {
    const pendingMessage = this.pendingMessages.get(messageId);
    if (!pendingMessage) {
      return {
        messageId,
        status: 'failed',
        timestamp: Date.now(),
        retryCount: 0,
      };
    }

    if (pendingMessage.retryCount >= this.config.maxRetries) {
      // 超过最大重试次数
      pendingMessage.status = 'failed';
      this.emit('message-failed', messageId, pendingMessage);
      
      return {
        messageId,
        status: 'failed',
        timestamp: Date.now(),
        retryCount: pendingMessage.retryCount,
      };
    }

    // 增加重试计数
    pendingMessage.retryCount++;
    
    // 延迟重试
    await this.delay(this.config.retryDelay * pendingMessage.retryCount);

    try {
      await this.attemptSend(messageId, sendFn);
      
      // 重新设置确认超时
      pendingMessage.confirmTimer = setTimeout(() => {
        this.onConfirmationTimeout(messageId, sendFn);
      }, this.config.confirmationTimeout);

      return {
        messageId,
        status: 'pending',
        timestamp: Date.now(),
        retryCount: pendingMessage.retryCount,
      };
    } catch (error) {
      // 继续重试
      return this.retryMessage(messageId, sendFn);
    }
  }

  /**
   * 确认超时处理
   */
  private onConfirmationTimeout(
    messageId: string,
    sendFn: () => Promise<void>
  ): void {
    const pendingMessage = this.pendingMessages.get(messageId);
    if (!pendingMessage) return;

    // 如果已经确认，不做处理
    if (pendingMessage.status === 'confirmed') return;

    console.log(`[MessageConfirmation] Confirmation timeout: ${messageId}`);
    
    // 尝试重试
    this.retryMessage(messageId, sendFn);
  }

  /**
   * 确认消息已接收
   */
  confirmMessageReceived(messageId: string): void {
    const pendingMessage = this.pendingMessages.get(messageId);
    if (!pendingMessage) return;

    // 清除确认超时定时器
    if (pendingMessage.confirmTimer) {
      clearTimeout(pendingMessage.confirmTimer);
    }

    // 更新状态
    pendingMessage.status = 'confirmed';
    this.confirmedMessages.add(messageId);

    console.log(`[MessageConfirmation] Message confirmed: ${messageId}`);
    this.emit('message-confirmed', messageId, pendingMessage);

    // 清理待处理消息（延迟清理，保留一段时间用于查询）
    setTimeout(() => {
      this.pendingMessages.delete(messageId);
    }, 60000); // 1分钟后清理
  }

  /**
   * 获取消息状态
   */
  getMessageStatus(messageId: string): MessageReceipt | undefined {
    const pendingMessage = this.pendingMessages.get(messageId);
    
    if (pendingMessage) {
      return {
        messageId,
        status: pendingMessage.status === 'confirmed' ? 'delivered' : pendingMessage.status,
        timestamp: pendingMessage.timestamp,
        retryCount: pendingMessage.retryCount,
      };
    }

    // 检查是否已确认（但已从待处理中清理）
    if (this.confirmedMessages.has(messageId)) {
      return {
        messageId,
        status: 'delivered',
        timestamp: Date.now(),
        retryCount: 0,
      };
    }

    return undefined;
  }

  /**
   * 获取待处理消息列表
   */
  getPendingMessages(sessionId?: string): PendingMessage[] {
    const messages: PendingMessage[] = [];
    
    this.pendingMessages.forEach((message) => {
      if (!sessionId || message.sessionId === sessionId) {
        if (message.status === 'pending' || message.status === 'sent') {
          messages.push(message);
        }
      }
    });
    
    return messages;
  }

  /**
   * 获取失败消息列表
   */
  getFailedMessages(sessionId?: string): PendingMessage[] {
    const messages: PendingMessage[] = [];
    
    this.pendingMessages.forEach((message) => {
      if (!sessionId || message.sessionId === sessionId) {
        if (message.status === 'failed') {
          messages.push(message);
        }
      }
    });
    
    return messages;
  }

  /**
   * 重试失败的消息
   */
  async retryFailedMessage(
    messageId: string,
    sendFn: () => Promise<void>
  ): Promise<MessageReceipt | undefined> {
    const pendingMessage = this.pendingMessages.get(messageId);
    if (!pendingMessage || pendingMessage.status !== 'failed') {
      return undefined;
    }

    // 重置状态
    pendingMessage.status = 'pending';
    pendingMessage.retryCount = 0;

    return this.sendMessageWithConfirmation(
      messageId,
      pendingMessage.sessionId,
      pendingMessage.agentId,
      pendingMessage.content,
      sendFn
    );
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 清理已确认的消息记录
   */
  cleanupConfirmedMessages(): void {
    this.confirmedMessages.clear();
    console.log('[MessageConfirmation] Confirmed messages cleaned up');
  }

  /**
   * 完全清理
   */
  cleanup(): void {
    this.pendingMessages.forEach((message) => {
      if (message.confirmTimer) {
        clearTimeout(message.confirmTimer);
      }
    });
    
    this.pendingMessages.clear();
    this.confirmedMessages.clear();
    
    console.log('[MessageConfirmation] All cleaned up');
  }
}

// 导出单例
export const messageConfirmationHandler = new MessageConfirmationHandler();
