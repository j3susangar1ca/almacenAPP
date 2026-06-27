import { EventEmitter } from 'events';

class EventBus extends EventEmitter {
  constructor() {
    super();
    // Allow high number of listeners
    this.setMaxListeners(50);
  }

  // Publish helper that guarantees asynchronous execution to prevent blocking main process
  publish(event: string, payload: any): void {
    console.log(`[EVENT-BUS] Publishing event: "${event}"`, JSON.stringify(payload));
    setImmediate(() => {
      this.emit(event, payload);
    });
  }
}

export const eventBus = new EventBus();

// Core Events list
export const EVENTS = {
  STOCK_BELOW_MINIMUM: 'StockBelowMinimum',
  TENDER_AWARDED: 'TenderAwarded',
  MENU_PUBLISHED: 'MenuPublished',
  PURCHASE_ORDER_CREATED: 'PurchaseOrderCreated'
};
