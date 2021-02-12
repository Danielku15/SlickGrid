export class MaxAggregator {
    private field_;
    private max_;

    public constructor(field) {
        this.field_ = field;
    }

    public accumulate(item) {
        var val = item[this.field_];
        if (val != null && val !== "" && !isNaN(val)) {
            if (this.max_ == null || val > this.max_) {
                this.max_ = val;
            }
        }
    };

    public storeResult(groupTotals) {
        if (!groupTotals.max) {
            groupTotals.max = {};
        }
        groupTotals.max[this.field_] = this.max_;
    };
}
