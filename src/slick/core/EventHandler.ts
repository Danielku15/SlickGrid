import { Event, EventListener } from './Event'

export interface EventHandlerItem {
    event: Event,
    handler: EventListener
}

export class EventHandler {
    private _handlers: EventHandlerItem[] = [];

    public subscribe(event: Event, handler: EventListener): EventHandler {
        this._handlers.push({
            event: event,
            handler: handler
        });
        event.subscribe(handler);

        return this;  // allow chaining
    }

    public unsubscribe(event: Event, handler: EventListener): EventHandler {
        var i = this._handlers.length;
        while (i--) {
            if (this._handlers[i].event === event &&
                this._handlers[i].handler === handler) {
                this._handlers.splice(i, 1);
                event.unsubscribe(handler);
                return this;
            }
        }

        return this;  // allow chaining
    };

    public unsubscribeAll(): EventHandler {
        var i = this._handlers.length;
        while (i--) {
            this._handlers[i].event.unsubscribe(this._handlers[i].handler);
        }
        this._handlers = [];

        return this;  // allow chaining
    }
}