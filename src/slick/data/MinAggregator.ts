export class MinAggregator {
    private field_;
    private min_;

    public constructor(field) {
        this.field_ = field;
    }

    public init() {
        this.min_ = null;
    };

    public accumulate(item) {
        var val = item[this.field_];
        if (val != null && val !== "" && !isNaN(val)) {
            if (this.min_ == null || val < this.min_) {
                this.min_ = val;
            }
        }
    };

    public storeResult(groupTotals) {
        if (!groupTotals.min) {
            groupTotals.min = {};
        }
        groupTotals.min[this.field_] = this.min_;
    };
}
