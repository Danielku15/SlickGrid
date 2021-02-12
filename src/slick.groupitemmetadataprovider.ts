import { Group, keyCode } from "./slick.core";
import { Grid } from './slick.grid'

/***
 * Provides item metadata for group (Slick.Group) and totals (Slick.Totals) rows produced by the DataView.
 * This metadata overrides the default behavior and formatting of those rows so that they appear and function
 * correctly when processed by the grid.
 *
 * This class also acts as a grid plugin providing event handlers to expand & collapse groups.
 * If "grid.registerPlugin(...)" is not called, expand & collapse will not work.
 */
class GroupItemMetadataProvider {
    private _grid;
    private _defaults = {
        checkboxSelect: false,
        checkboxSelectCssClass: "slick-group-select-checkbox",
        checkboxSelectPlugin: null,
        groupCssClass: "slick-group",
        groupTitleCssClass: "slick-group-title",
        totalsCssClass: "slick-group-totals",
        groupFocusable: true,
        totalsFocusable: false,
        toggleCssClass: "slick-group-toggle",
        toggleExpandedCssClass: "expanded",
        toggleCollapsedCssClass: "collapsed",
        enableExpandCollapse: true,
        groupFormatter: this.defaultGroupCellFormatter,
        totalsFormatter: this.defaultTotalsCellFormatter,
        includeHeaderTotals: false
    };

    private options;

    public constructor(inputOptions?) {
        this.options = $.extend(true, {}, this._defaults, inputOptions);
    }


    public getOptions() {
        return this.options;
    }

    public setOptions(inputOptions) {
        $.extend(true, this.options, inputOptions);
    }

    private defaultGroupCellFormatter(row, cell, value, columnDef, item, grid) {
        if (!this.options.enableExpandCollapse) {
            return item.title;
        }

        var indentation = item.level * 15 + "px";

        return (this.options.checkboxSelect ? '<span class="' + this.options.checkboxSelectCssClass +
            ' ' + (item.selectChecked ? 'checked' : 'unchecked') + '"></span>' : '') +
            "<span class='" + this.options.toggleCssClass + " " +
            (item.collapsed ? this.options.toggleCollapsedCssClass : this.options.toggleExpandedCssClass) +
            "' style='margin-left:" + indentation + "'>" +
            "</span>" +
            "<span class='" + this.options.groupTitleCssClass + "' level='" + item.level + "'>" +
            item.title +
            "</span>";
    }

    private defaultTotalsCellFormatter(row, cell, value, columnDef, item, grid) {
        return (columnDef.groupTotalsFormatter && columnDef.groupTotalsFormatter(item, columnDef, grid)) || "";
    }


    public init(grid) {
        this._grid = grid;
        const handleGridClick = this.handleGridClick.bind(this);
        this._grid.onClick.subscribe(function (this: Grid, e, args) {
            handleGridClick(this, e, args);
        });
        const handleGridKeyDown = this.handleGridKeyDown.bind(this);
        this._grid.onKeyDown.subscribe(function (this: Grid, e, args) {
            handleGridKeyDown(this, e, args);
        });
    }

    public destroy() {
        if (this._grid) {
            this._grid.onClick.unsubscribe(this.handleGridClick);
            this._grid.onKeyDown.unsubscribe(this.handleGridKeyDown);
        }
    }

    private handleGridClick(grid: Grid, e, args) {
        var $target = $(e.target);
        var item = grid.getDataItem(args.row);
        if (item && item instanceof Group && $target.hasClass(this.options.toggleCssClass)) {
            var range = this._grid.getRenderedRange();
            grid.getData().setRefreshHints({
                ignoreDiffsBefore: range.top,
                ignoreDiffsAfter: range.bottom + 1
            });

            if (item.collapsed) {
                grid.getData().expandGroup(item.groupingKey);
            } else {
                grid.getData().collapseGroup(item.groupingKey);
            }

            e.stopImmediatePropagation();
            e.preventDefault();
        }
        if (item && item instanceof Group && $target.hasClass(this.options.checkboxSelectCssClass)) {
            item.selectChecked = !item.selectChecked;
            $target.removeClass((item.selectChecked ? "unchecked" : "checked"));
            $target.addClass((item.selectChecked ? "checked" : "unchecked"));
            // get rowIndexes array
            var rowIndexes = this._grid.getData().mapItemsToRows(item.rows);
            (item.selectChecked ? this.options.checkboxSelectPlugin.selectRows : this.options.checkboxSelectPlugin.deSelectRows)(rowIndexes);
        }
    }

    // TODO:  add -/+ handling
    private handleGridKeyDown(grid: Grid, e, args) {
        if (this.options.enableExpandCollapse && (e.which == keyCode.SPACE)) {
            var activeCell = grid.getActiveCell();
            if (activeCell) {
                var item = grid.getDataItem(activeCell.row);
                if (item && item instanceof Group) {
                    var range = this._grid.getRenderedRange();
                    grid.getData().setRefreshHints({
                        ignoreDiffsBefore: range.top,
                        ignoreDiffsAfter: range.bottom + 1
                    });

                    if (item.collapsed) {
                        grid.getData().expandGroup(item.groupingKey);
                    } else {
                        grid.getData().collapseGroup(item.groupingKey);
                    }

                    e.stopImmediatePropagation();
                    e.preventDefault();
                }
            }
        }
    }

    public getGroupRowMetadata(item) {
        var groupLevel = item && item.level;
        return {
            selectable: false,
            focusable: this.options.groupFocusable,
            cssClasses: this.options.groupCssClass + ' slick-group-level-' + groupLevel,
            formatter: this.options.includeHeaderTotals && this.options.totalsFormatter,
            columns: {
                0: {
                    colspan: this.options.includeHeaderTotals ? "1" : "*",
                    formatter: this.options.groupFormatter,
                    editor: null
                }
            }
        };
    }

    public getTotalsRowMetadata(item) {
        var groupLevel = item && item.group && item.group.level;
        return {
            selectable: false,
            focusable: this.options.totalsFocusable,
            cssClasses: this.options.totalsCssClass + ' slick-group-level-' + groupLevel,
            formatter: this.options.totalsFormatter,
            editor: null
        };
    }
}

export const Data = {
    GroupItemMetadataProvider
};