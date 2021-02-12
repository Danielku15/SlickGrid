import { SlickMap } from "../core/SlickMap";
import { Event } from "../core/Event";
import { GroupItemMetadataProvider } from "../data/GroupItemMetadataProvider";
import { Group } from "../core/Group";
import { GroupTotals } from "../core/GroupTotals";
import { EventData } from "../core/EventData";

/**
 * A sample Model implementation.
 * Provides a filtered view of the underlying data.
 *
 * Relies on the data item having an "id" property uniquely identifying it.
 */
export class DataView {
    private defaults = {
        groupItemMetadataProvider: null,
        inlineFilters: false
    };

    private options;

    public constructor(options) {
        this.options = $.extend(true, {}, this.defaults, options);
    }

    // private
    private idProperty = "id";          // property holding a unique row id
    private items = [];                 // data by index
    private rows = [];                  // data by row
    private idxById = new Map();   // indexes by id
    private rowsById = null;            // rows by id; lazy-calculated
    private filter = null;              // filter function
    private updated = null;             // updated item ids
    private suspend = false;            // suspends the recalculation
    private isBulkSuspend = false;      // delays various operations like the
    // index update and delete to efficient
    // versions at endUpdate
    private bulkDeleteIds = new SlickMap();
    private sortAsc = true;
    private fastSortField;
    private sortComparer;
    private refreshHints: any = {};
    private prevRefreshHints: any = {};
    private filterArgs;
    private filteredItems = [];
    private compiledFilter;
    private compiledFilterWithCaching;
    private filterCache = [];
    private _grid = null;

    // grouping
    private groupingInfoDefaults = {
        getter: null,
        formatter: null,
        comparer: function (a, b) {
            return (a.value === b.value ? 0 :
                (a.value > b.value ? 1 : -1)
            );
        },
        predefinedValues: [],
        aggregators: [],
        aggregateEmpty: false,
        aggregateCollapsed: false,
        aggregateChildGroups: false,
        collapsed: false,
        displayTotalsRow: true,
        lazyTotalsCalculation: false
    };
    private groupingInfos = [];
    private groups = [];
    private toggledGroupsByLevel = [];
    private groupingDelimiter = ':|:';
    private selectedRowIds = null;

    private pagesize = 0;
    private pagenum = 0;
    private totalRows = 0;

    // events
    public onSetItemsCalled = new Event();
    public onRowCountChanged = new Event();
    public onRowsChanged = new Event();
    public onRowsOrCountChanged = new Event();
    public onBeforePagingInfoChanged = new Event();
    public onPagingInfoChanged = new Event();
    public onGroupExpanded = new Event();
    public onGroupCollapsed = new Event();

    /***
     * Begins a bached update of the items in the data view. 
     * @param bulkUpdate {Boolean} if set to true, most data view modifications 
     * including deletes and the related events are postponed to the endUpdate call.
     * As certain operations are postponed during this update, some methods might not 
     * deliver fully consistent information.
     */
    public beginUpdate(bulkUpdate) {
        this.suspend = true;
        this.isBulkSuspend = bulkUpdate === true;
    }

    public endUpdate() {
        if (this.isBulkSuspend) {
            this.processBulkDelete();
        }
        this.isBulkSuspend = false;
        this.suspend = false;
        this.refresh();
    }

    public destroy() {
        this.items = [];
        this.idxById = null;
        this.rowsById = null;
        this.filter = null;
        this.updated = null;
        this.sortComparer = null;
        this.filterCache = [];
        this.filteredItems = [];
        this.compiledFilter = null;
        this.compiledFilterWithCaching = null;

        if (this._grid && this._grid.onSelectedRowsChanged && this._grid.onCellCssStylesChanged) {
            this._grid.onSelectedRowsChanged.unsubscribe();
            this._grid.onCellCssStylesChanged.unsubscribe();
        }
        if (this.onRowsOrCountChanged) {
            this.onRowsOrCountChanged.unsubscribe();
        }
    }

    public setRefreshHints(hints) {
        this.refreshHints = hints;
    }

    public setFilterArgs(args) {
        this.filterArgs = args;
    }

    /***
     * Processes all delete requests placed during bulk update
     * by recomputing the items and idxById members.
     */
    private processBulkDelete() {
        // the bulk update is processed by 
        // recomputing the whole items array and the index lookup in one go.
        // this is done by placing the not-deleted items 
        // from left to right into the array and shrink the array the the new 
        // size afterwards.
        // see https://github.com/6pac/SlickGrid/issues/571 for further details. 

        var id, item, newIdx = 0;
        for (var i = 0, l = this.items.length; i < l; i++) {
            item = this.items[i];
            id = item[this.idProperty];
            if (id === undefined) {
                throw new Error("Each data element must implement a unique 'id' property");
            }

            // if items have been marked as deleted we skip them for the new final items array
            // and we remove them from the lookup table. 
            if (this.bulkDeleteIds.has(id)) {
                this.idxById.delete(id);
            } else {
                // for items which are not deleted, we add them to the
                // next free position in the array and register the index in the lookup.
                this.items[newIdx] = item;
                this.idxById.set(id, newIdx);
                ++newIdx;
            }
        }

        // here we shrink down the full item array to the ones actually 
        // inserted in the cleanup loop above. 
        this.items.length = newIdx;
        // and finally cleanup the deleted ids to start cleanly on the next update.
        this.bulkDeleteIds = new SlickMap();
    }

