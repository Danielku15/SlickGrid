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

type EventListener = (e: EventData, args: unknown) => void;

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
    public unsubscribe(fn: EventListener) {
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

interface EventHandlerItem {
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

/**
 * A structure containing a range of cells.
 */
export class Range {
    public fromRow: Number;
    public fromCell: Number;
    public toRow: Number;
    public toCell: Number;

    /**
     * @param fromRow Starting row.
     * @param fromCell Starting cell.
     * @param toRow Ending row.
     * @param toCell Ending cell.
     */
    public constructor(fromRow: number, fromCell: number, toRow: number = fromRow, toCell: number = fromCell) {
        this.fromRow = Math.min(fromRow, toRow);
        this.fromCell = Math.min(fromCell, toCell);
        this.toRow = Math.max(fromRow, toRow);
        this.toCell = Math.max(fromCell, toCell);
    }

    /***
     * Returns whether a range represents a single row.
     */
    public isSingleRow(): Boolean {
        return this.fromRow == this.toRow;
    }

    /***
     * Returns whether a range represents a single cell.
     */
    public isSingleCell(): Boolean {
        return this.fromRow == this.toRow && this.fromCell == this.toCell;
    }

    /***
     * Returns whether a range contains a given cell.
     */
    public contains(row: Number, cell: Number): Boolean {
        return row >= this.fromRow && row <= this.toRow &&
            cell >= this.fromCell && cell <= this.toCell;
    }

    /***
     * Returns a readable representation of a range.
     */
    public toString(): String {
        if (this.isSingleCell()) {
            return `(${this.fromRow}:${this.fromCell})`;
        }
        else {
            return `(${this.fromRow}:${this.fromCell} - ${this.toRow}:${this.toCell})`;
        }
    }
}

import * as polyfills from './polyfills'
export const Map = 'Map' in window ? window.Map : polyfills.Map;

/**
 * A base class that all special / non-data rows (like Group and GroupTotals) derive from.
 */
export class NonDataItem {
    public readonly __isNonDataRow: boolean = true;
}

/**
 * Information about a group of rows
 */
export class Group extends NonDataItem {
    public readonly __group: boolean = true;

    /**
     * Grouping level, starting with 0.
     */
    public level: number = 0;

    /***
     * Number of rows in the group.
     */
    public count: Number = 0;

    /***
     * Grouping value.
     */
    public value: unknown | null = null;

    /***
     * Formatted display value of the group.
     */
    public title: string | null = null;

    /***
     * Whether a group is collapsed.
     */
    public collapsed: boolean = false;

    /***
     * Whether a group selection checkbox is checked.
     */
    public selectChecked: boolean = false;

    /***
     * GroupTotals, if any.
     */
    public totals: GroupTotals | null = null;

    /**
     * Rows that are part of the group.
     */
    public rows: number[] = [];

    /**
     * Sub-groups that are part of the group.
     */
    public groups: number[] | null = null;

    /**
     * A unique key used to identify the group.  This key can be used in calls to DataView
     * collapseGroup() or expandGroup().
     */
    public groupingKey: unknown | null = null;

    /**
     * Compares two Group instances
     * @param group Group instance to compare to.
     */
    public equals(group: Group): boolean {
        return this.value === group.value &&
            this.count === group.count &&
            this.collapsed === group.collapsed &&
            this.title === group.title;
    }
}

/**
 * Information about group totals.
 * An instance of GroupTotals will be created for each totals row and passed to the aggregators
 * so that they can store arbitrary data in it.  That data can later be accessed by group totals
 * formatters during the display.
 */
export class GroupTotals extends NonDataItem {
    public readonly __groupTotals: boolean = true;

    /***
     * Parent Group.
     */
    public group: Group | null = null;

    /***
     * Whether the totals have been fully initialized / calculated.
     * Will be set to false for lazy-calculated group totals.
     */
    public initialized: boolean = false;
}

interface IEditController {
    commitCurrentEdit(): boolean,
    cancelCurrentEdit(): boolean
}

interface IColumnIndexAccess {
    getColumnIndex(id: any): number
}

/**
 * A locking helper to track the active edit controller and ensure that only a single controller
 * can be active at a time.  This prevents a whole class of state and validation synchronization
 * issues.  An edit controller (such as SlickGrid) can query if an active edit is in progress
 * and attempt a commit or cancel before proceeding.
 */
export class EditorLock {
    private _activeEditController: IEditController | null = null;

    /***
     * Returns true if a specified edit controller is active (has the edit lock).
     * If the parameter is not specified, returns true if any edit controller is active.
     */
    public isActive(editController: IEditController): boolean {
        return (editController ? this._activeEditController === editController : this._activeEditController !== null);
    }

    /***
     * Sets the specified edit controller as the active edit controller (acquire edit lock).
     * If another edit controller is already active, and exception will be throw new Error(.
     * @param editController edit controller acquiring the lock
     */
    public activate(editController: IEditController) {
        if (editController === this._activeEditController) { // already activated?
            return;
        }
        if (this._activeEditController !== null) {
            throw new Error("SlickGrid.EditorLock.activate: an editController is still active, can't activate another editController");
        }
        if (!editController.commitCurrentEdit) {
            throw new Error("SlickGrid.EditorLock.activate: editController must implement .commitCurrentEdit()");
        }
        if (!editController.cancelCurrentEdit) {
            throw new Error("SlickGrid.EditorLock.activate: editController must implement .cancelCurrentEdit()");
        }
        this._activeEditController = editController;
    };

    /***
     * Unsets the specified edit controller as the active edit controller (release edit lock).
     * If the specified edit controller is not the active one, an exception will be throw new Error(.
     * @param editController edit controller releasing the lock
     */
    public deactivate(editController: IEditController) {
        if (this._activeEditController !== editController) {
            throw new Error("SlickGrid.EditorLock.deactivate: specified editController is not the currently active one");
        }
        this._activeEditController = null;
    };

    /***
     * Attempts to commit the current edit by calling "commitCurrentEdit" method on the active edit
     * controller and returns whether the commit attempt was successful (commit may fail due to validation
     * errors, etc.).  Edit controller's "commitCurrentEdit" must return true if the commit has succeeded
     * and false otherwise.  If no edit controller is active, returns true.
     */
    public commitCurrentEdit(): boolean {
        return (this._activeEditController ? this._activeEditController.commitCurrentEdit() : true);
    };

    /***
     * Attempts to cancel the current edit by calling "cancelCurrentEdit" method on the active edit
     * controller and returns whether the edit was successfully cancelled.  If no edit controller is
     * active, returns true.
     */
    public cancelCurrentEdit(): boolean {
        return (this._activeEditController ? this._activeEditController.cancelCurrentEdit() : true);
    };
}

/**
 * A global singleton editor lock.
 */
export let GlobalEditorLock = new EditorLock()

interface TreeColumn {
    id: any,
    columns: TreeColumn[],
    visible: boolean
}

export class TreeColumns {
    private _columnsById: any = {};
    private _treeColumns: TreeColumn[];

    /**
     * @param treeColumns Array com levels of columns
     */
    public constructor(treeColumns: TreeColumn[]) {
        this._treeColumns = treeColumns;
        this.mapToId(treeColumns);
    }

    private mapToId(columns: TreeColumn[]) {
        columns
            .forEach(column => {
                this._columnsById[column.id] = column;

                if (column.columns) {
                    this.mapToId(column.columns);
                }
            });
    }

    private filterFrom(node: TreeColumn[], condition: () => boolean): TreeColumn[] {
        return node.filter(column => {
            const valid = condition.call(column);

            if (valid && column.columns) {
                column.columns = this.filterFrom(column.columns, condition);
            }

            return valid && (!column.columns || column.columns.length);
        });
    }



    private getOrDefault(value: any) {
        return typeof value === 'undefined' ? -1 : value;
    }

    private sort(columns: TreeColumn[], grid: IColumnIndexAccess) {
        columns
            .sort((a, b) => {
                var indexA = this.getOrDefault(grid.getColumnIndex(a.id)),
                    indexB = this.getOrDefault(grid.getColumnIndex(b.id));
                return indexA - indexB;
            })
            .forEach(column => {
                if (column.columns) {
                    this.sort(column.columns, grid);
                }
            });
    }


    private getDepthFrom(node: TreeColumn[] | TreeColumn): number {
        if ((node as any).length) {
            for (const i in node) {
                return this.getDepthFrom((node as any)[i] as TreeColumn[]);
            }
            return 0;
        }
        else if ((node as any).columns) {
            return 1 + this.getDepthFrom((node as TreeColumn).columns);
        }
        else {
            return 1;
        }
    }


    private getColumnsInDepthFrom(node: TreeColumn[], depth: number, current: number = 0): TreeColumn[] {
        let columns: TreeColumn[] = [];

        if (depth == current) {

            if (node.length) {
                node.forEach(n => {
                    if (n.columns) {
                        (n as any).extractColumns = () => {
                            return this.extractColumnsFrom(n);
                        };
                    }
                });
            }

            return node;
        } else {
            for (var i in node) {
                if (node[i].columns) {
                    columns = columns.concat(this.getColumnsInDepthFrom(node[i].columns, depth, current + 1));
                }
            }
        }

        return columns;
    }

    private extractColumnsFrom(node: TreeColumn[] | TreeColumn): TreeColumn[] | TreeColumn {
        let result: TreeColumn[] = [];

        if (node.hasOwnProperty('length')) {
            for (var i = 0; i < (node as any).length; i++) {
                result = result.concat(this.extractColumnsFrom((node as any)[i]));
            }
        } else {
            if (node.hasOwnProperty('columns')) {
                result = result.concat(this.extractColumnsFrom((node as TreeColumn).columns));
            }
            else {
                return node;
            }
        }

        return result;
    }

    private cloneTreeColumns() {
        return $.extend(true, [], this._treeColumns);
    }


    public hasDepth() {
        for (var i in this._treeColumns) {
            if (this._treeColumns[i].hasOwnProperty('columns')) {
                return true;
            }
        }
        return false;
    }

    public getTreeColumns() {
        return this._treeColumns;
    }

    public extractColumns() {
        return this.hasDepth() ? this.extractColumnsFrom(this._treeColumns) : this._treeColumns;
    }

    public getDepth() {
        return this.getDepthFrom(this._treeColumns);
    }

    public getColumnsInDepth(depth: number) {
        return this.getColumnsInDepthFrom(this._treeColumns, depth);
    }

    public getColumnsInGroup(groups: TreeColumn[]) {
        return this.extractColumnsFrom(groups);
    }

    public visibleColumns() {
        return this.filterFrom(this.cloneTreeColumns(), function (this: TreeColumn) {
            return this.visible
        });
    }

    public filter(condition: () => boolean) {
        return this.filterFrom(this.cloneTreeColumns(), condition);
    }

    public reOrder(grid: IColumnIndexAccess) {
        return this.sort(this._treeColumns, grid);
    }

    public getById(id: any) {
        return this._columnsById[id];
    }

    public getInIds(ids: any[]) {
        return ids.map((id) => {
            return this._columnsById[id];
        });
    }
}

export enum keyCode {
    SPACE = 8,
    BACKSPACE = 8,
    DELETE = 46,
    DOWN = 40,
    END = 35,
    ENTER = 13,
    ESCAPE = 27,
    HOME = 36,
    INSERT = 45,
    LEFT = 37,
    PAGE_DOWN = 34,
    PAGE_UP = 33,
    RIGHT = 39,
    TAB = 9,
    UP = 38,
    A = 65
}
export let preClickClassName = "slick-edit-preclick";

export enum GridAutosizeColsMode {
    None = 'NOA',
    LegacyOff = 'LOF',
    LegacyForceFit = 'LFF',
    IgnoreViewport = 'IGV',
    FitColsToViewport = 'FCV',
    FitViewportToCols = 'FVC'
}

export enum ColAutosizeMode {
    Locked = 'LCK',
    Guide = 'GUI',
    Content = 'CON',
    ContentIntelligent = 'CTI'
}

export enum RowSelectionMode {
    FirstRow = 'FS1',
    FirstNRows = 'FSN',
    AllRows = 'ALL',
    LastRow = 'LS1'
}

export enum ValueFilterMode {
    None = 'NONE',
    DeDuplicate = 'DEDP',
    GetGreatestAndSub = 'GR8T',
    GetLongestTextAndSub = 'LNSB',
    GetLongestText = 'LNSC'
}

export enum WidthEvalMode {
    CanvasTextSize = 'CANV',
    HTML = 'HTML'
}