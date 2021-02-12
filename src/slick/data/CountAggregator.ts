export class CountAggregator {
    private field_;

    public constructor(field) {
        this.field_ = field;
    }

    public init() {
    };

    public storeResult(groupTotals) {
        if (!groupTotals.count) {
            groupTotals.count = {};
        }
        groupTotals.count[this.field_] = groupTotals.group.rows.length;
    };
}