    private updateIdxById(startingIndex?) {
        if (this.isBulkSuspend) { // during bulk update we do not reorganize
            return;
        }
        startingIndex = startingIndex || 0;
        var id;
        for (var i = startingIndex, l = this.items.length; i < l; i++) {
            id = this.items[i][this.idProperty];
            if (id === undefined) {
                throw new Error("Each data element must implement a unique 'id' property");
            }
            this.idxById.set(id, i);
        }
    }

    private ensureIdUniqueness() {
        var id;
        for (var i = 0, l = this.items.length; i < l; i++) {
            id = this.items[i][this.idProperty];
            if (id === undefined || this.idxById.get(id) !== i) {
                throw new Error("Each data element must implement a unique 'id' property");
            }
        }
    }

    public getItems() {
        return this.items;
    }

    public getIdPropertyName() {
        return this.idProperty;
    }

    public setItems(data, objectIdProperty) {
        if (objectIdProperty !== undefined) {
            this.idProperty = objectIdProperty;
        }
        this.items = this.filteredItems = data;
        this.onSetItemsCalled.notify({ idProperty: objectIdProperty, itemCount: this.items.length }, null, self);
        this.idxById = new SlickMap();
        this.updateIdxById();
        this.ensureIdUniqueness();
        this.refresh();
    }

    public setPagingOptions(args) {
        this.onBeforePagingInfoChanged.notify(this.getPagingInfo(), null, self);

        if (args.pageSize != undefined) {
            this.pagesize = args.pageSize;
            this.pagenum = this.pagesize ? Math.min(this.pagenum, Math.max(0, Math.ceil(this.totalRows / this.pagesize) - 1)) : 0;
        }

        if (args.pageNum != undefined) {
            this.pagenum = Math.min(args.pageNum, Math.max(0, Math.ceil(this.totalRows / this.pagesize) - 1));
        }

        this.onPagingInfoChanged.notify(this.getPagingInfo(), null, self);

        this.refresh();
    }

    public getPagingInfo() {
        var totalPages = this.pagesize ? Math.max(1, Math.ceil(this.totalRows / this.pagesize)) : 1;
        return { pageSize: this.pagesize, pageNum: this.pagenum, totalRows: this.totalRows, totalPages: totalPages, dataView: self };
    }

    public sort(comparer, ascending) {
        this.sortAsc = ascending;
        this.sortComparer = comparer;
        this.fastSortField = null;
        if (ascending === false) {
            this.items.reverse();
        }
        this.items.sort(comparer);
        if (ascending === false) {
            this.items.reverse();
        }
        this.idxById = new SlickMap();
        this.updateIdxById();
        this.refresh();
    }

    /***
     * Provides a workaround for the extremely slow sorting in IE.
     * Does a [lexicographic] sort on a give column by temporarily overriding Object.prototype.toString
     * to return the value of that field and then doing a native Array.sort().
     */
    public fastSort(field, ascending) {
        this.sortAsc = ascending;
        this.fastSortField = field;
        this.sortComparer = null;
        var oldToString = Object.prototype.toString;
        Object.prototype.toString = (typeof field == "function") ? field : function (this: Object) {
            return this[field];
        };
        // an extra reversal for descending sort keeps the sort stable
        // (assuming a stable native sort implementation, which isn't true in some cases)
        if (ascending === false) {
            this.items.reverse();
        }
        this.items.sort();
        Object.prototype.toString = oldToString;
        if (ascending === false) {
            this.items.reverse();
        }
        this.idxById = new SlickMap();
        this.updateIdxById();
        this.refresh();
    }

    public reSort() {
        if (this.sortComparer) {
            this.sort(this.sortComparer, this.sortAsc);
        } else if (this.fastSortField) {
            this.fastSort(this.fastSortField, this.sortAsc);
        }
    }

    public getFilteredItems() {
        return this.filteredItems;
    }


    public getFilter() {
        return this.filter;
    }

    public setFilter(filterFn) {
        this.filter = filterFn;
        if (this.options.inlineFilters) {
            this.compiledFilter = this.compileFilter();
            this.compiledFilterWithCaching = this.compileFilterWithCaching();
        }
        this.refresh();
    }

    public getGrouping() {
        return this.groupingInfos;
    }

    public setGrouping(groupingInfo) {
        if (!this.options.groupItemMetadataProvider) {
            this.options.groupItemMetadataProvider = new GroupItemMetadataProvider();
        }

        this.groups = [];
        this.toggledGroupsByLevel = [];
        groupingInfo = groupingInfo || [];
        this.groupingInfos = (groupingInfo instanceof Array) ? groupingInfo : [groupingInfo];

        for (var i = 0; i < this.groupingInfos.length; i++) {
            var gi = this.groupingInfos[i] = $.extend(true, {}, this.groupingInfoDefaults, this.groupingInfos[i]);
            gi.getterIsAFn = typeof gi.getter === "function";

            // pre-compile accumulator loops
            gi.compiledAccumulators = [];
            var idx = gi.aggregators.length;
            while (idx--) {
                gi.compiledAccumulators[idx] = this.compileAccumulatorLoop(gi.aggregators[idx]);
            }

            this.toggledGroupsByLevel[i] = {};
        }

        this.refresh();
    }

    /**
     * @deprecated Please use {@link setGrouping}.
     */
    public groupBy(valueGetter, valueFormatter, sortComparer) {
        if (valueGetter == null) {
            this.setGrouping([]);
            return;
        }

        this.setGrouping({
            getter: valueGetter,
            formatter: valueFormatter,
            comparer: sortComparer
        });
    }

