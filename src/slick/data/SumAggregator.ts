export class SumAggregator {
    private field_;
    private sum_;

    public constructor(field) {
        this.field_ = field;
    }

    public init() {
    };

    public accumulate(item) {
        var val = item[this.field_];
        if (val != null && val !== "" && !isNaN(val)) {
            this.sum_ += parseFloat(val);
        }
    };

    public storeResult(groupTotals) {
        if (!groupTotals.sum) {
            groupTotals.sum = {};
        }
        groupTotals.sum[this.field_] = this.sum_;
    };
}
