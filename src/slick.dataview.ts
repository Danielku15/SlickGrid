import { GroupTotals } from "./slick.core";

class DataView {

}

interface IAggregator {
    init(): void,
    accumulate?(item: any): void;
    storeResult(groupTotals: GroupTotals): void;
}

class AvgAggregator {

}

class MinAggregator {

}

class MaxAggregator {

}

class SumAggregator {

}

class CountAggregator {

}


export const Data = {
    DataView,
    Aggregators: {
        Avg: AvgAggregator,
        Min: MinAggregator,
        Max: MaxAggregator,
        Sum: SumAggregator,
        Count: CountAggregator
    }
}