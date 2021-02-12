import { DataView } from './slick/data/DataView';
import { AvgAggregator } from './slick/data/AvgAggregator';
import { MinAggregator } from './slick/data/MinAggregator';
import { MaxAggregator } from './slick/data/MaxAggregator';
import { SumAggregator } from './slick/data/SumAggregator';
import { CountAggregator } from './slick/data/CountAggregator';

// TODO:  add more built-in aggregators
// TODO:  merge common aggregators in one to prevent needles iterating
export const Data = {
    DataView,
    Aggregators: {
        Avg: AvgAggregator,
        Min: MinAggregator,
        Max: MaxAggregator,
        Sum: SumAggregator,
        Count: CountAggregator
    }
};