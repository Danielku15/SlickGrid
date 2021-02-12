/**
 * A base class that all special / non-data rows (like Group and GroupTotals) derive from.
 */
export class NonDataItem {
    public readonly __isNonDataRow: boolean = true;
}