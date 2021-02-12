import { EventData } from "./EventData";

export type EventListener = (e: EventData, args: unknown) => void;

/**
 * A simple publisher-subscriber implementation.
 */
export class Event {
    private _handlers: EventListener[] = [];

    /***
     * Adds an event handler to be called when the event is fired.
     * <p>Event handler will receive two arguments - an <code>EventData</code> and the <code>data</code>
     * object the event was fired with.<p>
     * @param fn Event handler.
     */
    public subscribe(fn: EventListener) {
        this._handlers.push(fn);
    }

    /***
     * Removes an event handler added with <code>subscribe(fn)</code>.
     * @method unsubscribe
     * @param fn Event handler to be removed.
     */
    public unsubscribe(fn?: EventListener) {
        for (var i = this._handlers.length - 1; i >= 0; i--) {
            if (this._handlers[i] === fn) {
                this._handlers.splice(i, 1);
            }
        }
    }

    /***
     * Fires an event notifying all subscribers.
     * @param args Additional data object to be passed to all handlers.
     * @param e An <code>EventData</code> object to be passed to all handlers.
     *      For DOM events, an existing W3C/jQuery event object can be passed in.
     * @param scope The scope ("this") within which the handler will be executed.
     *      If not specified, the scope will be set to the <code>Event</code> instance.
     */
    public notify(args: unknown, e: EventData = new EventData(), scope: unknown = this) {
        var returnValue;
        for (var i = 0; i < this._handlers.length && !(e.isPropagationStopped() || e.isImmediatePropagationStopped()); i++) {
            returnValue = this._handlers[i].call(scope, e, args);
        }
        return returnValue;
    }
}