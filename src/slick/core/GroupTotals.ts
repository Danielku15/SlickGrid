import { Group } from "./Group";
import { NonDataItem } from "./NonDataItem";

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