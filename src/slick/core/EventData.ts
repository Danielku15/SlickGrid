/**
 * An event object for passing data to event handlers and letting them control propagation.
   <p>This is pretty much identical to how W3C and jQuery implement events.</p>
 */
export class EventData {
    private _isPropagationStopped = false;
    private _isImmediatePropagationStopped = false;

    /***
     * Stops event from propagating up the DOM tree.
     */
    public stopPropagation(): void {
        this._isPropagationStopped = true;
    }

    /***
     * Returns whether stopPropagation was called on this event object.
     */
    public isPropagationStopped(): boolean {
        return this._isPropagationStopped;
    }

    /***
     * Prevents the rest of the handlers from being executed.
     * @method stopImmediatePropagation
     */
    public stopImmediatePropagation(): void {
        this._isImmediatePropagationStopped = true;
    }

    /***
     * Returns whether stopImmediatePropagation was called on this event object.
     */
    public isImmediatePropagationStopped(): boolean {
        return this._isImmediatePropagationStopped;
    }
}