    /**
     * @deprecated Please use {@link setGrouping}.
     */
    public setAggregators(groupAggregators, includeCollapsed) {
        if (!this.groupingInfos.length) {
            throw new Error("At least one grouping must be specified before calling setAggregators().");
        }

        this.groupingInfos[0].aggregators = groupAggregators;
        this.groupingInfos[0].aggregateCollapsed = includeCollapsed;

        this.setGrouping(this.groupingInfos);
    }

    public getItemByIdx(i) {
        return this.items[i];
    }

    public getIdxById(id) {
        return this.idxById.get(id);
    }

    private ensureRowsByIdCache() {
        if (!this.rowsById) {
            this.rowsById = {};
            for (var i = 0, l = this.rows.length; i < l; i++) {
                this.rowsById[this.rows[i][this.idProperty]] = i;
            }
        }
    }

    public getRowByItem(item) {
        this.ensureRowsByIdCache();
        return this.rowsById[item[this.idProperty]];
    }

    public getRowById(id) {
        this.ensureRowsByIdCache();
        return this.rowsById[id];
    }

    private getItemById(id) {
        return this.items[this.idxById.get(id)];
    }

    public mapItemsToRows(itemArray) {
        var rows = [];
        this.ensureRowsByIdCache();
        for (var i = 0, l = itemArray.length; i < l; i++) {
            var row = this.rowsById[itemArray[i][this.idProperty]];
            if (row != null) {
                rows[rows.length] = row;
            }
        }
        return rows;
    }

    public mapIdsToRows(idArray) {
        var rows = [];
        this.ensureRowsByIdCache();
        for (var i = 0, l = idArray.length; i < l; i++) {
            var row = this.rowsById[idArray[i]];
            if (row != null) {
                rows[rows.length] = row;
            }
        }
        return rows;
    }

    public mapRowsToIds(rowArray) {
        var ids = [];
        for (var i = 0, l = rowArray.length; i < l; i++) {
            if (rowArray[i] < this.rows.length) {
                ids[ids.length] = this.rows[rowArray[i]][this.idProperty];
            }
        }
        return ids;
    }

    /***
     * Performs the update operations of a single item by id without 
     * triggering any events or refresh operations.
     * @param id The new id of the item. 
     * @param item The item which should be the new value for the given id. 
     */
    private updateSingleItem(id, item) {
        // see also https://github.com/mleibman/SlickGrid/issues/1082
        if (!this.idxById.has(id)) {
            throw new Error("Invalid id");
        }

        // What if the specified item also has an updated idProperty?
        // Then we'll have to update the index as well, and possibly the `updated` cache too.
        if (id !== item[this.idProperty]) {
            // make sure the new id is unique:
            var newId = item[this.idProperty];
            if (newId == null) {
                throw new Error("Cannot update item to associate with a null id");
            }
            if (this.idxById.has(newId)) {
                throw new Error("Cannot update item to associate with a non-unique id");
            }
            this.idxById.set(newId, this.idxById.get(id));
            this.idxById.delete(id);

            // Also update the `updated` hashtable/markercache? Yes, `recalc()` inside `refresh()` needs that one!
            if (this.updated && this.updated[id]) {
                delete this.updated[id];
            }

            // Also update the row indexes? no need since the `refresh()`, further down, blows away the `rowsById[]` cache!

            id = newId;
        }
        this.items[this.idxById.get(id)] = item;

        // Also update the rows? no need since the `refresh()`, further down, blows away the `rows[]` cache and recalculates it via `recalc()`!

        if (!this.updated) {
            this.updated = {};
        }
        this.updated[id] = true;
    }

    /***
     * Updates a single item in the data view given the id and new value. 
     * @param id The new id of the item. 
     * @param item The item which should be the new value for the given id. 
     */
    public updateItem(id, item) {
        this.updateSingleItem(id, item);
        this.refresh();
    }

    /***
     * Updates multiple items in the data view given the new ids and new values. 
     * @param id {Array} The array of new ids which is in the same order as the items.
     * @param newItems {Array} The new items that should be set in the data view for the given ids. 
     */
    public updateItems(ids, newItems) {
        if (ids.length !== newItems.length) {
            throw new Error("Mismatch on the length of ids and items provided to update");
        }
        for (var i = 0, l = newItems.length; i < l; i++) {
            this.updateSingleItem(ids[i], newItems[i]);
        }
        this.refresh();
    }

    /***
     * Inserts a single item into the data view at the given position. 
     * @param insertBefore {Number} The 0-based index before which the item should be inserted. 
     * @param item The item to insert.
     */
    public insertItem(insertBefore, item) {
        this.items.splice(insertBefore, 0, item);
        this.updateIdxById(insertBefore);
        this.refresh();
    }

    /***
     * Inserts multiple items into the data view at the given position. 
     * @param insertBefore {Number} The 0-based index before which the items should be inserted. 
     * @param newItems {Array}  The items to insert.
     */
    public insertItems(insertBefore, newItems) {
        Array.prototype.splice.apply(this.items, [insertBefore, 0].concat(newItems) as any);
        this.updateIdxById(insertBefore);
        this.refresh();
    }

    /***
     * Adds a single item at the end of the data view. 
     * @param item The item to add at the end.
     */
    public addItem(item) {
        this.items.push(item);
        this.updateIdxById(this.items.length - 1);
        this.refresh();
    }

    /***
     * Adds multiple items at the end of the data view. 
     * @param newItems {Array} The items to add at the end.
     */
    public addItems(newItems) {
        this.items = this.items.concat(newItems);
        this.updateIdxById(this.items.length - newItems.length);
        this.refresh();
    }

