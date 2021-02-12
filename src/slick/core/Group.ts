import { GroupTotals } from "./GroupTotals";
import { NonDataItem } from "./NonDataItem";

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