/**
 * CarePrep Multi-Device Queue Synchronization Abstraction Layer
 *
 * Architectural Design:
 *   Patient Intake Terminal (Kiosk/Tablet)
 *            ↓ (Queue Events)
 *   QueueSyncService (IQueueSyncProvider)
 *            ↓
 *   Doctor Clinical Dashboard (Desktop/Workstation)
 *
 * Supports:
 * - LocalEventBusSyncProvider (Active by default via Web BroadcastChannel API for multi-tab sync)
 * - Future WebSocket / Socket.io sync provider interface
 * - Future Supabase Realtime / Cloud pub-sub provider interface
 */

export type QueueEventType = 
  | 'PATIENT_ENQUEUED'
  | 'CASE_UPDATED'
  | 'TRIAGE_ALERT'
  | 'DOCTOR_REVIEWED'
  | 'CASE_DISCHARGED';

export interface QueueEvent<T = any> {
  eventId: string;
  type: QueueEventType;
  caseId: string;
  patientId: string;
  patientName?: string;
  timestamp: string;
  payload?: T;
  source: 'PATIENT_KIOSK' | 'DOCTOR_CONSOLE' | 'SYSTEM_TRIAGE';
}

export interface QueueSyncStatus {
  providerName: 'LOCAL_BROADCAST_CHANNEL' | 'WEBSOCKET_PROXY' | 'SUPABASE_REALTIME';
  isConnected: boolean;
  channelName: string;
  totalEventsDispatched: number;
}

export type QueueEventCallback = (event: QueueEvent) => void;

export interface IQueueSyncProvider {
  getProviderName(): string;
  publishEvent(event: Omit<QueueEvent, 'eventId' | 'timestamp'>): Promise<boolean>;
  subscribe(callback: QueueEventCallback): () => void;
  getSyncStatus(): QueueSyncStatus;
}

/**
 * Default Local BroadcastChannel Synchronizer for Multi-Tab & Local Network Prototyping
 */
export class LocalBroadcastChannelSyncProvider implements IQueueSyncProvider {
  private channelName: string;
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: Set<QueueEventCallback> = new Set();
  private totalDispatched: number = 0;

  constructor(channelName: string = 'careprep_patient_queue_channel') {
    this.channelName = channelName;

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(this.channelName);
        this.broadcastChannel.onmessage = (event: MessageEvent<QueueEvent>) => {
          if (event.data && event.data.type) {
            this.notifyListeners(event.data);
          }
        };
      } catch (err) {
        console.warn('[QueueSync] BroadcastChannel initialization failed:', err);
      }
    }
  }

  public getProviderName(): string {
    return 'LOCAL_BROADCAST_CHANNEL';
  }

  public async publishEvent(eventData: Omit<QueueEvent, 'eventId' | 'timestamp'>): Promise<boolean> {
    const fullEvent: QueueEvent = {
      ...eventData,
      eventId: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString()
    };

    this.totalDispatched++;

    // 1. Notify local in-memory listeners
    this.notifyListeners(fullEvent);

    // 2. Broadcast to other tabs/windows if available
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(fullEvent);
      } catch (err) {
        console.warn('[QueueSync] Error broadcasting message:', err);
      }
    }

    return true;
  }

  public subscribe(callback: QueueEventCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public getSyncStatus(): QueueSyncStatus {
    return {
      providerName: 'LOCAL_BROADCAST_CHANNEL',
      isConnected: Boolean(this.broadcastChannel || typeof window !== 'undefined'),
      channelName: this.channelName,
      totalEventsDispatched: this.totalDispatched
    };
  }

  private notifyListeners(event: QueueEvent): void {
    this.listeners.forEach(cb => {
      try {
        cb(event);
      } catch (err) {
        console.warn('[QueueSync] Listener callback error:', err);
      }
    });
  }
}

export const queueSyncService = new LocalBroadcastChannelSyncProvider();
