import { EventEmitter } from 'events';
export interface MessageConfirmationConfig {
    maxRetries: number;
    retryDelay: number;
    confirmationTimeout: number;
}
export declare const DEFAULT_CONFIRMATION_CONFIG: MessageConfirmationConfig;
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
export declare class MessageConfirmationHandler extends EventEmitter {
    private pendingMessages;
    private confirmedMessages;
    private config;
    constructor(config?: MessageConfirmationConfig);
    /**
     * 发送消息（带确认机制）
     */
    sendMessageWithConfirmation(messageId: string, sessionId: string, agentId: string, content: string, sendFn: () => Promise<void>): Promise<MessageReceipt>;
    /**
     * 尝试发送消息
     */
    private attemptSend;
    /**
     * 重试发送
     */
    private retryMessage;
    /**
     * 确认超时处理
     */
    private onConfirmationTimeout;
    /**
     * 确认消息已接收
     */
    confirmMessageReceived(messageId: string): void;
    /**
     * 获取消息状态
     */
    getMessageStatus(messageId: string): MessageReceipt | undefined;
    /**
     * 获取待处理消息列表
     */
    getPendingMessages(sessionId?: string): PendingMessage[];
    /**
     * 获取失败消息列表
     */
    getFailedMessages(sessionId?: string): PendingMessage[];
    /**
     * 重试失败的消息
     */
    retryFailedMessage(messageId: string, sendFn: () => Promise<void>): Promise<MessageReceipt | undefined>;
    /**
     * 延迟函数
     */
    private delay;
    /**
     * 清理已确认的消息记录
     */
    cleanupConfirmedMessages(): void;
    /**
     * 完全清理
     */
    cleanup(): void;
}
export declare const messageConfirmationHandler: MessageConfirmationHandler;
//# sourceMappingURL=messageConfirmation.d.ts.map