    /***
     * Deletes a single item identified by the given id from the data view. 
     * @param id The id identifying the object to delete. 
     */
    public deleteItem(id) {
        if (this.isBulkSuspend) {
            this.bulkDeleteIds.set(id, true);
        } else {
            var idx = this.idxById.get(id);
            if (idx === undefined) {
                throw new Error("Invalid id");
            }
            this.idxById.delete(id);
            this.items.splice(idx, 1);
            this.updateIdxById(idx);
            this.refresh();
        }
    }

    /***
     * Deletes multiple item identified by the given ids from the data view. 
     * @param ids {Array} The ids of the items to delete.
     */
    public deleteItems(ids) {
        if (ids.length === 0) {
            return;
        }

        if (this.isBulkSuspend) {
            for (var i = 0, l = ids.length; i < l; i++) {
                var id = ids[i];
                var idx = this.idxById.get(id);
                if (idx === undefined) {
                    throw new Error("Invalid id");
                }
                this.bulkDeleteIds.set(id, true);
            }
        } else {
            // collect all indexes
            var indexesToDelete = [];
            for (var i = 0, l = ids.length; i < l; i++) {
                var id = ids[i];
                var idx = this.idxById.get(id);
                if (idx === undefined) {
                    throw new Error("Invalid id");
                }
                this.idxById.delete(id);
                indexesToDelete.push(idx);
            }

            // Remove from back to front
            indexesToDelete.sort();
            for (var i = indexesToDelete.length - 1; i >= 0; --i) {
                this.items.splice(indexesToDelete[i], 1);
            }

            // update lookup from front to back
            this.updateIdxById(indexesToDelete[0]);
            this.refresh();
        }
    }

    public sortedAddItem(item) {
        if (!this.sortComparer) {
            throw new Error("sortedAddItem() requires a sort comparer, use sort()");
        }
        this.insertItem(this.sortedIndex(item), item);
    }

    public sortedUpdateItem(id, item) {
        if (!this.idxById.has(id) || id !== item[this.idProperty]) {
            throw new Error("Invalid or non-matching id " + this.idxById.get(id));
        }
        if (!this.sortComparer) {
            throw new Error("sortedUpdateItem() requires a sort comparer, use sort()");
        }
        var oldItem = this.getItemById(id);
        if (this.sortComparer(oldItem, item) !== 0) {
            // item affects sorting -> must use sorted add
            this.deleteItem(id);
            this.sortedAddItem(item);
        }
        else { // update does not affect sorting -> regular update works fine
            this.updateItem(id, item);
        }
    }

