export class AvgAggregator {
    private field_;
    private nonNullCount_;
    private sum_;
    private count_;

    public constructor(field) {
        this.field_ = field;
    }

    public init() {
        this.count_ = 0;
        this.nonNullCount_ = 0;
        this.sum_ = 0;
    };

    public accumulate(item) {
        var val = item[this.field_];
        this.count_++;
        if (val != null && val !== "" && !isNaN(val)) {
            this.nonNullCount_++;
            this.sum_ += parseFloat(val);
        }
    };

    public storeResult(groupTotals) {
        if (!groupTotals.avg) {
            groupTotals.avg = {};
        }
        if (this.nonNullCount_ !== 0) {
            groupTotals.avg[this.field_] = this.sum_ / this.nonNullCount_;
        }
    };
}