    private sortedIndex(searchItem) {
        var low = 0, high = this.items.length;

        while (low < high) {
            var mid = low + high >>> 1;
            if (this.sortComparer(this.items[mid], searchItem) === -1) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }

    // data provider methods
    public getItemCount() {
        return this.items.length;
    }

    public getLength() {
        return this.rows.length;
    }

    public getItem(i) {
        var item = this.rows[i];

        // if this is a group row, make sure totals are calculated and update the title
        if (item && item.__group && item.totals && !item.totals.initialized) {
            var gi = this.groupingInfos[item.level];
            if (!gi.displayTotalsRow) {
                this.calculateTotals(item.totals);
                item.title = gi.formatter ? gi.formatter(item) : item.value;
            }
        }
        // if this is a totals row, make sure it's calculated
        else if (item && item.__groupTotals && !item.initialized) {
            this.calculateTotals(item);
        }

        return item;
    }

    public getItemMetadata(i) {
        var item = this.rows[i];
        if (item === undefined) {
            return null;
        }

        // overrides for grouping rows
        if (item.__group) {
            return this.options.groupItemMetadataProvider.getGroupRowMetadata(item);
        }

        // overrides for totals rows
        if (item.__groupTotals) {
            return this.options.groupItemMetadataProvider.getTotalsRowMetadata(item);
        }

        return null;
    }

    private expandCollapseAllGroups(level, collapse) {
        if (level == null) {
            for (var i = 0; i < this.groupingInfos.length; i++) {
                this.toggledGroupsByLevel[i] = {};
                this.groupingInfos[i].collapsed = collapse;

                if (collapse === true) {
                    this.onGroupCollapsed.notify({ level: i, groupingKey: null });
                } else {
                    this.onGroupExpanded.notify({ level: i, groupingKey: null });
                }
            }
        } else {
            this.toggledGroupsByLevel[level] = {};
            this.groupingInfos[level].collapsed = collapse;

            if (collapse === true) {
                this.onGroupCollapsed.notify({ level: level, groupingKey: null });
            } else {
                this.onGroupExpanded.notify({ level: level, groupingKey: null });
            }
        }
        this.refresh();
    }

    /**
     * @param level {Number} Optional level to collapse.  If not specified, applies to all levels.
     */
    public collapseAllGroups(level) {
        this.expandCollapseAllGroups(level, true);
    }

    /**
     * @param level {Number} Optional level to expand.  If not specified, applies to all levels.
     */
    public expandAllGroups(level) {
        this.expandCollapseAllGroups(level, false);
    }

    private expandCollapseGroup(level, groupingKey, collapse) {
        this.toggledGroupsByLevel[level][groupingKey] = this.groupingInfos[level].collapsed ^ collapse;
        this.refresh();
    }

    /**
     * @param varArgs Either a Slick.Group's "groupingKey" property, or a
     *     variable argument list of grouping values denoting a unique path to the row.  For
     *     example, calling collapseGroup('high', '10%') will collapse the '10%' subgroup of
     *     the 'high' group.
     */
    public collapseGroup(varArgs) {
        var args = Array.prototype.slice.call(arguments);
        var arg0 = args[0];
        var groupingKey;
        var level;

        if (args.length === 1 && arg0.indexOf(this.groupingDelimiter) !== -1) {
            groupingKey = arg0;
            level = arg0.split(this.groupingDelimiter).length - 1;
        } else {
            groupingKey = args.join(this.groupingDelimiter);
            level = args.length - 1;
        }

        this.expandCollapseGroup(level, groupingKey, true);
        this.onGroupCollapsed.notify({ level: level, groupingKey: groupingKey });
    }

    /**
     * @param varArgs Either a Slick.Group's "groupingKey" property, or a
     *     variable argument list of grouping values denoting a unique path to the row.  For
     *     example, calling expandGroup('high', '10%') will expand the '10%' subgroup of
     *     the 'high' group.
     */
    public expandGroup(varArgs) {
        var args = Array.prototype.slice.call(arguments);
        var arg0 = args[0];
        var groupingKey;
        var level;

        if (args.length === 1 && arg0.indexOf(this.groupingDelimiter) !== -1) {
            level = arg0.split(this.groupingDelimiter).length - 1;
            groupingKey = arg0;
        } else {
            level = args.length - 1;
            groupingKey = args.join(this.groupingDelimiter);
        }

        this.expandCollapseGroup(level, groupingKey, false);
        this.onGroupExpanded.notify({ level: level, groupingKey: groupingKey });
    }

    public getGroups() {
        return this.groups;
    }

    private extractGroups(rows, parentGroup?) {
        var group;
        var val;
        var groups = [];
        var groupsByVal = {};
        var r;
        var level = parentGroup ? parentGroup.level + 1 : 0;
        var gi = this.groupingInfos[level];

        for (var i = 0, l = gi.predefinedValues.length; i < l; i++) {
            val = gi.predefinedValues[i];
            group = groupsByVal[val];
            if (!group) {
                group = new Group();
                group.value = val;
                group.level = level;
                group.groupingKey = (parentGroup ? parentGroup.groupingKey + this.groupingDelimiter : '') + val;
                groups[groups.length] = group;
                groupsByVal[val] = group;
            }
        }

        for (var i = 0, l = rows.length; i < l; i++) {
            r = rows[i];
            val = gi.getterIsAFn ? gi.getter(r) : r[gi.getter];
            group = groupsByVal[val];
            if (!group) {
                group = new Group();
                group.value = val;
                group.level = level;
                group.groupingKey = (parentGroup ? parentGroup.groupingKey + this.groupingDelimiter : '') + val;
                groups[groups.length] = group;
                groupsByVal[val] = group;
            }

            group.rows[group.count++] = r;
        }

        if (level < this.groupingInfos.length - 1) {
            for (var i = 0; i < groups.length; i++) {
                group = groups[i];
                group.groups = this.extractGroups(group.rows, group);
            }
        }

        if (groups.length) {
            this.addTotals(groups, level);
        }

        groups.sort(this.groupingInfos[level].comparer);

        return groups;
    }

    private calculateTotals(totals) {
        var group = totals.group;
        var gi = this.groupingInfos[group.level];
        var isLeafLevel = (group.level == this.groupingInfos.length);
        var agg, idx = gi.aggregators.length;

        if (!isLeafLevel && gi.aggregateChildGroups) {
            // make sure all the subgroups are calculated
            var i = group.groups.length;
            while (i--) {
                if (!group.groups[i].totals.initialized) {
                    this.calculateTotals(group.groups[i].totals);
                }
            }
        }

        while (idx--) {
            agg = gi.aggregators[idx];
            agg.init();
            if (!isLeafLevel && gi.aggregateChildGroups) {
                gi.compiledAccumulators[idx].call(agg, group.groups);
            } else {
                gi.compiledAccumulators[idx].call(agg, group.rows);
            }
            agg.storeResult(totals);
        }
        totals.initialized = true;
    }

    private addGroupTotals(group) {
        var gi = this.groupingInfos[group.level];
        var totals = new GroupTotals();
        totals.group = group;
        group.totals = totals;
        if (!gi.lazyTotalsCalculation) {
            this.calculateTotals(totals);
        }
    }

    private addTotals(groups, level) {
        level = level || 0;
        var gi = this.groupingInfos[level];
        var groupCollapsed = gi.collapsed;
        var toggledGroups = this.toggledGroupsByLevel[level];
        var idx = groups.length, g;
        while (idx--) {
            g = groups[idx];

            if (g.collapsed && !gi.aggregateCollapsed) {
                continue;
            }

            // Do a depth-first aggregation so that parent group aggregators can access subgroup totals.
            if (g.groups) {
                this.addTotals(g.groups, level + 1);
            }

            if (gi.aggregators.length && (
                gi.aggregateEmpty || g.rows.length || (g.groups && g.groups.length))) {
                this.addGroupTotals(g);
            }

            g.collapsed = groupCollapsed ^ toggledGroups[g.groupingKey];
            g.title = gi.formatter ? gi.formatter(g) : g.value;
        }
    }

    private flattenGroupedRows(groups, level?) {
        level = level || 0;
        var gi = this.groupingInfos[level];
        var groupedRows = [], rows, gl = 0, g;
        for (var i = 0, l = groups.length; i < l; i++) {
            g = groups[i];
            groupedRows[gl++] = g;

            if (!g.collapsed) {
                rows = g.groups ? this.flattenGroupedRows(g.groups, level + 1) : g.rows;
                for (var j = 0, jj = rows.length; j < jj; j++) {
                    groupedRows[gl++] = rows[j];
                }
            }

            if (g.totals && gi.displayTotalsRow && (!g.collapsed || gi.aggregateCollapsed)) {
                groupedRows[gl++] = g.totals;
            }
        }
        return groupedRows;
    }

    private getFunctionInfo(fn) {
        var fnStr = fn.toString();
        var usingEs5 = fnStr.indexOf('function') >= 0; // with ES6, the word function is not present
        var fnRegex = usingEs5 ? /^function[^(]*\(([^)]*)\)\s*{([\s\S]*)}$/ : /^[^(]*\(([^)]*)\)\s*{([\s\S]*)}$/;
        var matches = fn.toString().match(fnRegex);
        return {
            params: matches[1].split(","),
            body: matches[2]
        };
    }

    private compileAccumulatorLoop(aggregator) {
        if (aggregator.accumulate) {
            var accumulatorInfo = this.getFunctionInfo(aggregator.accumulate);
            var fn = new Function(
                "_items",
                "for (var " + accumulatorInfo.params[0] + ", _i=0, _il=_items.length; _i<_il; _i++) {" +
                accumulatorInfo.params[0] + " = _items[_i]; " +
                accumulatorInfo.body +
                "}"
            );
            var fnName = "compiledAccumulatorLoop";
            (fn as any).displayName = fnName;
            (fn as any).name = this.setFunctionName(fn, fnName);
            return fn;
        } else {
            return function noAccumulator() {
            }
        }
    }

    private compileFilter() {
        var filterInfo = this.getFunctionInfo(this.filter);

        var filterPath1 = "{ continue _coreloop; }$1";
        var filterPath2 = "{ _retval[_idx++] = $item$; continue _coreloop; }$1";
        // make some allowances for minification - there's only so far we can go with RegEx
        var filterBody = filterInfo.body
            .replace(/return false\s*([;}]|\}|$)/gi, filterPath1)
            .replace(/return!1([;}]|\}|$)/gi, filterPath1)
            .replace(/return true\s*([;}]|\}|$)/gi, filterPath2)
            .replace(/return!0([;}]|\}|$)/gi, filterPath2)
            .replace(/return ([^;}]+?)\s*([;}]|$)/gi,
                "{ if ($1) { _retval[_idx++] = $item$; }; continue _coreloop; }$2");

        // This preserves the function template code after JS compression,
        // so that replace() commands still work as expected.
        var tpl = [
            //"function(_items, _args) { ",
            "var _retval = [], _idx = 0; ",
            "var $item$, $args$ = _args; ",
            "_coreloop: ",
            "for (var _i = 0, _il = _items.length; _i < _il; _i++) { ",
            "$item$ = _items[_i]; ",
            "$filter$; ",
            "} ",
            "return _retval; "
            //"}"
        ].join("");
        tpl = tpl.replace(/\$filter\$/gi, filterBody);
        tpl = tpl.replace(/\$item\$/gi, filterInfo.params[0]);
        tpl = tpl.replace(/\$args\$/gi, filterInfo.params[1]);

        var fn = new Function("_items,_args", tpl);
        var fnName = "compiledFilter";
        (fn as any).displayName = fnName;
        (fn as any).name = this.setFunctionName(fn, fnName);
        return fn;
    }

    private compileFilterWithCaching() {
        var filterInfo = this.getFunctionInfo(this.filter);

        var filterPath1 = "{ continue _coreloop; }$1";
        var filterPath2 = "{ _cache[_i] = true;_retval[_idx++] = $item$; continue _coreloop; }$1";
        // make some allowances for minification - there's only so far we can go with RegEx
        var filterBody = filterInfo.body
            .replace(/return false\s*([;}]|\}|$)/gi, filterPath1)
            .replace(/return!1([;}]|\}|$)/gi, filterPath1)
            .replace(/return true\s*([;}]|\}|$)/gi, filterPath2)
            .replace(/return!0([;}]|\}|$)/gi, filterPath2)
            .replace(/return ([^;}]+?)\s*([;}]|$)/gi,
                "{ if ((_cache[_i] = $1)) { _retval[_idx++] = $item$; }; continue _coreloop; }$2");

        // This preserves the function template code after JS compression,
        // so that replace() commands still work as expected.
        var tpl = [
            //"function(_items, _args, _cache) { ",
            "var _retval = [], _idx = 0; ",
            "var $item$, $args$ = _args; ",
            "_coreloop: ",
            "for (var _i = 0, _il = _items.length; _i < _il; _i++) { ",
            "$item$ = _items[_i]; ",
            "if (_cache[_i]) { ",
            "_retval[_idx++] = $item$; ",
            "continue _coreloop; ",
            "} ",
            "$filter$; ",
            "} ",
            "return _retval; "
            //"}"
        ].join("");
        tpl = tpl.replace(/\$filter\$/gi, filterBody);
        tpl = tpl.replace(/\$item\$/gi, filterInfo.params[0]);
        tpl = tpl.replace(/\$args\$/gi, filterInfo.params[1]);

        var fn = new Function("_items,_args,_cache", tpl);
        var fnName = "compiledFilterWithCaching";
        (fn as any).displayName = fnName;
        (fn as any).name = this.setFunctionName(fn, fnName);
        return fn;
    }

    /**
     * In ES5 we could set the function name on the fly but in ES6 this is forbidden and we need to set it through differently
     * We can use Object.defineProperty and set it the property to writable, see MDN for reference
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
     * @param {string} fn
     * @param {string} fnName
     */
    private setFunctionName(fn, fnName) {
        try {
            Object.defineProperty(fn, 'name', {
                writable: true,
                value: fnName
            });
        } catch (err) {
            fn.name = fnName;
        }
    }

    private uncompiledFilter(items, args) {
        var retval = [], idx = 0;

        for (var i = 0, ii = items.length; i < ii; i++) {
            if (this.filter(items[i], args)) {
                retval[idx++] = items[i];
            }
        }

        return retval;
    }

    private uncompiledFilterWithCaching(items, args, cache) {
        var retval = [], idx = 0, item;

        for (var i = 0, ii = items.length; i < ii; i++) {
            item = items[i];
            if (cache[i]) {
                retval[idx++] = item;
            } else if (this.filter(item, args)) {
                retval[idx++] = item;
                cache[i] = true;
            }
        }

        return retval;
    }

    private getFilteredAndPagedItems(items) {
        if (this.filter) {
            var batchFilter = this.options.inlineFilters ? this.compiledFilter : this.uncompiledFilter;
            var batchFilterWithCaching = this.options.inlineFilters ? this.compiledFilterWithCaching : this.uncompiledFilterWithCaching;

            if (this.refreshHints.isFilterNarrowing) {
                this.filteredItems = batchFilter(this.filteredItems, this.filterArgs);
            } else if (this.refreshHints.isFilterExpanding) {
                this.filteredItems = batchFilterWithCaching(items, this.filterArgs, this.filterCache);
            } else if (!this.refreshHints.isFilterUnchanged) {
                this.filteredItems = batchFilter(items, this.filterArgs);
            }
        } else {
            // special case:  if not filtering and not paging, the resulting
            // rows collection needs to be a copy so that changes due to sort
            // can be caught
            this.filteredItems = this.pagesize ? items : items.concat();
        }

        // get the current page
        var paged;
        if (this.pagesize) {
            if (this.filteredItems.length <= this.pagenum * this.pagesize) {
                if (this.filteredItems.length === 0) {
                    this.pagenum = 0;
                } else {
                    this.pagenum = Math.floor((this.filteredItems.length - 1) / this.pagesize);
                }
            }
            paged = this.filteredItems.slice(this.pagesize * this.pagenum, this.pagesize * this.pagenum + this.pagesize);
        } else {
            paged = this.filteredItems;
        }
        return { totalRows: this.filteredItems.length, rows: paged };
    }

    private getRowDiffs(rows, newRows) {
        var item, r, eitherIsNonData, diff = [];
        var from = 0, to = Math.max(newRows.length, rows.length);

        if (this.refreshHints && this.refreshHints.ignoreDiffsBefore) {
            from = Math.max(0,
                Math.min(newRows.length, this.refreshHints.ignoreDiffsBefore));
        }

        if (this.refreshHints && this.refreshHints.ignoreDiffsAfter) {
            to = Math.min(newRows.length,
                Math.max(0, this.refreshHints.ignoreDiffsAfter));
        }

        for (var i = from, rl = rows.length; i < to; i++) {
            if (i >= rl) {
                diff[diff.length] = i;
            } else {
                item = newRows[i];
                r = rows[i];

                if (!item || (this.groupingInfos.length && (eitherIsNonData = (item.__nonDataRow) || (r.__nonDataRow)) &&
                    item.__group !== r.__group ||
                    item.__group && !item.equals(r))
                    || (eitherIsNonData &&
                        // no good way to compare totals since they are arbitrary DTOs
                        // deep object comparison is pretty expensive
                        // always considering them 'dirty' seems easier for the time being
                        (item.__groupTotals || r.__groupTotals))
                    || item[this.idProperty] != r[this.idProperty]
                    || (this.updated && this.updated[item[this.idProperty]])
                ) {
                    diff[diff.length] = i;
                }
            }
        }
        return diff;
    }

    private recalc(_items) {
        this.rowsById = null;

        if (this.refreshHints.isFilterNarrowing != this.prevRefreshHints.isFilterNarrowing ||
            this.refreshHints.isFilterExpanding != this.prevRefreshHints.isFilterExpanding) {
            this.filterCache = [];
        }

        var filteredItems = this.getFilteredAndPagedItems(_items);
        this.totalRows = filteredItems.totalRows;
        var newRows = filteredItems.rows;

        this.groups = [];
        if (this.groupingInfos.length) {
            this.groups = this.extractGroups(newRows);
            if (this.groups.length) {
                newRows = this.flattenGroupedRows(this.groups);
            }
        }

        var diff = this.getRowDiffs(this.rows, newRows);

        this.rows = newRows;

        return diff;
    }

    public refresh() {
        if (this.suspend) {
            return;
        }

        var previousPagingInfo = $.extend(true, {}, this.getPagingInfo());

        var countBefore = this.rows.length;
        var totalRowsBefore = this.totalRows;

        var diff = this.recalc(this.items); // pass as direct refs to avoid closure perf hit

        // if the current page is no longer valid, go to last page and recalc
        // we suffer a performance penalty here, but the main loop (recalc) remains highly optimized
        if (this.pagesize && this.totalRows < this.pagenum * this.pagesize) {
            this.pagenum = Math.max(0, Math.ceil(this.totalRows / this.pagesize) - 1);
            diff = this.recalc(this.items);
        }

        this.updated = null;
        this.prevRefreshHints = this.refreshHints;
        this.refreshHints = {};

        if (totalRowsBefore !== this.totalRows) {
            this.onBeforePagingInfoChanged.notify(previousPagingInfo, null, self); // use the previously saved paging info
            this.onPagingInfoChanged.notify(this.getPagingInfo(), null, self);
        }
        if (countBefore !== this.rows.length) {
            this.onRowCountChanged.notify({ previous: countBefore, current: this.rows.length, itemCount: this.items.length, dataView: self, callingOnRowsChanged: (diff.length > 0) }, null, self);
        }
        if (diff.length > 0) {
            this.onRowsChanged.notify({ rows: diff, itemCount: this.items.length, dataView: self, calledOnRowCountChanged: (countBefore !== this.rows.length) }, null, self);
        }
        if (countBefore !== this.rows.length || diff.length > 0) {
            this.onRowsOrCountChanged.notify({
                rowsDiff: diff, previousRowCount: countBefore, currentRowCount: this.rows.length, itemCount: this.items.length,
                rowCountChanged: countBefore !== this.rows.length, rowsChanged: diff.length > 0, dataView: self
            }, null, self);
        }
    }
    /***
     * Wires the grid and the DataView together to keep row selection tied to item ids.
     * This is useful since, without it, the grid only knows about rows, so if the items
     * move around, the same rows stay selected instead of the selection moving along
     * with the items.
     *
     * NOTE:  This doesn't work with cell selection model.
     *
     * @param grid {Slick.Grid} The grid to sync selection with.
     * @param preserveHidden {Boolean} Whether to keep selected items that go out of the
     *     view due to them getting filtered out.
     * @param preserveHiddenOnSelectionChange {Boolean} Whether to keep selected items
     *     that are currently out of the view (see preserveHidden) as selected when selection
     *     changes.
     * @return {Slick.Event} An event that notifies when an internal list of selected row ids
     *     changes.  This is useful since, in combination with the above two options, it allows
     *     access to the full list selected row ids, and not just the ones visible to the grid.
     * @method syncGridSelection
     */
    public syncGridSelection(grid, preserveHidden, preserveHiddenOnSelectionChange) {
        var self = this;
        this._grid = grid;
        var inHandler;
        this.selectedRowIds = self.mapRowsToIds(grid.getSelectedRows());
        var onSelectedRowIdsChanged = new Event();

        const setSelectedRowIds = (rowIds) => {
            if (this.selectedRowIds.join(",") == rowIds.join(",")) {
                return;
            }

            this.selectedRowIds = rowIds;

            onSelectedRowIdsChanged.notify({
                "grid": grid,
                "ids": this.selectedRowIds,
                "dataView": self
            }, new EventData(), self);
        }

        const update = () => {
            if (this.selectedRowIds.length > 0) {
                inHandler = true;
                var selectedRows = self.mapIdsToRows(this.selectedRowIds);
                if (!preserveHidden) {
                    setSelectedRowIds(self.mapRowsToIds(selectedRows));
                }
                grid.setSelectedRows(selectedRows);
                inHandler = false;
            }
        }

        grid.onSelectedRowsChanged.subscribe((e, args) => {
            if (inHandler) { return; }
            var newSelectedRowIds = self.mapRowsToIds(grid.getSelectedRows());
            if (!preserveHiddenOnSelectionChange || !grid.getOptions().multiSelect) {
                setSelectedRowIds(newSelectedRowIds);
            } else {
                // keep the ones that are hidden
                var existing = $.grep(this.selectedRowIds, function (id) { return self.getRowById(id) === undefined; });
                // add the newly selected ones
                setSelectedRowIds(existing.concat(newSelectedRowIds));
            }
        });

        this.onRowsOrCountChanged.subscribe(update);

        return onSelectedRowIdsChanged;
    }

    /** Get all selected IDs */
    public getAllSelectedIds() {
        return this.selectedRowIds;
    }

    /** Get all selected dataContext items */
    public getAllSelectedItems() {
        var selectedData = [];
        var selectedIds = this.getAllSelectedIds();
        selectedIds.forEach((id) => {
            selectedData.push(this.getItemById(id));
        });
        return selectedData;
    }

    public syncGridCellCssStyles(grid, key) {
        var hashById;
        var inHandler;

        const storeCellCssStyles = (hash) => {
            hashById = {};
            for (var row in hash) {
                var id = this.rows[row][this.idProperty];
                hashById[id] = hash[row];
            }
        }

        // since this method can be called after the cell styles have been set,
        // get the existing ones right away
        storeCellCssStyles(grid.getCellCssStyles(key));


        const update = () => {
            if (hashById) {
                inHandler = true;
                this.ensureRowsByIdCache();
                var newHash = {};
                for (var id in hashById) {
                    var row = this.rowsById[id];
                    if (row != undefined) {
                        newHash[row] = hashById[id];
                    }
                }
                grid.setCellCssStyles(key, newHash);
                inHandler = false;
            }
        }

        grid.onCellCssStylesChanged.subscribe((e, args) => {
            if (inHandler) { return; }
            if (key != args.key) { return; }
            if (args.hash) {
                storeCellCssStyles(args.hash);
            } else {
                grid.onCellCssStylesChanged.unsubscribe();
                this.onRowsOrCountChanged.unsubscribe(update);
            }
        });

        this.onRowsOrCountChanged.subscribe(update);
    }
}