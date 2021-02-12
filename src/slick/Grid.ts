/**
 * @license
 * (c) 2009-2016 Michael Leibman
 * michael{dot}leibman{at}gmail{dot}com
 * http://github.com/mleibman/slickgrid
 *
 * Distributed under MIT license.
 * All rights reserved.
 *
 * SlickGrid v2.4
 *
 * NOTES:
 *     Cell/row DOM manipulations are done directly bypassing jQuery's DOM manipulation methods.
 *     This increases the speed dramatically, but can only be done safely because there are no event handlers
 *     or data associated with any cell/row DOM nodes.  Cell editors must make sure they implement .destroy()
 *     and do proper cleanup.
 */

import moment from 'moment';
import { ColAutosizeMode } from './core/ColAutosizeMode';
import { GlobalEditorLock } from './core/EditorLock';
import { Event } from './core/Event';
import { EventData } from './core/EventData';
import { Range } from './core/Range';
import { GridAutosizeColsMode } from './core/GridAutosizeColsMode';
import { IColumnIndexAccess } from './core/IColumnIndexAccess';
import { preClickClassName } from './core/preClickClassName';
import { RowSelectionMode } from './core/RowSelectionMode';
import { TreeColumns } from './core/TreeColumns';
import { ValueFilterMode } from './core/ValueFilterMode';
import { WidthEvalMode } from './core/WidthEvalMode';

// shared across all grids on the page
var scrollbarDimensions;
var maxSupportedCssHeight;  // browser's breaking point

//////////////////////////////////////////////////////////////////////////////////////////////
// SlickGrid class implementation (available as Slick.Grid)

/**
 * Creates a new instance of the grid.
 * @class SlickGrid
 * @constructor
 * @param {Node}               this.container   Container node to create the grid in.
 * @param {Array,Object}      data        An array of objects for databinding.
 * @param {Array}             columns     An array of column definitions.
 * @param {Object}            this.options     Grid this.options.
 **/
export class Grid implements IColumnIndexAccess {
    public slickGridVersion = "2.4.33";
   
    private container;
    private data;
    private columns;
    private options;

    public constructor(container, data, columns, options) {
        this.container = this.container;
        this.data = data;
        this.columns = columns;
        this.options = this.options;
        this.internalInit()
    }

    // settings
    private defaults = {
        alwaysShowVerticalScroll: false,
        alwaysAllowHorizontalScroll: false,
        explicitInitialization: false,
        rowHeight: 25,
        defaultColumnWidth: 80,
        enableAddRow: false,
        leaveSpaceForNewRows: false,
        editable: false,
        autoEdit: true,
        suppressActiveCellChangeOnEdit: false,
        enableCellNavigation: true,
        enableColumnReorder: true,
        asyncEditorLoading: false,
        asyncEditorLoadDelay: 100,
        forceFitColumns: false,
        enableAsyncPostRender: false,
        asyncPostRenderDelay: 50,
        enableAsyncPostRenderCleanup: false,
        asyncPostRenderCleanupDelay: 40,
        autoHeight: false,
        editorLock: GlobalEditorLock,
        showColumnHeader: true,
        showHeaderRow: false,
        headerRowHeight: 25,
        createFooterRow: false,
        showFooterRow: false,
        footerRowHeight: 25,
        createPreHeaderPanel: false,
        showPreHeaderPanel: false,
        preHeaderPanelHeight: 25,
        showTopPanel: false,
        topPanelHeight: 25,
        formatterFactory: null,
        editorFactory: null,
        cellFlashingCssClass: "flashing",
        selectedCellCssClass: "selected",
        multiSelect: true,
        enableTextSelectionOnCells: false,
        dataItemColumnValueExtractor: null,
        frozenBottom: false,
        frozenColumn: -1,
        frozenRow: -1,
        fullWidthRows: false,
        multiColumnSort: false,
        numberedMultiColumnSort: false,
        tristateMultiColumnSort: false,
        sortColNumberInSeparateSpan: false,
        defaultFormatter: this.defaultFormatter,
        forceSyncScrolling: false,
        addNewRowCssClass: "new-row",
        preserveCopiedSelectionOnPaste: false,
        showCellSelection: true,
        viewportClass: null,
        minRowBuffer: 3,
        emulatePagingWhenScrolling: true, // when scrolling off bottom of viewport, place new row at top of viewport
        editorCellNavOnLRKeys: false,
        enableMouseWheelScrollHandler: true,
        doPaging: true,
        autosizeColsMode: GridAutosizeColsMode.LegacyOff,
        autosizeColPaddingPx: 4,
        autosizeTextAvgToMWidthRatio: 0.75,
        viewportSwitchToScrollModeWidthPercent: undefined,
        viewportMinWidthPx: undefined,
        viewportMaxWidthPx: undefined,
        suppressCssChangesOnHiddenInit: false
    };

    private columnDefaults = {
        name: "",
        resizable: true,
        sortable: false,
        minWidth: 30,
        maxWidth: undefined,
        rerenderOnResize: false,
        headerCssClass: null,
        defaultSortAsc: true,
        focusable: true,
        selectable: true,
        width: undefined
    };

    private columnAutosizeDefaults = {
        ignoreHeaderText: false,
        colValueArray: undefined,
        allowAddlPercent: undefined,
        formatterOverride: undefined,
        autosizeMode: ColAutosizeMode.ContentIntelligent,
        rowSelectionModeOnInit: undefined,
        rowSelectionMode: RowSelectionMode.FirstNRows,
        rowSelectionCount: 100,
        valueFilterMode: ValueFilterMode.None,
        widthEvalMode: WidthEvalMode.CanvasTextSize,
        sizeToRemaining: undefined,
        widthPx: undefined,
        colDataTypeOf: undefined
    };

    // scroller
    private th;   // virtual height
    private h;    // real scrollable height
    private ph;   // page height
    private n;    // number of pages
    private cj;   // "jumpiness" coefficient

    private page = 0;       // current page
    private offset = 0;     // current page offset
    private vScrollDir = 1;

    // private
    private initialized = false;
    private $container: JQuery;
    private uid = "slickgrid_" + Math.round(1000000 * Math.random());
    private self = this;
    private $focusSink;
    private $focusSink2;
    private $groupHeaders = $();
    private $headerScroller;
    private $headers: JQuery;
    private $headerRow;
    private $headerRowScroller;
    private $headerRowSpacerL;
    private $headerRowSpacerR;
    private $preHeaderPanel;
    private $preHeaderPanelScroller;
    private $preHeaderPanelSpacer;
    private $preHeaderPanelR;
    private $preHeaderPanelScrollerR;
    private $preHeaderPanelSpacerR;
    private $topPanelScroller;
    private $topPanel;
    private $viewport;
    private $canvas;
    private $style;
    private $boundAncestors;
    private treeColumns;
    private stylesheet;
    private columnCssRulesL;
    private columnCssRulesR;
    private viewportH;
    private viewportW: number;
    private canvasWidth;
    private canvasWidthL;
    private canvasWidthR;
    private headersWidth;
    private headersWidthL;
    private headersWidthR;
    private viewportHasHScroll;
    private viewportHasVScroll;
    // border+padding
    private headerColumnWidthDiff = 0;
    private headerColumnHeightDiff = 0;
    private cellWidthDiff = 0;
    private cellHeightDiff = 0;
    private jQueryNewWidthBehaviour = false;
    private absoluteColumnMinWidth;
    private hasFrozenRows = false;
    private frozenRowsHeight = 0;
    private actualFrozenRow = -1;
    private paneTopH = 0;
    private paneBottomH = 0;
    private viewportTopH = 0;
    private viewportBottomH = 0;
    private topPanelH = 0;
    private headerRowH = 0;
    private footerRowH = 0;

    private tabbingDirection = 1;
    private $activeCanvasNode;
    private $activeViewportNode;
    private activePosX;
    private activeRow;
    private activeCell;
    private activeCellNode = null;
    private currentEditor = null;
    private serializedEditorValue;
    private editController;

    private rowsCache = {};
    private renderedRows = 0;
    private numVisibleRows = 0;
    private prevScrollTop = 0;
    private scrollTop = 0;
    private lastRenderedScrollTop = 0;
    private lastRenderedScrollLeft = 0;
    private prevScrollLeft = 0;
    private scrollLeft = 0;

    private selectionModel;
    private selectedRows = [];

    private plugins = [];
    private cellCssClasses = {};

    private columnsById = {};
    private sortColumns = [];
    private columnPosLeft = [];
    private columnPosRight = [];

    private pagingActive = false;
    private pagingIsLastPage = false;

    private scrollThrottle = this.ActionThrottle(this.render, 50);

    // async call handles
    private h_editorLoader = null;
    private h_render = null;
    private h_postrender = null;
    private h_postrenderCleanup = null;
    private postProcessedRows = {};
    private postProcessToRow = null;
    private postProcessFromRow = null;
    private postProcessedCleanupQueue = [];
    private postProcessgroupId = 0;

    // perf counters
    private counter_rows_rendered = 0;
    private counter_rows_removed = 0;

    // These two variables work around a bug with inertial scrolling in Webkit/Blink on Mac.
    // See http://crbug.com/312427.
    private rowNodeFromLastMouseWheelEvent;  // this node must not be deleted while inertial scrolling
    private zombieRowNodeFromLastMouseWheelEvent;  // node that was hidden instead of getting deleted
    private zombieRowCacheFromLastMouseWheelEvent;  // row cache for above node
    private zombieRowPostProcessedFromLastMouseWheelEvent;  // post processing references for above node

    private $paneHeaderL;
    private $paneHeaderR;
    private $paneTopL;
    private $paneTopR;
    private $paneBottomL;
    private $paneBottomR;

    private $headerScrollerL;
    private $headerScrollerR;

    private $headerL;
    private $headerR;

    private $groupHeader;
    private $groupHeadersL;
    private $groupHeadersR;

    private $headerRowScrollerL;
    private $headerRowScrollerR;

    private $footerRowScroller;
    private $footerRowScrollerL;
    private $footerRowScrollerR;

    private $footerRowSpacerL;
    private $footerRowSpacerR;

    private $headerRowL;
    private $headerRowR;

    private $footerRow;
    private $footerRowL;
    private $footerRowR;

    private $topPanelScrollerL;
    private $topPanelScrollerR;

    private $topPanelL;
    private $topPanelR;

    private $viewportTopL;
    private $viewportTopR;
    private $viewportBottomL;
    private $viewportBottomR;

    private $canvasTopL;
    private $canvasTopR;
    private $canvasBottomL;
    private $canvasBottomR;

    private $viewportScrollContainerX;
    private $viewportScrollContainerY;
    private $headerScrollContainer;
    private $headerRowScrollContainer;
    private $footerRowScrollContainer;

    // store css attributes if display:none is active in  this.container or parent
    private cssShow = { position: 'absolute', visibility: 'hidden', display: 'block' };
    private $hiddenParents: JQuery;
    private oldProps = [];
    private columnResizeDragging = false;

    //////////////////////////////////////////////////////////////////////////////////////////////
    // Initialization

    private internalInit() {
        if (this.container instanceof jQuery) {
            this.$container = this.container as JQuery;
        } else {
            this.$container = $(this.container);
        }
        if (this.$container.length < 1) {
            throw new Error("SlickGrid requires a valid  this.container, " + this.container + " does not exist in the DOM.");
        }

        if (!this.options.suppressCssChangesOnHiddenInit) { this.cacheCssForHiddenInit(); }

        // calculate these only once and share between grid instances
        maxSupportedCssHeight = maxSupportedCssHeight || this.getMaxSupportedCssHeight();

        this.options = $.extend({}, this.defaults, this.options);
        this.validateAndEnforceOptions();
        this.columnDefaults.width = this.options.defaultColumnWidth;

        this.treeColumns = new TreeColumns(this.columns);
        this.columns = this.treeColumns.extractColumns();

        this.updateColumnProps();

        // validate loaded JavaScript modules against requested this.options
        if (this.options.enableColumnReorder && !$.fn.sortable) {
            throw new Error("SlickGrid's 'enableColumnReorder = true' option requires jquery-ui.sortable module to be loaded");
        }

        this.editController = {
            "commitCurrentEdit": this.commitCurrentEdit.bind(this),
            "cancelCurrentEdit": this.cancelCurrentEdit.bind(this)
        };

        this.$container
            .empty()
            .css("overflow", "hidden")
            .css("outline", 0)
            .addClass(this.uid)
            .addClass("ui-widget");

        // set up a positioning  this.container if needed
        if (!(/relative|absolute|fixed/).test(this.$container.css("position"))) {
            this.$container.css("position", "relative");
        }

        this.$focusSink = $("<div tabIndex='0' hideFocus style='position:fixed;width:0;height:0;top:0;left:0;outline:0;'></div>").appendTo(this.$container);

        // Containers used for scrolling frozen columns and rows
        this.$paneHeaderL = $("<div class='slick-pane slick-pane-header slick-pane-left' tabIndex='0' />").appendTo(this.$container);
        this.$paneHeaderR = $("<div class='slick-pane slick-pane-header slick-pane-right' tabIndex='0' />").appendTo(this.$container);
        this.$paneTopL = $("<div class='slick-pane slick-pane-top slick-pane-left' tabIndex='0' />").appendTo(this.$container);
        this.$paneTopR = $("<div class='slick-pane slick-pane-top slick-pane-right' tabIndex='0' />").appendTo(this.$container);
        this.$paneBottomL = $("<div class='slick-pane slick-pane-bottom slick-pane-left' tabIndex='0' />").appendTo(this.$container);
        this.$paneBottomR = $("<div class='slick-pane slick-pane-bottom slick-pane-right' tabIndex='0' />").appendTo(this.$container);

        if (this.options.createPreHeaderPanel) {
            this.$preHeaderPanelScroller = $("<div class='slick-preheader-panel ui-state-default' style='overflow:hidden;position:relative;' />").appendTo(this.$paneHeaderL);
            this.$preHeaderPanel = $("<div />").appendTo(this.$preHeaderPanelScroller);
            this.$preHeaderPanelSpacer = $("<div style='display:block;height:1px;position:absolute;top:0;left:0;'></div>")
                .appendTo(this.$preHeaderPanelScroller);

            this.$preHeaderPanelScrollerR = $("<div class='slick-preheader-panel ui-state-default' style='overflow:hidden;position:relative;' />").appendTo(this.$paneHeaderR);
            this.$preHeaderPanelR = $("<div />").appendTo(this.$preHeaderPanelScrollerR);
            this.$preHeaderPanelSpacerR = $("<div style='display:block;height:1px;position:absolute;top:0;left:0;'></div>")
                .appendTo(this.$preHeaderPanelScrollerR);

            if (!this.options.showPreHeaderPanel) {
                this.$preHeaderPanelScroller.hide();
                this.$preHeaderPanelScrollerR.hide();
            }
        }

        // Append the header scroller containers
        this.$headerScrollerL = $("<div class='slick-header ui-state-default slick-header-left' />").appendTo(this.$paneHeaderL);
        this.$headerScrollerR = $("<div class='slick-header ui-state-default slick-header-right' />").appendTo(this.$paneHeaderR);

        // Cache the header scroller containers
        this.$headerScroller = $().add(this.$headerScrollerL).add(this.$headerScrollerR);

        if (this.treeColumns.hasDepth()) {
            this.$groupHeadersL = [];
            this.$groupHeadersR = [];
            for (var index = 0; index < this.treeColumns.getDepth() - 1; index++) {
                this.$groupHeadersL[index] = $("<div class='slick-group-header-columns slick-group-header-columns-left' style='left:-1000px' />").appendTo(this.$headerScrollerL);
                this.$groupHeadersR[index] = $("<div class='slick-group-header-columns slick-group-header-columns-right' style='left:-1000px' />").appendTo(this.$headerScrollerR);
            }

            this.$groupHeaders = $().add(this.$groupHeadersL).add(this.$groupHeadersR);
        }

        // Append the columnn containers to the headers
        this.$headerL = $("<div class='slick-header-columns slick-header-columns-left' style='left:-1000px' />").appendTo(this.$headerScrollerL);
        this.$headerR = $("<div class='slick-header-columns slick-header-columns-right' style='left:-1000px' />").appendTo(this.$headerScrollerR);

        // Cache the header columns
        this.$headers = $().add(this.$headerL).add(this.$headerR);

        this.$headerRowScrollerL = $("<div class='slick-headerrow ui-state-default' />").appendTo(this.$paneTopL);
        this.$headerRowScrollerR = $("<div class='slick-headerrow ui-state-default' />").appendTo(this.$paneTopR);

        this.$headerRowScroller = $().add(this.$headerRowScrollerL).add(this.$headerRowScrollerR);

        this.$headerRowSpacerL = $("<div style='display:block;height:1px;position:absolute;top:0;left:0;'></div>")
            .appendTo(this.$headerRowScrollerL);
        this.$headerRowSpacerR = $("<div style='display:block;height:1px;position:absolute;top:0;left:0;'></div>")
            .appendTo(this.$headerRowScrollerR);


        this.$headerRowL = $("<div class='slick-headerrow-columns slick-headerrow-columns-left' />").appendTo(this.$headerRowScrollerL);
        this.$headerRowR = $("<div class='slick-headerrow-columns slick-headerrow-columns-right' />").appendTo(this.$headerRowScrollerR);

        this.$headerRow = $().add(this.$headerRowL).add(this.$headerRowR);

        // Append the top panel scroller
        this.$topPanelScrollerL = $("<div class='slick-top-panel-scroller ui-state-default' />").appendTo(this.$paneTopL);
        this.$topPanelScrollerR = $("<div class='slick-top-panel-scroller ui-state-default' />").appendTo(this.$paneTopR);

        this.$topPanelScroller = $().add(this.$topPanelScrollerL).add(this.$topPanelScrollerR);

        // Append the top panel
        this.$topPanelL = $("<div class='slick-top-panel' style='width:10000px' />").appendTo(this.$topPanelScrollerL);
        this.$topPanelR = $("<div class='slick-top-panel' style='width:10000px' />").appendTo(this.$topPanelScrollerR);

        this.$topPanel = $().add(this.$topPanelL).add(this.$topPanelR);

        if (!this.options.showColumnHeader) {
            this.$headerScroller.hide();
        }

        if (!this.options.showTopPanel) {
            this.$topPanelScroller.hide();
        }

        if (!this.options.showHeaderRow) {
            this.$headerRowScroller.hide();
        }

        // Append the viewport containers
        this.$viewportTopL = $("<div class='slick-viewport slick-viewport-top slick-viewport-left' tabIndex='0' hideFocus />").appendTo(this.$paneTopL);
        this.$viewportTopR = $("<div class='slick-viewport slick-viewport-top slick-viewport-right' tabIndex='0' hideFocus />").appendTo(this.$paneTopR);
        this.$viewportBottomL = $("<div class='slick-viewport slick-viewport-bottom slick-viewport-left' tabIndex='0' hideFocus />").appendTo(this.$paneBottomL);
        this.$viewportBottomR = $("<div class='slick-viewport slick-viewport-bottom slick-viewport-right' tabIndex='0' hideFocus />").appendTo(this.$paneBottomR);

        // Cache the viewports
        this.$viewport = $().add(this.$viewportTopL).add(this.$viewportTopR).add(this.$viewportBottomL).add(this.$viewportBottomR);


        // Default the active viewport to the top left
        this.$activeViewportNode = this.$viewportTopL;

        // Append the canvas containers
        this.$canvasTopL = $("<div class='grid-canvas grid-canvas-top grid-canvas-left' tabIndex='0' hideFocus />").appendTo(this.$viewportTopL);
        this.$canvasTopR = $("<div class='grid-canvas grid-canvas-top grid-canvas-right' tabIndex='0' hideFocus />").appendTo(this.$viewportTopR);
        this.$canvasBottomL = $("<div class='grid-canvas grid-canvas-bottom grid-canvas-left' tabIndex='0' hideFocus />").appendTo(this.$viewportBottomL);
        this.$canvasBottomR = $("<div class='grid-canvas grid-canvas-bottom grid-canvas-right' tabIndex='0' hideFocus />").appendTo(this.$viewportBottomR);
        if (this.options.viewportClass) this.$viewport.toggleClass(this.options.viewportClass, true);

        // Cache the canvases
        this.$canvas = $().add(this.$canvasTopL).add(this.$canvasTopR).add(this.$canvasBottomL).add(this.$canvasBottomR);

        scrollbarDimensions = scrollbarDimensions || this.measureScrollbar();

        // Default the active canvas to the top left
        this.$activeCanvasNode = this.$canvasTopL;

        // pre-header
        if (this.$preHeaderPanelSpacer) this.$preHeaderPanelSpacer.css("width", this.getCanvasWidth() + scrollbarDimensions.width + "px");
        this.$headers.width(this.getHeadersWidth());
        this.$headerRowSpacerL.css("width", this.getCanvasWidth() + scrollbarDimensions.width + "px");
        this.$headerRowSpacerR.css("width", this.getCanvasWidth() + scrollbarDimensions.width + "px");

        // footer Row
        if (this.options.createFooterRow) {
            this.$footerRowScrollerR = $("<div class='slick-footerrow ui-state-default' />").appendTo(this.$paneTopR);
            this.$footerRowScrollerL = $("<div class='slick-footerrow ui-state-default' />").appendTo(this.$paneTopL);

            this.$footerRowScroller = $().add(this.$footerRowScrollerL).add(this.$footerRowScrollerR);

            this.$footerRowSpacerL = $("<div style='display:block;height:1px;position:absolute;top:0;left:0;'></div>")
                .css("width", this.getCanvasWidth() + scrollbarDimensions.width + "px")
                .appendTo(this.$footerRowScrollerL);
            this.$footerRowSpacerR = $("<div style='display:block;height:1px;position:absolute;top:0;left:0;'></div>")
                .css("width", this.getCanvasWidth() + scrollbarDimensions.width + "px")
                .appendTo(this.$footerRowScrollerR);


            this.$footerRowL = $("<div class='slick-footerrow-columns slick-footerrow-columns-left' />").appendTo(this.$footerRowScrollerL);
            this.$footerRowR = $("<div class='slick-footerrow-columns slick-footerrow-columns-right' />").appendTo(this.$footerRowScrollerR);

            this.$footerRow = $().add(this.$footerRowL).add(this.$footerRowR);

            if (!this.options.showFooterRow) {
                this.$footerRowScroller.hide();
            }
        }

        this.$focusSink2 = this.$focusSink.clone().appendTo(this.$container);

        if (!this.options.explicitInitialization) {
            this.finishInitialization();
        }
    }

    public init() {
        this.finishInitialization();
    }

    private finishInitialization() {
        if (!this.initialized) {
            this.initialized = true;

            this.getViewportWidth();
            this.getViewportHeight();

            // header columns and cells may have different padding/border skewing width calculations (box-sizing, hello?)
            // calculate the diff so we can set consistent sizes
            this.measureCellPaddingAndBorder();

            // for usability reasons, all text selection in SlickGrid is disabled
            // with the exception of input and textarea elements (selection must
            // be enabled there so that editors work as expected); note that
            // selection in grid cells (grid body) is already unavailable in
            // all browsers except IE
            this.disableSelection(this.$headers); // disable all text selection in header (including input and textarea)

            if (!this.options.enableTextSelectionOnCells) {
                // disable text selection in grid cells except in input and textarea elements
                // (this is IE-specific, because selectstart event will only fire in IE)
                this.$viewport.on("selectstart.ui", function (event) {
                    return $(event.target).is("input,textarea");
                });
            }

            this.setFrozenOptions();
            this.setPaneVisibility();
            this.setScroller();
            this.setOverflow();

            this.updateColumnCaches();
            this.createColumnHeaders();
            this.createColumnGroupHeaders();
            this.createColumnFooter();
            this.setupColumnSort();
            this.createCssRules();
            this.resizeCanvas();
            this.bindAncestorScrollEvents();

            this.$container
                .on("resize.slickgrid", this.resizeCanvas);
            this.$viewport
                .on("scroll", this.handleScroll);

            if ((jQuery.fn as any).mousewheel && this.options.enableMouseWheelScrollHandler) {
                this.$viewport.on("mousewheel", this.handleMouseWheel);
            }

            this.$headerScroller
                //.on("scroll", handleHeaderScroll)
                .on("contextmenu", this.handleHeaderContextMenu)
                .on("click", this.handleHeaderClick)
                .on("mouseenter", ".slick-header-column", this.handleHeaderMouseEnter)
                .on("mouseleave", ".slick-header-column", this.handleHeaderMouseLeave);
            this.$headerRowScroller
                .on("scroll", this.handleHeaderRowScroll);

            if (this.options.createFooterRow) {
                this.$footerRow
                    .on("contextmenu", this.handleFooterContextMenu)
                    .on("click", this.handleFooterClick);

                this.$footerRowScroller
                    .on("scroll", this.handleFooterRowScroll);
            }

            if (this.options.createPreHeaderPanel) {
                this.$preHeaderPanelScroller
                    .on("scroll", this.handlePreHeaderPanelScroll);
            }

            this.$focusSink.add(this.$focusSink2)
                .on("keydown", this.handleKeyDown);
            this.$canvas
                .on("keydown", this.handleKeyDown)
                .on("click", this.handleClick)
                .on("dblclick", this.handleDblClick)
                .on("contextmenu", this.handleContextMenu)
                .on("draginit", this.handleDragInit)
                .on("dragstart", { distance: 3 }, this.handleDragStart)
                .on("drag", this.handleDrag)
                .on("dragend", this.handleDragEnd)
                .on("mouseenter", ".slick-cell", this.handleMouseEnter)
                .on("mouseleave", ".slick-cell", this.handleMouseLeave);

            if (!this.options.suppressCssChangesOnHiddenInit) { this.restoreCssFromHiddenInit(); }
        }
    }

    public cacheCssForHiddenInit() {
        // handle display:none on  this.container or  this.container parents
        this.$hiddenParents = this.$container.parents().addBack().not(':visible');
        this.$hiddenParents.each((i, el) => {
            var old = {};
            for (var name in this.cssShow) {
                old[name] = el.style[name];
                el.style[name] = this.cssShow[name];
            }
            this.oldProps.push(old);
        });
    }

    public restoreCssFromHiddenInit() {
        // finish handle display:none on  this.container or  this.container parents
        // - put values back the way they were
        this.$hiddenParents.each((i, el) => {
            var old = this.oldProps[i];
            for (var name in this.cssShow) {
                el.style[name] = old[name];
            }
        });
    }

    private hasFrozenColumns() {
        return this.options.frozenColumn > -1;
    }

    public registerPlugin(plugin) {
        this.plugins.unshift(plugin);
        plugin.init(self);
    }

    public unregisterPlugin(plugin) {
        for (var i = this.plugins.length; i >= 0; i--) {
            if (this.plugins[i] === plugin) {
                if (this.plugins[i].destroy) {
                    this.plugins[i].destroy();
                }
                this.plugins.splice(i, 1);
                break;
            }
        }
    }

    public getPluginByName(name) {
        for (var i = this.plugins.length - 1; i >= 0; i--) {
            if (this.plugins[i].pluginName === name) {
                return this.plugins[i];
            }
        }
        return undefined;
    }

    public setSelectionModel(model) {
        if (this.selectionModel) {
            this.selectionModel.onSelectedRangesChanged.unsubscribe(this.handleSelectedRangesChanged);
            if (this.selectionModel.destroy) {
                this.selectionModel.destroy();
            }
        }

        this.selectionModel = model;
        if (this.selectionModel) {
            this.selectionModel.init(self);
            this.selectionModel.onSelectedRangesChanged.subscribe(this.handleSelectedRangesChanged);
        }
    }

    public getSelectionModel() {
        return this.selectionModel;
    }

    public getCanvasNode(columnIdOrIdx, rowIndex) {
        if (!columnIdOrIdx) { columnIdOrIdx = 0; }
        if (!rowIndex) { rowIndex = 0; }

        var idx = (typeof columnIdOrIdx === "number" ? columnIdOrIdx : this.getColumnIndex(columnIdOrIdx));

        return (this.hasFrozenRows && rowIndex >= this.actualFrozenRow + (this.options.frozenBottom ? 0 : 1))
            ? ((this.hasFrozenColumns() && idx > this.options.frozenColumn) ? this.$canvasBottomR[0] : this.$canvasBottomL[0])
            : ((this.hasFrozenColumns() && idx > this.options.frozenColumn) ? this.$canvasTopR[0] : this.$canvasTopL[0])
            ;
    }

    public getActiveCanvasNode(element) {
        this.setActiveCanvasNode(element);

        return this.$activeCanvasNode[0];
    }

    public getCanvases() {
        return this.$canvas;
    }

    public setActiveCanvasNode(element) {
        if (element) {
            this.$activeCanvasNode = $(element.target).closest('.grid-canvas');
        }
    }

    public getViewportNode() {
        return this.$viewport[0];
    }

    public getActiveViewportNode(element) {
        this.setActiveViewportNode(element);
        return this.$activeViewportNode[0];
    }

    public setActiveViewportNode(element) {
        if (element) {
            this.$activeViewportNode = $(element.target).closest('.slick-viewport');
        }
    }

    private measureScrollbar() {
        var $outerdiv = $('<div class="' + this.$viewport.className + '" style="position:absolute; top:-10000px; left:-10000px; overflow:auto; width:100px; height:100px;"></div>').appendTo('body');
        var $innerdiv = $('<div style="width:200px; height:200px; overflow:auto;"></div>').appendTo($outerdiv);
        var dim = {
            width: $outerdiv[0].offsetWidth - $outerdiv[0].clientWidth,
            height: $outerdiv[0].offsetHeight - $outerdiv[0].clientHeight
        };
        $innerdiv.remove();
        $outerdiv.remove();
        return dim;
    }

    public getHeadersWidth() {
        this.headersWidth = this.headersWidthL = this.headersWidthR = 0;
        var includeScrollbar = !this.options.autoHeight;

        for (var i = 0, ii = this.columns.length; i < ii; i++) {
            var width = this.columns[i].width;

            if ((this.options.frozenColumn) > -1 && (i > this.options.frozenColumn)) {
                this.headersWidthR += width;
            } else {
                this.headersWidthL += width;
            }
        }

        if (includeScrollbar) {
            if ((this.options.frozenColumn) > -1 && (i > this.options.frozenColumn)) {
                this.headersWidthR += scrollbarDimensions.width;
            } else {
                this.headersWidthL += scrollbarDimensions.width;
            }
        }

        if (this.hasFrozenColumns()) {
            this.headersWidthL = this.headersWidthL + 1000;

            this.headersWidthR = Math.max(this.headersWidthR, this.viewportW) + this.headersWidthL;
            this.headersWidthR += scrollbarDimensions.width;
        } else {
            this.headersWidthL += scrollbarDimensions.width;
            this.headersWidthL = Math.max(this.headersWidthL, this.viewportW) + 1000;
        }

        this.headersWidth = this.headersWidthL + this.headersWidthR;
        return Math.max(this.headersWidth, this.viewportW) + 1000;
    }

    private getHeadersWidthL() {
        this.headersWidthL = 0;

        this.columns.forEach((column, i) => {
            if (!((this.options.frozenColumn) > -1 && (i > this.options.frozenColumn)))
                this.headersWidthL += column.width;
        });

        if (this.hasFrozenColumns()) {
            this.headersWidthL += 1000;
        } else {
            this.headersWidthL += scrollbarDimensions.width;
            this.headersWidthL = Math.max(this.headersWidthL, this.viewportW) + 1000;
        }

        return this.headersWidthL;
    }

    private getHeadersWidthR() {
        this.headersWidthR = 0;

        this.columns.forEach((column, i) => {
            if ((this.options.frozenColumn) > -1 && (i > this.options.frozenColumn))
                this.headersWidthR += column.width;
        });

        if (this.hasFrozenColumns()) {
            this.headersWidthR = Math.max(this.headersWidthR, this.viewportW) + this.getHeadersWidthL();
            this.headersWidthR += scrollbarDimensions.width;
        }

        return this.headersWidthR;
    }

    public getCanvasWidth() {
        var availableWidth = this.viewportHasVScroll ? this.viewportW - scrollbarDimensions.width : this.viewportW;
        var i = this.columns.length;

        this.canvasWidthL = this.canvasWidthR = 0;

        while (i--) {
            if (this.hasFrozenColumns() && (i > this.options.frozenColumn)) {
                this.canvasWidthR += this.columns[i].width;
            } else {
                this.canvasWidthL += this.columns[i].width;
            }
        }
        var totalRowWidth = this.canvasWidthL + this.canvasWidthR;
        return this.options.fullWidthRows ? Math.max(totalRowWidth, availableWidth) : totalRowWidth;
    }

    private updateCanvasWidth(forceColumnWidthsUpdate?) {
        var oldCanvasWidth = this.canvasWidth;
        var oldCanvasWidthL = this.canvasWidthL;
        var oldCanvasWidthR = this.canvasWidthR;
        var widthChanged;
        this.canvasWidth = this.getCanvasWidth();

        widthChanged = this.canvasWidth !== oldCanvasWidth || this.canvasWidthL !== oldCanvasWidthL || this.canvasWidthR !== oldCanvasWidthR;

        if (widthChanged || this.hasFrozenColumns() || this.hasFrozenRows) {
            this.$canvasTopL.width(this.canvasWidthL);

            this.getHeadersWidth();

            this.$headerL.width(this.headersWidthL);
            this.$headerR.width(this.headersWidthR);

            if (this.hasFrozenColumns()) {
                this.$canvasTopR.width(this.canvasWidthR);

                this.$paneHeaderL.width(this.canvasWidthL);
                this.$paneHeaderR.css('left', this.canvasWidthL);
                this.$paneHeaderR.css('width', this.viewportW - this.canvasWidthL);

                this.$paneTopL.width(this.canvasWidthL);
                this.$paneTopR.css('left', this.canvasWidthL);
                this.$paneTopR.css('width', this.viewportW - this.canvasWidthL);

                this.$headerRowScrollerL.width(this.canvasWidthL);
                this.$headerRowScrollerR.width(this.viewportW - this.canvasWidthL);

                this.$headerRowL.width(this.canvasWidthL);
                this.$headerRowR.width(this.canvasWidthR);

                if (this.options.createFooterRow) {
                    this.$footerRowScrollerL.width(this.canvasWidthL);
                    this.$footerRowScrollerR.width(this.viewportW - this.canvasWidthL);

                    this.$footerRowL.width(this.canvasWidthL);
                    this.$footerRowR.width(this.canvasWidthR);
                }
                if (this.options.createPreHeaderPanel) {
                    this.$preHeaderPanel.width(this.canvasWidth);
                }
                this.$viewportTopL.width(this.canvasWidthL);
                this.$viewportTopR.width(this.viewportW - this.canvasWidthL);

                if (this.hasFrozenRows) {
                    this.$paneBottomL.width(this.canvasWidthL);
                    this.$paneBottomR.css('left', this.canvasWidthL);

                    this.$viewportBottomL.width(this.canvasWidthL);
                    this.$viewportBottomR.width(this.viewportW - this.canvasWidthL);

                    this.$canvasBottomL.width(this.canvasWidthL);
                    this.$canvasBottomR.width(this.canvasWidthR);
                }
            } else {
                this.$paneHeaderL.width('100%');
                this.$paneTopL.width('100%');
                this.$headerRowScrollerL.width('100%');
                this.$headerRowL.width(this.canvasWidth);

                if (this.options.createFooterRow) {
                    this.$footerRowScrollerL.width('100%');
                    this.$footerRowL.width(this.canvasWidth);
                }

                if (this.options.createPreHeaderPanel) {
                    this.$preHeaderPanel.width('100%');
                    this.$preHeaderPanel.width(this.canvasWidth);
                }
                this.$viewportTopL.width('100%');

                if (this.hasFrozenRows) {
                    this.$viewportBottomL.width('100%');
                    this.$canvasBottomL.width(this.canvasWidthL);
                }
            }

            this.viewportHasHScroll = (this.canvasWidth >= this.viewportW - scrollbarDimensions.width);
        }

        this.$headerRowSpacerL.width(this.canvasWidth + (this.viewportHasVScroll ? scrollbarDimensions.width : 0));
        this.$headerRowSpacerR.width(this.canvasWidth + (this.viewportHasVScroll ? scrollbarDimensions.width : 0));

        if (this.options.createFooterRow) {
            this.$footerRowSpacerL.width(this.canvasWidth + (this.viewportHasVScroll ? scrollbarDimensions.width : 0));
            this.$footerRowSpacerR.width(this.canvasWidth + (this.viewportHasVScroll ? scrollbarDimensions.width : 0));
        }

        if (widthChanged || forceColumnWidthsUpdate) {
            this.applyColumnWidths();
        }
    }

    private disableSelection($target) {
        if ($target && $target.jquery) {
            $target
                .attr("unselectable", "on")
                .css("MozUserSelect", "none")
                .on("selectstart.ui", function () {
                    return false;
                }); // from jquery:ui.core.js 1.7.2
        }
    }

    private getMaxSupportedCssHeight() {
        var supportedHeight = 1000000;
        // FF reports the height back but still renders blank after ~6M px
        var testUpTo = navigator.userAgent.toLowerCase().match(/firefox/) ? 6000000 : 1000000000;
        var div = $("<div style='display:none' />").appendTo(document.body);

        while (true) {
            var test = supportedHeight * 2;
            div.css("height", test);
            if (test > testUpTo || div.height() !== test) {
                break;
            } else {
                supportedHeight = test;
            }
        }

        div.remove();
        return supportedHeight;
    }

    public getUID() {
        return this.uid;
    }

    public getHeaderColumnWidthDiff() {
        return this.headerColumnWidthDiff;
    }

    public getScrollbarDimensions() {
        return scrollbarDimensions;
    }

    // TODO:  this is static.  need to handle page mutation.
    private bindAncestorScrollEvents() {
        var elem = (this.hasFrozenRows && !this.options.frozenBottom) ? this.$canvasBottomL[0] : this.$canvasTopL[0];
        while ((elem = elem.parentNode) != document.body && elem != null) {
            // bind to scroll containers only
            if (elem == this.$viewportTopL[0] || elem.scrollWidth != elem.clientWidth || elem.scrollHeight != elem.clientHeight) {
                var $elem = $(elem);
                if (!this.$boundAncestors) {
                    this.$boundAncestors = $elem;
                } else {
                    this.$boundAncestors = this.$boundAncestors.add($elem);
                }
                $elem.on("scroll." + this.uid, this.handleActiveCellPositionChange);
            }
        }
    }

    private unbindAncestorScrollEvents() {
        if (!this.$boundAncestors) {
            return;
        }
        this.$boundAncestors.off("scroll." + this.uid);
        this.$boundAncestors = null;
    }

    public updateColumnHeader(columnId, title, toolTip) {
        if (!this.initialized) { return; }
        var idx = this.getColumnIndex(columnId);
        if (idx == null) {
            return;
        }

        var columnDef = this.columns[idx];
        var $header = this.$headers.children().eq(idx);
        if ($header) {
            if (title !== undefined) {
                this.columns[idx].name = title;
            }
            if (toolTip !== undefined) {
                this.columns[idx].toolTip = toolTip;
            }

            this.trigger(this.onBeforeHeaderCellDestroy, {
                "node": $header[0],
                "column": columnDef,
                "grid": self
            });

            $header
                .attr("title", toolTip || "")
                .children().eq(0).html(title);

            this.trigger(this.onHeaderCellRendered, {
                "node": $header[0],
                "column": columnDef,
                "grid": self
            });
        }
    }

    public getHeader(columnDef) {
        if (!columnDef) {
            return this.hasFrozenColumns() ? this.$headers : this.$headerL;
        }
        var idx = this.getColumnIndex(columnDef.id);
        return this.hasFrozenColumns() ? ((idx <= this.options.frozenColumn) ? this.$headerL : this.$headerR) : this.$headerL;
    }

    public getHeaderColumn(columnIdOrIdx) {
        var idx = (typeof columnIdOrIdx === "number" ? columnIdOrIdx : this.getColumnIndex(columnIdOrIdx));
        var targetHeader = this.hasFrozenColumns() ? ((idx <= this.options.frozenColumn) ? this.$headerL : this.$headerR) : this.$headerL;
        var targetIndex = this.hasFrozenColumns() ? ((idx <= this.options.frozenColumn) ? idx : idx - this.options.frozenColumn - 1) : idx;
        var $rtn = targetHeader.children().eq(targetIndex);
        return $rtn && $rtn[0];
    }

    public getHeaderRow() {
        return this.hasFrozenColumns() ? this.$headerRow : this.$headerRow[0];
    }

    public getFooterRow() {
        return this.hasFrozenColumns() ? this.$footerRow : this.$footerRow[0];
    }

    public getPreHeaderPanel() {
        return this.$preHeaderPanel[0];
    }

    public getPreHeaderPanelRight() {
        return this.$preHeaderPanelR[0];
    }

    public getHeaderRowColumn(columnIdOrIdx) {
        var idx = (typeof columnIdOrIdx === "number" ? columnIdOrIdx : this.getColumnIndex(columnIdOrIdx));

        var $headerRowTarget;

        if (this.hasFrozenColumns()) {
            if (idx <= this.options.frozenColumn) {
                $headerRowTarget = this.$headerRowL;
            } else {
                $headerRowTarget = this.$headerRowR;
                idx -= this.options.frozenColumn + 1;
            }
        } else {
            $headerRowTarget = this.$headerRowL;
        }

        var $header = $headerRowTarget.children().eq(idx);
        return $header && $header[0];
    }

    private getFooterRowColumn(columnIdOrIdx) {
        var idx = (typeof columnIdOrIdx === "number" ? columnIdOrIdx : this.getColumnIndex(columnIdOrIdx));

        var $footerRowTarget;

        if (this.hasFrozenColumns()) {
            if (idx <= this.options.frozenColumn) {
                $footerRowTarget = this.$footerRowL;
            } else {
                $footerRowTarget = this.$footerRowR;

                idx -= this.options.frozenColumn + 1;
            }
        } else {
            $footerRowTarget = this.$footerRowL;
        }

        var $footer = $footerRowTarget && $footerRowTarget.children().eq(idx);
        return $footer && $footer[0];
    }

    private createColumnFooter() {
        if (this.options.createFooterRow) {
            this.$footerRow.find(".slick-footerrow-column")
                .each((i, el) => {
                    var columnDef = $(el).data("column");
                    if (columnDef) {
                        this.trigger(this.onBeforeFooterRowCellDestroy, {
                            "node": this,
                            "column": columnDef,
                            "grid": self
                        });
                    }
                });

            this.$footerRowL.empty();
            this.$footerRowR.empty();

            for (var i = 0; i < this.columns.length; i++) {
                var m = this.columns[i];

                var footerRowCell = $("<div class='ui-state-default slick-footerrow-column l" + i + " r" + i + "'></div>")
                    .data("column", m)
                    .addClass(this.hasFrozenColumns() && i <= this.options.frozenColumn ? 'frozen' : '')
                    .appendTo(this.hasFrozenColumns() && (i > this.options.frozenColumn) ? this.$footerRowR : this.$footerRowL);

                this.trigger(this.onFooterRowCellRendered, {
                    "node": footerRowCell[0],
                    "column": m,
                    "grid": self
                });
            }
        }
    }

    private createColumnGroupHeaders() {
        var columnsLength = 0;
        var frozenColumnsValid = false;

        if (!this.treeColumns.hasDepth())
            return;

        for (var index = 0; index < this.$groupHeadersL.length; index++) {

            this.$groupHeadersL[index].empty();
            this.$groupHeadersR[index].empty();

            var groupColumns = this.treeColumns.getColumnsInDepth(index);

            for (var indexGroup in groupColumns) {
                var m = groupColumns[indexGroup];

                columnsLength += m.extractColumns().length;

                if (this.hasFrozenColumns() && index === 0 && (columnsLength - 1) === this.options.frozenColumn)
                    frozenColumnsValid = true;

                $("<div class='ui-state-default slick-group-header-column' />")
                    .html("<span class='slick-column-name'>" + m.name + "</span>")
                    .attr("id", "" + this.uid + m.id)
                    .attr("title", m.toolTip || "")
                    .data("column", m)
                    .addClass(m.headerCssClass || "")
                    .addClass(this.hasFrozenColumns() && (columnsLength - 1) > this.options.frozenColumn ? 'frozen' : '')
                    .appendTo(this.hasFrozenColumns() && (columnsLength - 1) > this.options.frozenColumn ? this.$groupHeadersR[index] : this.$groupHeadersL[index]);
            }

            if (this.hasFrozenColumns() && index === 0 && !frozenColumnsValid) {
                this.$groupHeadersL[index].empty();
                this.$groupHeadersR[index].empty();
                alert("All columns of group should to be grouped!");
                break;
            }
        }

        this.applyColumnGroupHeaderWidths();
    }

    private createColumnHeaders() {
        function onMouseEnter(e) {
            $(e.target).addClass("ui-state-hover");
        }

        function onMouseLeave(e) {
            $(e.target).removeClass("ui-state-hover");
        }

        this.$headers.find(".slick-header-column")
            .each((i, el) => {
                var columnDef = $(el).data("column");
                if (columnDef) {
                    this.trigger(this.onBeforeHeaderCellDestroy, {
                        "node": el,
                        "column": columnDef,
                        "grid": self
                    });
                }
            });

        this.$headerL.empty();
        this.$headerR.empty();

        this.getHeadersWidth();

        this.$headerL.width(this.headersWidthL);
        this.$headerR.width(this.headersWidthR);

        this.$headerRow.find(".slick-headerrow-column")
            .each((i, el) => {
                var columnDef = $(el).data("column");
                if (columnDef) {
                    this.trigger(this.onBeforeHeaderRowCellDestroy, {
                        "node": el,
                        "column": columnDef,
                        "grid": self
                    });
                }
            });

        this.$headerRowL.empty();
        this.$headerRowR.empty();

        if (this.options.createFooterRow) {
            this.$footerRowL.find(".slick-footerrow-column")
                .each((i, el) => {
                    var columnDef = $(el).data("column");
                    if (columnDef) {
                        this.trigger(this.onBeforeFooterRowCellDestroy, {
                            "node": el,
                            "column": columnDef,
                            "grid": self
                        });
                    }
                });
            this.$footerRowL.empty();

            if (this.hasFrozenColumns()) {
                this.$footerRowR.find(".slick-footerrow-column")
                    .each((i, el) => {
                        var columnDef = $(el).data("column");
                        if (columnDef) {
                            this.trigger(this.onBeforeFooterRowCellDestroy, {
                                "node": el,
                                "column": columnDef,
                                "grid": self
                            });
                        }
                    });
                this.$footerRowR.empty();
            }
        }

        for (var i = 0; i < this.columns.length; i++) {
            var m = this.columns[i];

            var $headerTarget = this.hasFrozenColumns() ? ((i <= this.options.frozenColumn) ? this.$headerL : this.$headerR) : this.$headerL;
            var $headerRowTarget = this.hasFrozenColumns() ? ((i <= this.options.frozenColumn) ? this.$headerRowL : this.$headerRowR) : this.$headerRowL;

            var header = $("<div class='ui-state-default slick-header-column' />")
                .html("<span class='slick-column-name'>" + m.name + "</span>")
                .width(m.width - this.headerColumnWidthDiff)
                .attr("id", "" + this.uid + m.id)
                .attr("title", m.toolTip || "")
                .data("column", m)
                .addClass(m.headerCssClass || "")
                .addClass(this.hasFrozenColumns() && i <= this.options.frozenColumn ? 'frozen' : '')
                .appendTo($headerTarget);

            if (this.options.enableColumnReorder || m.sortable) {
                header
                    .on('mouseenter', onMouseEnter)
                    .on('mouseleave', onMouseLeave);
            }

            if (m.hasOwnProperty('headerCellAttrs') && m.headerCellAttrs instanceof Object) {
                for (var key in m.headerCellAttrs) {
                    if (m.headerCellAttrs.hasOwnProperty(key)) {
                        header.attr(key, m.headerCellAttrs[key]);
                    }
                }
            }

            if (m.sortable) {
                header.addClass("slick-header-sortable");
                header.append("<span class='slick-sort-indicator"
                    + (this.options.numberedMultiColumnSort && !this.options.sortColNumberInSeparateSpan ? " slick-sort-indicator-numbered" : "") + "' />");
                if (this.options.numberedMultiColumnSort && this.options.sortColNumberInSeparateSpan) { header.append("<span class='slick-sort-indicator-numbered' />"); }
            }

            this.trigger(this.onHeaderCellRendered, {
                "node": header[0],
                "column": m,
                "grid": this
            });

            if (this.options.showHeaderRow) {
                var headerRowCell = $("<div class='ui-state-default slick-headerrow-column l" + i + " r" + i + "'></div>")
                    .data("column", m)
                    .addClass(this.hasFrozenColumns() && i <= this.options.frozenColumn ? 'frozen' : '')
                    .appendTo($headerRowTarget);

                this.trigger(this.onHeaderRowCellRendered, {
                    "node": headerRowCell[0],
                    "column": m,
                    "grid": this
                });
            }
            if (this.options.createFooterRow && this.options.showFooterRow) {
                var footerRowCell = $("<div class='ui-state-default slick-footerrow-column l" + i + " r" + i + "'></div>")
                    .data("column", m)
                    .appendTo(this.$footerRow);

                this.trigger(this.onFooterRowCellRendered, {
                    "node": footerRowCell[0],
                    "column": m,
                    "grid": this
                });
            }
        }

        this.setSortColumns(this.sortColumns);
        this.setupColumnResize();
        if (this.options.enableColumnReorder) {
            if (typeof this.options.enableColumnReorder == 'function') {
                this.options.enableColumnReorder(self, this.$headers, this.headerColumnWidthDiff, this.setColumns, this.setupColumnResize, this.columns, this.getColumnIndex, this.uid, this.trigger);
            } else {
                this.setupColumnReorder();
            }
        }
    }

    private setupColumnSort() {
        this.$headers.click((e) => {
            if (this.columnResizeDragging) return;
            // temporary workaround for a bug in jQuery 1.7.1 (http://bugs.jquery.com/ticket/11328)
            e.metaKey = e.metaKey || e.ctrlKey;

            if ($(e.target).hasClass("slick-resizable-handle")) {
                return;
            }

            var $col = $(e.target).closest(".slick-header-column");
            if (!$col.length) {
                return;
            }

            var column = $col.data("column");
            if (column.sortable) {
                if (!this.getEditorLock().commitCurrentEdit()) {
                    return;
                }

                var sortColumn = null;
                var i = 0;
                for (; i < this.sortColumns.length; i++) {
                    if (this.sortColumns[i].columnId == column.id) {
                        sortColumn = this.sortColumns[i];
                        sortColumn.sortAsc = !sortColumn.sortAsc;
                        break;
                    }
                }
                var hadSortCol = !!sortColumn;

                if (this.options.tristateMultiColumnSort) {
                    if (!sortColumn) {
                        sortColumn = { columnId: column.id, sortAsc: column.defaultSortAsc };
                    }
                    if (hadSortCol && sortColumn.sortAsc) {
                        // three state: remove sort rather than go back to ASC
                        this.sortColumns.splice(i, 1);
                        sortColumn = null;
                    }
                    if (!this.options.multiColumnSort) { this.sortColumns = []; }
                    if (sortColumn && (!hadSortCol || !this.options.multiColumnSort)) {
                        this.sortColumns.push(sortColumn);
                    }
                } else {
                    // legacy behaviour
                    if (e.metaKey && this.options.multiColumnSort) {
                        if (sortColumn) {
                            this.sortColumns.splice(i, 1);
                        }
                    }
                    else {
                        if ((!e.shiftKey && !e.metaKey) || !this.options.multiColumnSort) {
                            this.sortColumns = [];
                        }

                        if (!sortColumn) {
                            sortColumn = { columnId: column.id, sortAsc: column.defaultSortAsc };
                            this.sortColumns.push(sortColumn);
                        } else if (this.sortColumns.length === 0) {
                            this.sortColumns.push(sortColumn);
                        }
                    }
                }

                this.setSortColumns(this.sortColumns);

                if (!this.options.multiColumnSort) {
                    this.trigger(this.onSort, {
                        multiColumnSort: false,
                        columnId: (this.sortColumns.length > 0 ? column.id : null),
                        sortCol: (this.sortColumns.length > 0 ? column : null),
                        sortAsc: (this.sortColumns.length > 0 ? this.sortColumns[0].sortAsc : true)
                    }, e as any);
                } else {
                    this.trigger(this.onSort, {
                        multiColumnSort: true,
                        sortCols: $.map(this.sortColumns, (col) => {
                            return { columnId: this.columns[this.getColumnIndex(col.columnId)].id, sortCol: this.columns[this.getColumnIndex(col.columnId)], sortAsc: col.sortAsc };
                        })
                    }, e as any);
                }
            }
        });
    }

    private currentPositionInHeader(id) {
        var currentPosition = 0;
        this.$headers.find('.slick-header-column').each((i, el) => {
            if (el.id == id) {
                currentPosition = i;
                return false;
            }
            return undefined;
        });

        return currentPosition;
    }

    private limitPositionInGroup(idColumn) {
        var groupColumnOfPreviousPosition,
            startLimit = 0,
            endLimit = 0;

        this.treeColumns
            .getColumnsInDepth(this.$groupHeadersL.length - 1)
            .some(function (groupColumn) {
                startLimit = endLimit;
                endLimit += groupColumn.columns.length;

                groupColumn.columns.some(function (column) {

                    if (column.id === idColumn)
                        groupColumnOfPreviousPosition = groupColumn;

                    return groupColumnOfPreviousPosition;
                });

                return groupColumnOfPreviousPosition;
            });

        endLimit--;

        return {
            start: startLimit,
            end: endLimit,
            group: groupColumnOfPreviousPosition
        };
    }

    private remove(arr, elem) {
        var index = arr.lastIndexOf(elem);
        if (index > -1) {
            arr.splice(index, 1);
            this.remove(arr, elem);
        }
    }

    private columnPositionValidInGroup($item) {
        var currentPosition = this.currentPositionInHeader($item[0].id);
        var limit = this.limitPositionInGroup($item.data('column').id);
        var positionValid = limit.start <= currentPosition && currentPosition <= limit.end;

        return {
            limit: limit,
            valid: positionValid,
            message: positionValid ? '' : 'Column "'.concat($item.text(), '" can be reordered only within the "', limit.group.name, '" group!')
        };
    }

    private setupColumnReorder() {
        this.$headers.filter(":ui-sortable").sortable("destroy");
        var columnScrollTimer = null;

        const scrollColumnsRight = () => {
            this.$viewportScrollContainerX[0].scrollLeft = this.$viewportScrollContainerX[0].scrollLeft + 10;
        }

        const scrollColumnsLeft = () => {
            this.$viewportScrollContainerX[0].scrollLeft = this.$viewportScrollContainerX[0].scrollLeft - 10;
        }

        var canDragScroll;
        this.$headers.sortable({
            containment: "parent",
            distance: 3,
            axis: "x",
            cursor: "default",
            tolerance: "intersection",
            helper: "clone",
            placeholder: "slick-sortable-placeholder ui-state-default slick-header-column",
            start: (e, ui) => {
                ui.placeholder.width(ui.helper.outerWidth() - this.headerColumnWidthDiff);
                canDragScroll = !this.hasFrozenColumns() ||
                    (ui.placeholder.offset().left + ui.placeholder.width()) > this.$viewportScrollContainerX.offset().left;
                $(ui.helper).addClass("slick-header-column-active");
            },
            beforeStop: (e, ui) => {
                $(ui.helper).removeClass("slick-header-column-active");
            },
            sort: (e, ui) => {
                if (canDragScroll && (e.originalEvent as any).pageX > this.$container[0].clientWidth) {
                    if (!(columnScrollTimer)) {
                        columnScrollTimer = setInterval(
                            scrollColumnsRight, 100);
                    }
                } else if (canDragScroll && (e.originalEvent as any).pageX < this.$viewportScrollContainerX.offset().left) {
                    if (!(columnScrollTimer)) {
                        columnScrollTimer = setInterval(
                            scrollColumnsLeft, 100);
                    }
                } else {
                    clearInterval(columnScrollTimer);
                    columnScrollTimer = null;
                }
            },
            stop: (e, ui) => {
                var cancel = false;
                clearInterval(columnScrollTimer);
                columnScrollTimer = null;
                var limit = null;

                if (this.treeColumns.hasDepth()) {
                    var validPositionInGroup = this.columnPositionValidInGroup(ui.item);
                    limit = validPositionInGroup.limit;

                    cancel = !validPositionInGroup.valid;

                    if (cancel)
                        alert(validPositionInGroup.message);
                }

                if (cancel || !this.getEditorLock().commitCurrentEdit()) {
                    $(this).sortable("cancel");
                    return;
                }

                var reorderedIds = this.$headerL.sortable("toArray");
                reorderedIds = reorderedIds.concat(this.$headerR.sortable("toArray"));

                var reorderedColumns = [];
                for (var i = 0; i < reorderedIds.length; i++) {
                    reorderedColumns.push(this.columns[this.getColumnIndex(reorderedIds[i].replace(this.uid, ""))]);
                }
                this.setColumns(reorderedColumns);

                this.trigger(this.onColumnsReordered, { impactedColumns: this.getImpactedColumns(limit) });
                e.stopPropagation();
                this.setupColumnResize();
            }
        });
    }

    private getImpactedColumns(limit) {
        var impactedColumns = [];

        if (limit) {

            for (var i = limit.start; i <= limit.end; i++) {
                impactedColumns.push(this.columns[i]);
            }
        }
        else {

            impactedColumns = this.columns;
        }

        return impactedColumns;
    }

    private setupColumnResize() {
        var $col, j, k, c, pageX, columnElements, minPageX, maxPageX, firstResizable, lastResizable;
        columnElements = this.$headers.children();
        columnElements.find(".slick-resizable-handle").remove();
        columnElements.each((i, e) => {
            if (i >= this.columns.length) { return; }
            if (this.columns[i].resizable) {
                if (firstResizable === undefined) {
                    firstResizable = i;
                }
                lastResizable = i;
            }
        });
        if (firstResizable === undefined) {
            return;
        }
        columnElements.each((i, e) => {
            if (i >= this.columns.length) { return; }
            if (i < firstResizable || (this.options.forceFitColumns && i >= lastResizable)) {
                return;
            }
            $col = $(e);
            $("<div class='slick-resizable-handle' />")
                .appendTo(e)
                .on("dragstart", (e, dd) => {
                    if (!this.getEditorLock().commitCurrentEdit()) {
                        return false;
                    }
                    pageX = e.pageX;
                    $(this).parent().addClass("slick-header-column-active");
                    var shrinkLeewayOnRight = null, stretchLeewayOnRight = null;
                    // lock each column's width option to current width
                    columnElements.each((i, e) => {
                        if (i >= this.columns.length) { return; }
                        this.columns[i].previousWidth = $(e).outerWidth();
                    });
                    if (this.options.forceFitColumns) {
                        shrinkLeewayOnRight = 0;
                        stretchLeewayOnRight = 0;
                        // colums on right affect maxPageX/minPageX
                        for (j = i + 1; j < this.columns.length; j++) {
                            c = this.columns[j];
                            if (c.resizable) {
                                if (stretchLeewayOnRight !== null) {
                                    if (c.maxWidth) {
                                        stretchLeewayOnRight += c.maxWidth - c.previousWidth;
                                    } else {
                                        stretchLeewayOnRight = null;
                                    }
                                }
                                shrinkLeewayOnRight += c.previousWidth - Math.max(c.minWidth || 0, this.absoluteColumnMinWidth);
                            }
                        }
                    }
                    var shrinkLeewayOnLeft = 0, stretchLeewayOnLeft = 0;
                    for (j = 0; j <= i; j++) {
                        // columns on left only affect minPageX
                        c = this.columns[j];
                        if (c.resizable) {
                            if (stretchLeewayOnLeft !== null) {
                                if (c.maxWidth) {
                                    stretchLeewayOnLeft += c.maxWidth - c.previousWidth;
                                } else {
                                    stretchLeewayOnLeft = null;
                                }
                            }
                            shrinkLeewayOnLeft += c.previousWidth - Math.max(c.minWidth || 0, this.absoluteColumnMinWidth);
                        }
                    }
                    if (shrinkLeewayOnRight === null) {
                        shrinkLeewayOnRight = 100000;
                    }
                    if (shrinkLeewayOnLeft === null) {
                        shrinkLeewayOnLeft = 100000;
                    }
                    if (stretchLeewayOnRight === null) {
                        stretchLeewayOnRight = 100000;
                    }
                    if (stretchLeewayOnLeft === null) {
                        stretchLeewayOnLeft = 100000;
                    }
                    maxPageX = pageX + Math.min(shrinkLeewayOnRight, stretchLeewayOnLeft);
                    minPageX = pageX - Math.min(shrinkLeewayOnLeft, stretchLeewayOnRight);

                    return undefined;
                })
                .on("drag", (e, dd) => {
                    this.columnResizeDragging = true;
                    var actualMinWidth, d = Math.min(maxPageX, Math.max(minPageX, e.pageX)) - pageX, x;
                    var newCanvasWidthL = 0, newCanvasWidthR = 0;

                    if (d < 0) { // shrink column
                        x = d;

                        for (j = i; j >= 0; j--) {
                            c = this.columns[j];
                            if (c.resizable) {
                                actualMinWidth = Math.max(c.minWidth || 0, this.absoluteColumnMinWidth);
                                if (x && c.previousWidth + x < actualMinWidth) {
                                    x += c.previousWidth - actualMinWidth;
                                    c.width = actualMinWidth;
                                } else {
                                    c.width = c.previousWidth + x;
                                    x = 0;
                                }
                            }
                        }

                        for (k = 0; k <= i; k++) {
                            c = this.columns[k];

                            if (this.hasFrozenColumns() && (k > this.options.frozenColumn)) {
                                newCanvasWidthR += c.width;
                            } else {
                                newCanvasWidthL += c.width;
                            }
                        }

                        if (this.options.forceFitColumns) {
                            x = -d;
                            for (j = i + 1; j < this.columns.length; j++) {
                                c = this.columns[j];
                                if (c.resizable) {
                                    if (x && c.maxWidth && (c.maxWidth - c.previousWidth < x)) {
                                        x -= c.maxWidth - c.previousWidth;
                                        c.width = c.maxWidth;
                                    } else {
                                        c.width = c.previousWidth + x;
                                        x = 0;
                                    }

                                    if (this.hasFrozenColumns() && (j > this.options.frozenColumn)) {
                                        newCanvasWidthR += c.width;
                                    } else {
                                        newCanvasWidthL += c.width;
                                    }
                                }
                            }
                        } else {
                            for (j = i + 1; j < this.columns.length; j++) {
                                c = this.columns[j];

                                if (this.hasFrozenColumns() && (j > this.options.frozenColumn)) {
                                    newCanvasWidthR += c.width;
                                } else {
                                    newCanvasWidthL += c.width;
                                }
                            }
                        }

                        if (this.options.forceFitColumns) {
                            x = -d;
                            for (j = i + 1; j < this.columns.length; j++) {
                                c = this.columns[j];
                                if (c.resizable) {
                                    if (x && c.maxWidth && (c.maxWidth - c.previousWidth < x)) {
                                        x -= c.maxWidth - c.previousWidth;
                                        c.width = c.maxWidth;
                                    } else {
                                        c.width = c.previousWidth + x;
                                        x = 0;
                                    }
                                }
                            }
                        }
                    } else { // stretch column
                        x = d;

                        newCanvasWidthL = 0;
                        newCanvasWidthR = 0;

                        for (j = i; j >= 0; j--) {
                            c = this.columns[j];
                            if (c.resizable) {
                                if (x && c.maxWidth && (c.maxWidth - c.previousWidth < x)) {
                                    x -= c.maxWidth - c.previousWidth;
                                    c.width = c.maxWidth;
                                } else {
                                    c.width = c.previousWidth + x;
                                    x = 0;
                                }
                            }
                        }

                        for (k = 0; k <= i; k++) {
                            c = this.columns[k];

                            if (this.hasFrozenColumns() && (k > this.options.frozenColumn)) {
                                newCanvasWidthR += c.width;
                            } else {
                                newCanvasWidthL += c.width;
                            }
                        }

                        if (this.options.forceFitColumns) {
                            x = -d;
                            for (j = i + 1; j < this.columns.length; j++) {
                                c = this.columns[j];
                                if (c.resizable) {
                                    actualMinWidth = Math.max(c.minWidth || 0, this.absoluteColumnMinWidth);
                                    if (x && c.previousWidth + x < actualMinWidth) {
                                        x += c.previousWidth - actualMinWidth;
                                        c.width = actualMinWidth;
                                    } else {
                                        c.width = c.previousWidth + x;
                                        x = 0;
                                    }

                                    if (this.hasFrozenColumns() && (j > this.options.frozenColumn)) {
                                        newCanvasWidthR += c.width;
                                    } else {
                                        newCanvasWidthL += c.width;
                                    }
                                }
                            }
                        } else {
                            for (j = i + 1; j < this.columns.length; j++) {
                                c = this.columns[j];

                                if (this.hasFrozenColumns() && (j > this.options.frozenColumn)) {
                                    newCanvasWidthR += c.width;
                                } else {
                                    newCanvasWidthL += c.width;
                                }
                            }
                        }
                    }

                    if (this.hasFrozenColumns() && newCanvasWidthL != this.canvasWidthL) {
                        this.$headerL.width(newCanvasWidthL + 1000);
                        this.$paneHeaderR.css('left', newCanvasWidthL);
                    }

                    this.applyColumnHeaderWidths();
                    this.applyColumnGroupHeaderWidths();
                    if (this.options.syncColumnCellResize) {
                        this.applyColumnWidths();
                    }
                    this.trigger(this.onColumnsDrag, {
                        triggeredByColumn: $(this).parent().attr("id").replace(this.uid, ""),
                        resizeHandle: $(this)
                    });
                })
                .on("dragend", (e, dd) => {
                    $(e.target).parent().removeClass("slick-header-column-active");

                    var triggeredByColumn = $(this).parent().attr("id").replace(this.uid, "");
                    if (this.trigger(this.onBeforeColumnsResize, { triggeredByColumn: triggeredByColumn }) === true) {
                        this.applyColumnHeaderWidths();
                        this.applyColumnGroupHeaderWidths();
                    }
                    var newWidth;
                    for (j = 0; j < this.columns.length; j++) {
                        c = this.columns[j];
                        newWidth = $(columnElements[j]).outerWidth();

                        if (c.previousWidth !== newWidth && c.rerenderOnResize) {
                            this.invalidateAllRows();
                        }
                    }
                    this.updateCanvasWidth(true);
                    this.render();
                    this.trigger(this.onColumnsResized, { triggeredByColumn: triggeredByColumn });
                    setTimeout(() => { this.columnResizeDragging = false; }, 300);
                });
        });
    }

    private getVBoxDelta($el) {
        var p = ["borderTopWidth", "borderBottomWidth", "paddingTop", "paddingBottom"];
        var delta = 0;
        if ($el && typeof $el.css === 'function') {
            $.each(p, function (n, val) {
                delta += parseFloat($el.css(val)) || 0;
            });
        }
        return delta;
    }

    private setFrozenOptions() {
        this.options.frozenColumn = (this.options.frozenColumn >= 0 && this.options.frozenColumn < this.columns.length)
            ? parseInt(this.options.frozenColumn)
            : -1;

        if (this.options.frozenRow > -1) {
            this.hasFrozenRows = true;
            this.frozenRowsHeight = (this.options.frozenRow) * this.options.rowHeight;

            var dataLength = this.getDataLength();

            this.actualFrozenRow = (this.options.frozenBottom)
                ? (dataLength - this.options.frozenRow)
                : this.options.frozenRow;
        } else {
            this.hasFrozenRows = false;
        }
    }

    private setPaneVisibility() {
        if (this.hasFrozenColumns()) {
            this.$paneHeaderR.show();
            this.$paneTopR.show();

            if (this.hasFrozenRows) {
                this.$paneBottomL.show();
                this.$paneBottomR.show();
            } else {
                this.$paneBottomR.hide();
                this.$paneBottomL.hide();
            }
        } else {
            this.$paneHeaderR.hide();
            this.$paneTopR.hide();
            this.$paneBottomR.hide();

            if (this.hasFrozenRows) {
                this.$paneBottomL.show();
            } else {
                this.$paneBottomR.hide();
                this.$paneBottomL.hide();
            }
        }
    }

    private setOverflow() {
        this.$viewportTopL.css({
            'overflow-x': (this.hasFrozenColumns()) ? (this.hasFrozenRows && !this.options.alwaysAllowHorizontalScroll ? 'hidden' : 'scroll') : (this.hasFrozenRows && !this.options.alwaysAllowHorizontalScroll ? 'hidden' : 'auto'),
            'overflow-y': (!this.hasFrozenColumns() && this.options.alwaysShowVerticalScroll) ? "scroll" : ((this.hasFrozenColumns()) ? (this.hasFrozenRows ? 'hidden' : 'hidden') : (this.hasFrozenRows ? 'scroll' : 'auto'))
        });

        this.$viewportTopR.css({
            'overflow-x': (this.hasFrozenColumns()) ? (this.hasFrozenRows && !this.options.alwaysAllowHorizontalScroll ? 'hidden' : 'scroll') : (this.hasFrozenRows && !this.options.alwaysAllowHorizontalScroll ? 'hidden' : 'auto'),
            'overflow-y': this.options.alwaysShowVerticalScroll ? "scroll" : ((this.hasFrozenColumns()) ? (this.hasFrozenRows ? 'scroll' : 'auto') : (this.hasFrozenRows ? 'scroll' : 'auto'))
        });

        this.$viewportBottomL.css({
            'overflow-x': (this.hasFrozenColumns()) ? (this.hasFrozenRows && !this.options.alwaysAllowHorizontalScroll ? 'scroll' : 'auto') : (this.hasFrozenRows && !this.options.alwaysAllowHorizontalScroll ? 'auto' : 'auto'),
            'overflow-y': (!this.hasFrozenColumns() && this.options.alwaysShowVerticalScroll) ? "scroll" : ((this.hasFrozenColumns()) ? (this.hasFrozenRows ? 'hidden' : 'hidden') : (this.hasFrozenRows ? 'scroll' : 'auto'))
        });

        this.$viewportBottomR.css({
            'overflow-x': (this.hasFrozenColumns()) ? (this.hasFrozenRows && !this.options.alwaysAllowHorizontalScroll ? 'scroll' : 'auto') : (this.hasFrozenRows && !this.options.alwaysAllowHorizontalScroll ? 'auto' : 'auto'),
            'overflow-y': this.options.alwaysShowVerticalScroll ? "scroll" : ((this.hasFrozenColumns()) ? (this.hasFrozenRows ? 'auto' : 'auto') : (this.hasFrozenRows ? 'auto' : 'auto'))
        });
        if (this.options.viewportClass) {
            this.$viewportTopL.toggleClass(this.options.viewportClass, true);
            this.$viewportTopR.toggleClass(this.options.viewportClass, true);
            this.$viewportBottomL.toggleClass(this.options.viewportClass, true);
            this.$viewportBottomR.toggleClass(this.options.viewportClass, true);
        }
    }

    private setScroller() {
        if (this.hasFrozenColumns()) {
            this.$headerScrollContainer = this.$headerScrollerR;
            this.$headerRowScrollContainer = this.$headerRowScrollerR;
            this.$footerRowScrollContainer = this.$footerRowScrollerR;

            if (this.hasFrozenRows) {
                if (this.options.frozenBottom) {
                    this.$viewportScrollContainerX = this.$viewportBottomR;
                    this.$viewportScrollContainerY = this.$viewportTopR;
                } else {
                    this.$viewportScrollContainerX = this.$viewportScrollContainerY = this.$viewportBottomR;
                }
            } else {
                this.$viewportScrollContainerX = this.$viewportScrollContainerY = this.$viewportTopR;
            }
        } else {
            this.$headerScrollContainer = this.$headerScrollerL;
            this.$headerRowScrollContainer = this.$headerRowScrollerL;
            this.$footerRowScrollContainer = this.$footerRowScrollerL;

            if (this.hasFrozenRows) {
                if (this.options.frozenBottom) {
                    this.$viewportScrollContainerX = this.$viewportBottomL;
                    this.$viewportScrollContainerY = this.$viewportTopL;
                } else {
                    this.$viewportScrollContainerX = this.$viewportScrollContainerY = this.$viewportBottomL;
                }
            } else {
                this.$viewportScrollContainerX = this.$viewportScrollContainerY = this.$viewportTopL;
            }
        }
    }

    private measureCellPaddingAndBorder() {
        var el;
        var h = ["borderLeftWidth", "borderRightWidth", "paddingLeft", "paddingRight"];
        var v = ["borderTopWidth", "borderBottomWidth", "paddingTop", "paddingBottom"];

        // jquery prior to version 1.8 handles .width setter/getter as a direct css write/read
        // jquery 1.8 changed .width to read the true inner element width if box-sizing is set to border-box, and introduced a setter for .outerWidth
        // so for equivalent functionality, prior to 1.8 use .width, and after use .outerWidth
        var verArray = $.fn.jquery.split('.') as any as number[];
        this.jQueryNewWidthBehaviour = (verArray[0] == 1 && verArray[1] >= 8) || verArray[0] >= 2;

        el = $("<div class='ui-state-default slick-header-column' style='visibility:hidden'>-</div>").appendTo(this.$headers);
        this.headerColumnWidthDiff = this.headerColumnHeightDiff = 0;
        if (el.css("box-sizing") != "border-box" && el.css("-moz-box-sizing") != "border-box" && el.css("-webkit-box-sizing") != "border-box") {
            $.each(h, (n, val) => {
                this.headerColumnWidthDiff += parseFloat(el.css(val)) || 0;
            });
            $.each(v, (n, val) => {
                this.headerColumnHeightDiff += parseFloat(el.css(val)) || 0;
            });
        }
        el.remove();

        var r = $("<div class='slick-row' />").appendTo(this.$canvas);
        el = $("<div class='slick-cell' id='' style='visibility:hidden'>-</div>").appendTo(r);
        this.cellWidthDiff = this.cellHeightDiff = 0;
        if (el.css("box-sizing") != "border-box" && el.css("-moz-box-sizing") != "border-box" && el.css("-webkit-box-sizing") != "border-box") {
            $.each(h, (n, val) => {
                this.cellWidthDiff += parseFloat(el.css(val)) || 0;
            });
            $.each(v, (n, val) => {
                this.cellHeightDiff += parseFloat(el.css(val)) || 0;
            });
        }
        r.remove();

        this.absoluteColumnMinWidth = Math.max(this.headerColumnWidthDiff, this.cellWidthDiff);
    }

    private createCssRules() {
        this.$style = $("<style type='text/css' rel='stylesheet' />").appendTo($("head"));
        var rowHeight = (this.options.rowHeight - this.cellHeightDiff);
        var rules = [
            "." + this.uid + " .slick-group-header-column { left: 1000px; }",
            "." + this.uid + " .slick-header-column { left: 1000px; }",
            "." + this.uid + " .slick-top-panel { height:" + this.options.topPanelHeight + "px; }",
            "." + this.uid + " .slick-preheader-panel { height:" + this.options.preHeaderPanelHeight + "px; }",
            "." + this.uid + " .slick-headerrow-columns { height:" + this.options.headerRowHeight + "px; }",
            "." + this.uid + " .slick-footerrow-columns { height:" + this.options.footerRowHeight + "px; }",
            "." + this.uid + " .slick-cell { height:" + rowHeight + "px; }",
            "." + this.uid + " .slick-row { height:" + this.options.rowHeight + "px; }"
        ];

        for (var i = 0; i < this.columns.length; i++) {
            rules.push("." + this.uid + " .l" + i + " { }");
            rules.push("." + this.uid + " .r" + i + " { }");
        }

        if (this.$style[0].styleSheet) { // IE
            this.$style[0].styleSheet.cssText = rules.join(" ");
        } else {
            this.$style[0].appendChild(document.createTextNode(rules.join(" ")));
        }
    }

    private getColumnCssRules(idx) {
        var i;
        if (!this.stylesheet) {
            var sheets = document.styleSheets;
            for (i = 0; i < sheets.length; i++) {
                if ((sheets[i].ownerNode || (sheets[i] as any).owningElement) == this.$style[0]) {
                    this.stylesheet = sheets[i];
                    break;
                }
            }

            if (!this.stylesheet) {
                throw new Error("Cannot find stylesheet.");
            }

            // find and cache column CSS rules
            this.columnCssRulesL = [];
            this.columnCssRulesR = [];
            var cssRules = (this.stylesheet.cssRules || this.stylesheet.rules);
            var matches, columnIdx;
            for (i = 0; i < cssRules.length; i++) {
                var selector = cssRules[i].selectorText;
                if (matches = /\.l\d+/.exec(selector)) {
                    columnIdx = parseInt(matches[0].substr(2, matches[0].length - 2), 10);
                    this.columnCssRulesL[columnIdx] = cssRules[i];
                } else if (matches = /\.r\d+/.exec(selector)) {
                    columnIdx = parseInt(matches[0].substr(2, matches[0].length - 2), 10);
                    this.columnCssRulesR[columnIdx] = cssRules[i];
                }
            }
        }

        return {
            "left": this.columnCssRulesL[idx],
            "right": this.columnCssRulesR[idx]
        };
    }

    private removeCssRules() {
        this.$style.remove();
        this.stylesheet = null;
    }

    public destroy(shouldDestroyAllElements) {
        this.getEditorLock().cancelCurrentEdit();

        this.trigger(this.onBeforeDestroy, {});

        var i = this.plugins.length;
        while (i--) {
            this.unregisterPlugin(this.plugins[i]);
        }

        if (this.options.enableColumnReorder) {
            this.$headers.filter(":ui-sortable").sortable("destroy");
        }

        this.unbindAncestorScrollEvents();
        this.$container.off(".slickgrid");
        this.removeCssRules();

        this.$canvas.off();
        this.$viewport.off();
        this.$headerScroller.off();
        this.$headerRowScroller.off();
        if (this.$footerRow) {
            this.$footerRow.off();
        }
        if (this.$footerRowScroller) {
            this.$footerRowScroller.off();
        }
        if (this.$preHeaderPanelScroller) {
            this.$preHeaderPanelScroller.off();
        }
        this.$focusSink.off();
        $(".slick-resizable-handle").off();
        $(".slick-header-column").off();
        this.$container.empty().removeClass(this.uid);
        if (shouldDestroyAllElements) {
            this.destroyAllElements();
        }
    }

    private destroyAllElements() {
        this.$activeCanvasNode = null;
        this.$activeViewportNode = null;
        this.$boundAncestors = null;
        this.$canvas = null;
        this.$canvasTopL = null;
        this.$canvasTopR = null;
        this.$canvasBottomL = null;
        this.$canvasBottomR = null;
        this.$container = null;
        this.$focusSink = null;
        this.$focusSink2 = null;
        this.$groupHeaders = null;
        this.$groupHeadersL = null;
        this.$groupHeadersR = null;
        this.$headerL = null;
        this.$headerR = null;
        this.$headers = null;
        this.$headerRow = null;
        this.$headerRowL = null;
        this.$headerRowR = null;
        this.$headerRowSpacerL = null;
        this.$headerRowSpacerR = null;
        this.$headerRowScrollContainer = null;
        this.$headerRowScroller = null;
        this.$headerRowScrollerL = null;
        this.$headerRowScrollerR = null;
        this.$headerScrollContainer = null;
        this.$headerScroller = null;
        this.$headerScrollerL = null;
        this.$headerScrollerR = null;
        this.$hiddenParents = null;
        this.$footerRow = null;
        this.$footerRowL = null;
        this.$footerRowR = null;
        this.$footerRowSpacerL = null;
        this.$footerRowSpacerR = null;
        this.$footerRowScroller = null;
        this.$footerRowScrollerL = null;
        this.$footerRowScrollerR = null;
        this.$footerRowScrollContainer = null;
        this.$preHeaderPanel = null;
        this.$preHeaderPanelR = null;
        this.$preHeaderPanelScroller = null;
        this.$preHeaderPanelScrollerR = null;
        this.$preHeaderPanelSpacer = null;
        this.$preHeaderPanelSpacerR = null;
        this.$topPanel = null;
        this.$topPanelScroller = null;
        this.$style = null;
        this.$topPanelScrollerL = null;
        this.$topPanelScrollerR = null;
        this.$topPanelL = null;
        this.$topPanelR = null;
        this.$paneHeaderL = null;
        this.$paneHeaderR = null;
        this.$paneTopL = null;
        this.$paneTopR = null;
        this.$paneBottomL = null;
        this.$paneBottomR = null;
        this.$viewport = null;
        this.$viewportTopL = null;
        this.$viewportTopR = null;
        this.$viewportBottomL = null;
        this.$viewportBottomR = null;
        this.$viewportScrollContainerX = null;
        this.$viewportScrollContainerY = null;
    }

    //////////////////////////////////////////////////////////////////////////////////////////////
    // Column Autosizing
    //////////////////////////////////////////////////////////////////////////////////////////////

    private canvas = null;
    private canvas_context = null;

    public autosizeColumn(columnOrIndexOrId, isInit) {
        var c = columnOrIndexOrId;
        if (typeof columnOrIndexOrId === 'number') {
            c = this.columns[columnOrIndexOrId];
        }
        else if (typeof columnOrIndexOrId === 'string') {
            for (var i = 0; i < this.columns.length; i++) {
                if (this.columns[i].Id === columnOrIndexOrId) { c = this.columns[i]; }
            }
        }
        var $gridCanvas = $(this.getCanvasNode(0, 0));
        this.getColAutosizeWidth(c, $gridCanvas, isInit);
    }

    public autosizeColumns(autosizeMode?, isInit?) {
        //LogColWidths();

        autosizeMode = autosizeMode || this.options.autosizeColsMode;
        if (autosizeMode === GridAutosizeColsMode.LegacyForceFit
            || autosizeMode === GridAutosizeColsMode.LegacyOff) {
            this.legacyAutosizeColumns();
            return;
        }

        if (autosizeMode === GridAutosizeColsMode.None) {
            return;
        }

        // test for brower canvas support, canvas_context!=null if supported
        this.canvas = document.createElement("canvas");
        if (this.canvas && this.canvas.getContext) { this.canvas_context = this.canvas.getContext("2d"); }

        // pass in the grid canvas
        var $gridCanvas = $(this.getCanvasNode(0, 0));
        var viewportWidth = this.viewportHasVScroll ? this.viewportW - scrollbarDimensions.width : this.viewportW;

        // iterate columns to get autosizes
        var i, c, colWidth, reRender, totalWidth = 0, totalWidthLessSTR = 0, strColsMinWidth = 0, totalMinWidth = 0, totalLockedColWidth = 0;
        for (i = 0; i < this.columns.length; i++) {
            c = this.columns[i];
            this.getColAutosizeWidth(c, $gridCanvas, isInit);
            totalLockedColWidth += (c.autoSize.autosizeMode === ColAutosizeMode.Locked ? c.width : 0);
            totalMinWidth += (c.autoSize.autosizeMode === ColAutosizeMode.Locked ? c.width : c.minWidth);
            totalWidth += c.autoSize.widthPx;
            totalWidthLessSTR += (c.autoSize.sizeToRemaining ? 0 : c.autoSize.widthPx);
            strColsMinWidth += (c.autoSize.sizeToRemaining ? c.minWidth || 0 : 0);
        }
        var strColTotalGuideWidth = totalWidth - totalWidthLessSTR;

        if (autosizeMode === GridAutosizeColsMode.FitViewportToCols) {
            // - if viewport with is outside MinViewportWidthPx and MaxViewportWidthPx, then the viewport is set to
            //   MinViewportWidthPx or MaxViewportWidthPx and the FitColsToViewport algorithm is used
            // - viewport is resized to fit columns
            var setWidth = totalWidth + scrollbarDimensions.width;
            autosizeMode = GridAutosizeColsMode.IgnoreViewport;

            if (this.options.viewportMaxWidthPx && setWidth > this.options.viewportMaxWidthPx) {
                setWidth = this.options.viewportMaxWidthPx;
                autosizeMode = GridAutosizeColsMode.FitColsToViewport;
            } else if (this.options.viewportMinWidthPx && setWidth < this.options.viewportMinWidthPx) {
                setWidth = this.options.viewportMinWidthPx;
                autosizeMode = GridAutosizeColsMode.FitColsToViewport;
            } else {
                // falling back to IgnoreViewport will size the columns as-is, with render checking
                //for (i = 0; i < columns.length; i++) { columns[i].width = columns[i].autoSize.widthPx; }
            }
            this.$container.width(setWidth);
        }

        if (autosizeMode === GridAutosizeColsMode.FitColsToViewport) {
            if (strColTotalGuideWidth > 0 && totalWidthLessSTR < viewportWidth - strColsMinWidth) {
                // if addl space remains in the viewport and there are SizeToRemaining cols, just the SizeToRemaining cols expand proportionally to fill viewport
                for (i = 0; i < this.columns.length; i++) {
                    c = this.columns[i];
                    var totalSTRViewportWidth = viewportWidth - totalWidthLessSTR;
                    if (c.autoSize.sizeToRemaining) {
                        colWidth = totalSTRViewportWidth * c.autoSize.widthPx / strColTotalGuideWidth;
                    } else {
                        colWidth = c.autoSize.widthPx;
                    }
                    if (c.rerenderOnResize && c.width != colWidth) { reRender = true; }
                    c.width = colWidth;
                }
            } else if ((this.options.viewportSwitchToScrollModeWidthPercent && totalWidthLessSTR + strColsMinWidth > viewportWidth * this.options.viewportSwitchToScrollModeWidthPercent / 100)
                || (totalMinWidth > viewportWidth)) {
                // if the total columns width is wider than the viewport by switchToScrollModeWidthPercent, switch to IgnoreViewport mode
                autosizeMode = GridAutosizeColsMode.IgnoreViewport;
            } else {
                // otherwise (ie. no SizeToRemaining cols or viewport smaller than columns) all cols other than 'Locked' scale in proportion to fill viewport
                // and SizeToRemaining get minWidth
                var unallocatedColWidth = totalWidthLessSTR - totalLockedColWidth;
                var unallocatedViewportWidth = viewportWidth - totalLockedColWidth - strColsMinWidth;
                for (i = 0; i < this.columns.length; i++) {
                    c = this.columns[i];
                    colWidth = c.width;
                    if (c.autoSize.autosizeMode !== ColAutosizeMode.Locked) {
                        if (c.autoSize.sizeToRemaining) {
                            colWidth = c.minWidth;
                        } else {
                            // size width proportionally to free space (we know we have enough room due to the earlier calculations)
                            colWidth = unallocatedViewportWidth / unallocatedColWidth * c.autoSize.widthPx;
                            if (colWidth < c.minWidth) { colWidth = c.minWidth; }

                            // remove the just allocated widths from the allocation pool
                            unallocatedColWidth -= c.autoSize.widthPx;
                            unallocatedViewportWidth -= colWidth;
                        }
                    }
                    if (c.rerenderOnResize && c.width != colWidth) { reRender = true; }
                    c.width = colWidth;
                }
            }
        }

        if (autosizeMode === GridAutosizeColsMode.IgnoreViewport) {
            // just size columns as-is
            for (i = 0; i < this.columns.length; i++) {
                colWidth = this.columns[i].autoSize.widthPx;
                if (this.columns[i].rerenderOnResize && this.columns[i].width != colWidth) {
                    reRender = true;
                }
                this.columns[i].width = colWidth;
            }
        }

        //LogColWidths();
        this.reRenderColumns(reRender);
    }

    private LogColWidths() {
        var s = "Col Widths:";
        for (var i = 0; i < this.columns.length; i++) { s += ' ' + this.columns[i].width; }
        console.log(s);
    }

    private getColAutosizeWidth(columnDef, $gridCanvas, isInit?) {
        var autoSize = columnDef.autoSize;

        // set to width as default
        autoSize.widthPx = columnDef.width;
        if (autoSize.autosizeMode === ColAutosizeMode.Locked
            || autoSize.autosizeMode === ColAutosizeMode.Guide) {
            return;
        }

        var dl = this.getDataLength(); //getDataItem();

        // ContentIntelligent takes settings from column data type
        if (autoSize.autosizeMode === ColAutosizeMode.ContentIntelligent) {
            // default to column colDataTypeOf (can be used if initially there are no data rows)
            var colDataTypeOf = autoSize.colDataTypeOf;
            var colDataItem;
            if (dl > 0) {
                var tempRow = this.getDataItem(0);
                if (tempRow) {
                    colDataItem = tempRow[columnDef.field];
                    colDataTypeOf = typeof colDataItem;
                    if (colDataTypeOf === 'object') {
                        if (colDataItem instanceof Date) { colDataTypeOf = "date"; }
                        if (typeof moment !== 'undefined' && colDataItem instanceof moment) { colDataTypeOf = "moment"; }
                    }
                }
            }
            if (colDataTypeOf === 'boolean') {
                autoSize.colValueArray = [true, false];
            }
            if (colDataTypeOf === 'number') {
                autoSize.valueFilterMode = ValueFilterMode.GetGreatestAndSub;
                autoSize.rowSelectionMode = RowSelectionMode.AllRows;
            }
            if (colDataTypeOf === 'string') {
                autoSize.valueFilterMode = ValueFilterMode.GetLongestText;
                autoSize.rowSelectionMode = RowSelectionMode.AllRows;
                autoSize.allowAddlPercent = 5;
            }
            if (colDataTypeOf === 'date') {
                autoSize.colValueArray = [new Date(2009, 8, 30, 12, 20, 20)]; // Sep 30th 2009, 12:20:20 AM
            }
            if (colDataTypeOf === 'moment' && typeof moment !== 'undefined') {
                autoSize.colValueArray = [moment([2009, 8, 30, 12, 20, 20])]; // Sep 30th 2009, 12:20:20 AM
            }
        }

        // at this point, the autosizeMode is effectively 'Content', so proceed to get size
        var colWidth = this.getColContentSize(columnDef, $gridCanvas, isInit);

        var addlPercentMultiplier = (autoSize.allowAddlPercent ? (1 + autoSize.allowAddlPercent / 100) : 1);
        colWidth = colWidth * addlPercentMultiplier + this.options.autosizeColPaddingPx;
        if (columnDef.minWidth && colWidth < columnDef.minWidth) { colWidth = columnDef.minWidth; }
        if (columnDef.maxWidth && colWidth > columnDef.maxWidth) { colWidth = columnDef.maxWidth; }

        autoSize.widthPx = colWidth;
    }

    private getColContentSize(columnDef, $gridCanvas, isInit?) {
        var autoSize = columnDef.autoSize;
        var widthAdjustRatio = 1;

        // at this point, the autosizeMode is effectively 'Content', so proceed to get size

        // get header width, if we are taking notice of it
        var i, ii;
        var maxColWidth = 0;
        var headerWidth = 0;
        if (!autoSize.ignoreHeaderText) {
            headerWidth = this.getColHeaderWidth(columnDef);
        }

        if (autoSize.colValueArray) {
            // if an array of values are specified, just pass them in instead of data
            maxColWidth = this.getColWidth(columnDef, $gridCanvas, autoSize.colValueArray);
            return Math.max(headerWidth, maxColWidth);
        }

        // select rows to evaluate using rowSelectionMode and rowSelectionCount
        var rows = this.getData();
        if (rows.getItems) { rows = rows.getItems(); }

        var rowSelectionMode = (isInit ? autoSize.rowSelectionModeOnInit : undefined) || autoSize.rowSelectionMode;

        if (rowSelectionMode === RowSelectionMode.FirstRow) { rows = rows.slice(0, 1); }
        if (rowSelectionMode === RowSelectionMode.LastRow) { rows = rows.slice(rows.length - 1, rows.length); }
        if (rowSelectionMode === RowSelectionMode.FirstNRows) { rows = rows.slice(0, autoSize.rowSelectionCount); }

        // now use valueFilterMode to further filter selected rows
        if (autoSize.valueFilterMode === ValueFilterMode.DeDuplicate) {
            var rowsDict = {};
            for (i = 0, ii = rows.length; i < ii; i++) {
                rowsDict[rows[i][columnDef.field]] = true;
            }
            if (Object.keys) {
                rows = Object.keys(rowsDict);
            } else {
                rows = [];
                for (var r in rowsDict) rows.push(r);
            }
        }

        if (autoSize.valueFilterMode === ValueFilterMode.GetGreatestAndSub) {
            // get greatest abs value in data
            var tempVal, maxVal, maxAbsVal = 0;
            for (i = 0, ii = rows.length; i < ii; i++) {
                tempVal = rows[i][columnDef.field];
                if (Math.abs(tempVal) > maxAbsVal) { maxVal = tempVal; maxAbsVal = Math.abs(tempVal); }
            }
            // now substitute a '9' for all characters (to get widest width) and convert back to a number
            maxVal = '' + maxVal;
            maxVal = Array(maxVal.length + 1).join("9");
            maxVal = +maxVal;

            rows = [maxVal];
        }

        if (autoSize.valueFilterMode === ValueFilterMode.GetLongestTextAndSub) {
            // get greatest abs value in data
            var tempVal, maxLen = 0;
            for (i = 0, ii = rows.length; i < ii; i++) {
                tempVal = rows[i][columnDef.field];
                if ((tempVal || '').length > maxLen) { maxLen = tempVal.length; }
            }
            // now substitute a 'c' for all characters
            tempVal = Array(maxLen + 1).join("m");
            widthAdjustRatio = this.options.autosizeTextAvgToMWidthRatio;

            rows = [tempVal];
        }

        if (autoSize.valueFilterMode === ValueFilterMode.GetLongestText) {
            // get greatest abs value in data
            var tempVal, maxLen = 0, maxIndex = 0;
            for (i = 0, ii = rows.length; i < ii; i++) {
                tempVal = rows[i][columnDef.field];
                if ((tempVal || '').length > maxLen) { maxLen = tempVal.length; maxIndex = i; }
            }
            // now substitute a 'c' for all characters
            tempVal = rows[maxIndex][columnDef.field];
            rows = [tempVal];
        }

        maxColWidth = this.getColWidth(columnDef, $gridCanvas, rows) * widthAdjustRatio;
        return Math.max(headerWidth, maxColWidth);
    }

    private getColWidth(columnDef, $gridCanvas, data) {
        var colIndex = this.getColumnIndex(columnDef.id);

        var $rowEl = $('<div class="slick-row ui-widget-content"></div>');
        var $cellEl = $('<div class="slick-cell"></div>');
        $cellEl.css({
            "position": "absolute",
            "visibility": "hidden",
            "text-overflow": "initial",
            "white-space": "nowrap"
        });
        $rowEl.append($cellEl);

        $gridCanvas.append($rowEl);

        var len, max = 0, text, maxText, formatterResult, maxWidth = 0, val;

        // use canvas - very fast, but text-only
        if (this.canvas_context && columnDef.autoSize.widthEvalMode === WidthEvalMode.CanvasTextSize) {
            this.canvas_context.font = $cellEl.css("font-size") + " " + $cellEl.css("font-family");
            $(data).each(function (index, row) {
                // row is either an array or values or a single value
                val = (Array.isArray(row) ? row[columnDef.field] : row);
                text = '' + val;
                len = text ? this.canvas_context.measureText(text).width : 0;
                if (len > max) { max = len; maxText = text; }
            });

            $cellEl.html(maxText);
            len = $cellEl.outerWidth();

            $rowEl.remove();
            $cellEl = null;
            return len;
        }

        $(data).each(function (index, row) {
            val = (Array.isArray(row) ? row[columnDef.field] : row);
            if (columnDef.formatterOverride) {
                // use formatterOverride as first preference
                formatterResult = columnDef.formatterOverride(index, colIndex, val, columnDef, row, self);
            } else if (columnDef.formatter) {
                // otherwise, use formatter
                formatterResult = columnDef.formatter(index, colIndex, val, columnDef, row, self);
            } else {
                // otherwise, use plain text
                formatterResult = '' + val;
            }
            this.applyFormatResultToCellNode(formatterResult, this.$cellEl[0]);
            len = this.$cellEl.outerWidth();
            if (len > max) { max = len; }
        });

        $rowEl.remove();
        $cellEl = null;
        return max;
    }

    private getColHeaderWidth(columnDef) {
        var width = 0;
        //if (columnDef && (!columnDef.resizable || columnDef._autoCalcWidth === true)) return;
        var headerColElId = this.getUID() + columnDef.id;
        var headerColEl: any = document.getElementById(headerColElId);
        var dummyHeaderColElId = headerColElId + "_";
        if (headerColEl) {
            // headers have been created, use clone technique
            var clone = headerColEl.cloneNode(true) as HTMLElement;
            clone.id = dummyHeaderColElId;
            clone.style.cssText = 'position: absolute; visibility: hidden;right: auto;text-overflow: initial;white-space: nowrap;';
            headerColEl.parentNode.insertBefore(clone, headerColEl);
            width = clone.offsetWidth;
            clone.parentNode.removeChild(clone);
        } else {
            // headers have not yet been created, create a new node
            var header = this.getHeader(columnDef);
            headerColEl = $("<div class='ui-state-default slick-header-column' />")
                .html("<span class='slick-column-name'>" + columnDef.name + "</span>")
                .attr("id", dummyHeaderColElId)
                .css({ "position": "absolute", "visibility": "hidden", "right": "auto", "text-overflow:": "initial", "white-space": "nowrap" })
                .addClass(columnDef.headerCssClass || "")
                .appendTo(header);
            width = headerColEl[0].offsetWidth;
            header[0].removeChild(headerColEl[0]);
        }
        return width;
    }

    private legacyAutosizeColumns() {
        var i, c,
            widths = [],
            shrinkLeeway = 0,
            total = 0,
            prevTotal,
            availWidth = this.viewportHasVScroll ? this.viewportW - scrollbarDimensions.width : this.viewportW;

        for (i = 0; i < this.columns.length; i++) {
            c = this.columns[i];
            widths.push(c.width);
            total += c.width;
            if (c.resizable) {
                shrinkLeeway += c.width - Math.max(c.minWidth, this.absoluteColumnMinWidth);
            }
        }

        // shrink
        prevTotal = total;
        while (total > availWidth && shrinkLeeway) {
            var shrinkProportion = (total - availWidth) / shrinkLeeway;
            for (i = 0; i < this.columns.length && total > availWidth; i++) {
                c = this.columns[i];
                var width = widths[i];
                if (!c.resizable || width <= c.minWidth || width <= this.absoluteColumnMinWidth) {
                    continue;
                }
                var absMinWidth = Math.max(c.minWidth, this.absoluteColumnMinWidth);
                var shrinkSize = Math.floor(shrinkProportion * (width - absMinWidth)) || 1;
                shrinkSize = Math.min(shrinkSize, width - absMinWidth);
                total -= shrinkSize;
                shrinkLeeway -= shrinkSize;
                widths[i] -= shrinkSize;
            }
            if (prevTotal <= total) {  // avoid infinite loop
                break;
            }
            prevTotal = total;
        }

        // grow
        prevTotal = total;
        while (total < availWidth) {
            var growProportion = availWidth / total;
            for (i = 0; i < this.columns.length && total < availWidth; i++) {
                c = this.columns[i];
                var currentWidth = widths[i];
                var growSize;

                if (!c.resizable || c.maxWidth <= currentWidth) {
                    growSize = 0;
                } else {
                    growSize = Math.min(Math.floor(growProportion * currentWidth) - currentWidth, (c.maxWidth - currentWidth) || 1000000) || 1;
                }
                total += growSize;
                widths[i] += (total <= availWidth ? growSize : 0);
            }
            if (prevTotal >= total) {  // avoid infinite loop
                break;
            }
            prevTotal = total;
        }

        var reRender = false;
        for (i = 0; i < this.columns.length; i++) {
            if (this.columns[i].rerenderOnResize && this.columns[i].width != widths[i]) {
                reRender = true;
            }
            this.columns[i].width = widths[i];
        }

        this.reRenderColumns(reRender);
    }

    private reRenderColumns(reRender) {
        this.applyColumnHeaderWidths();
        this.applyColumnGroupHeaderWidths();
        this.updateCanvasWidth(true);

        this.trigger(this.onAutosizeColumns, { "columns": this.columns });

        if (reRender) {
            this.invalidateAllRows();
            this.render();
        }
    }

    //////////////////////////////////////////////////////////////////////////////////////////////
    // General
    //////////////////////////////////////////////////////////////////////////////////////////////

    private trigger(evt, args: any = {}, e = new EventData()) {
        args.grid = self;
        return evt.notify(args, e, self);
    }

    public getEditorLock() {
        return this.options.editorLock;
    }

    public getEditController() {
        return this.editController;
    }

    public getColumnIndex(id) {
        return this.columnsById[id];
    }

    private applyColumnGroupHeaderWidths() {
        if (!this.treeColumns.hasDepth())
            return;

        for (var depth = this.$groupHeadersL.length - 1; depth >= 0; depth--) {

            var groupColumns = this.treeColumns.getColumnsInDepth(depth);

            $().add(this.$groupHeadersL[depth]).add(this.$groupHeadersR[depth]).each((i, e) => {
                var $groupHeader = $(e),
                    currentColumnIndex = 0;

                this.$groupHeader.width(i === 0 ? this.getHeadersWidthL() : this.getHeadersWidthR());

                this.$groupHeader.children().each((i, el) => {
                    var $groupHeaderColumn = $(el);

                    var m = $(el).data('column');

                    m.width = 0;

                    m.columns.forEach(() => {
                        var $headerColumn = $groupHeader.next().children(':eq(' + (currentColumnIndex++) + ')');
                        m.width += $headerColumn.outerWidth();
                    });

                    $groupHeaderColumn.width(m.width - this.headerColumnWidthDiff);
                });

            });

        }
    }

    private applyColumnHeaderWidths() {
        if (!this.initialized) { return; }
        var h;

        for (var i = 0, headers = this.$headers.children(), ii = this.columns.length; i < ii; i++) {
            h = $(headers[i]);
            if (this.jQueryNewWidthBehaviour) {
                if (h.outerWidth() !== this.columns[i].width) {
                    h.outerWidth(this.columns[i].width);
                }
            } else {
                if (h.width() !== this.columns[i].width - this.headerColumnWidthDiff) {
                    h.width(this.columns[i].width - this.headerColumnWidthDiff);
                }
            }
        }

        this.updateColumnCaches();
    }

    private applyColumnWidths() {
        var x = 0, w, rule;
        for (var i = 0; i < this.columns.length; i++) {
            w = this.columns[i].width;

            rule = this.getColumnCssRules(i);
            rule.left.style.left = x + "px";
            rule.right.style.right = (((this.options.frozenColumn != -1 && i > this.options.frozenColumn) ? this.canvasWidthR : this.canvasWidthL) - x - w) + "px";

            // If this column is frozen, reset the css left value since the
            // column starts in a new viewport.
            if (this.options.frozenColumn == i) {
                x = 0;
            } else {
                x += this.columns[i].width;
            }
        }
    }

    public setSortColumn(columnId, ascending) {
        this.setSortColumns([{ columnId: columnId, sortAsc: ascending }]);
    }

    public setSortColumns(cols) {
        this.sortColumns = cols;
        var numberCols = this.options.numberedMultiColumnSort && this.sortColumns.length > 1;
        var headerColumnEls = this.$headers.children();
        headerColumnEls
            .removeClass("slick-header-column-sorted")
            .find(".slick-sort-indicator")
            .removeClass("slick-sort-indicator-asc slick-sort-indicator-desc");
        headerColumnEls
            .find(".slick-sort-indicator-numbered")
            .text('');

        $.each(this.sortColumns, (i, col) => {
            if (col.sortAsc == null) {
                col.sortAsc = true;
            }
            var columnIndex = this.getColumnIndex(col.columnId);
            if (columnIndex != null) {
                headerColumnEls.eq(columnIndex)
                    .addClass("slick-header-column-sorted")
                    .find(".slick-sort-indicator")
                    .addClass(col.sortAsc ? "slick-sort-indicator-asc" : "slick-sort-indicator-desc");
                if (numberCols) {
                    headerColumnEls.eq(columnIndex)
                        .find(".slick-sort-indicator-numbered")
                        .text(i + 1);
                }
            }
        });
    }

    public getSortColumns() {
        return this.sortColumns;
    }

    private handleSelectedRangesChanged(e, ranges) {
        var previousSelectedRows = this.selectedRows.slice(0); // shallow copy previously selected rows for later comparison
        this.selectedRows = [];
        var hash = {};
        for (var i = 0; i < ranges.length; i++) {
            for (var j = ranges[i].fromRow; j <= ranges[i].toRow; j++) {
                if (!hash[j]) {  // prevent duplicates
                    this.selectedRows.push(j);
                    hash[j] = {};
                }
                for (var k = ranges[i].fromCell; k <= ranges[i].toCell; k++) {
                    if (this.canCellBeSelected(j, k)) {
                        hash[j][this.columns[k].id] = this.options.selectedCellCssClass;
                    }
                }
            }
        }

        this.setCellCssStyles(this.options.selectedCellCssClass, hash);

        if (this.simpleArrayEquals(previousSelectedRows, this.selectedRows)) {
            this.trigger(this.onSelectedRowsChanged, { rows: this.getSelectedRows(), previousSelectedRows: previousSelectedRows }, e);
        }
    }

    // compare 2 simple arrays (integers or strings only, do not use to compare object arrays)
    private simpleArrayEquals(arr1, arr2) {
        return Array.isArray(arr1) && Array.isArray(arr2) && arr2.sort().toString() !== arr1.sort().toString();
    }

    public getColumns() {
        return this.columns;
    }

    private updateColumnCaches() {
        // Pre-calculate cell boundaries.
        this.columnPosLeft = [];
        this.columnPosRight = [];
        var x = 0;
        for (var i = 0, ii = this.columns.length; i < ii; i++) {
            this.columnPosLeft[i] = x;
            this.columnPosRight[i] = x + this.columns[i].width;

            if (this.options.frozenColumn == i) {
                x = 0;
            } else {
                x += this.columns[i].width;
            }
        }
    }

    private updateColumnProps() {
        this.columnsById = {};
        for (var i = 0; i < this.columns.length; i++) {
            if (this.columns[i].width) { this.columns[i].widthRequest = this.columns[i].width; }

            var m = this.columns[i] = $.extend({}, this.columnDefaults, this.columns[i]);
            m.autoSize = $.extend({}, this.columnAutosizeDefaults, m.autoSize);

            this.columnsById[m.id] = i;
            if (m.minWidth && m.width < m.minWidth) {
                m.width = m.minWidth;
            }
            if (m.maxWidth && m.width > m.maxWidth) {
                m.width = m.maxWidth;
            }
            if (!m.resizable) {
                // there is difference between user resizable and autoWidth resizable
                //m.autoSize.autosizeMode = ColAutosizeMode.Locked;
            }
        }
    }

    public setColumns(columnDefinitions) {
        var _treeColumns = new TreeColumns(columnDefinitions);
        if (_treeColumns.hasDepth()) {
            this.treeColumns = _treeColumns;
            this.columns = this.treeColumns.extractColumns();
        } else {
            this.columns = columnDefinitions;
        }

        this.updateColumnProps();
        this.updateColumnCaches();

        if (this.initialized) {
            this.setPaneVisibility();
            this.setOverflow();

            this.invalidateAllRows();
            this.createColumnHeaders();
            this.createColumnGroupHeaders();
            this.createColumnFooter();
            this.removeCssRules();
            this.createCssRules();
            this.resizeCanvas();
            this.updateCanvasWidth();
            this.applyColumnHeaderWidths();
            this.applyColumnWidths();
            this.handleScroll();
        }
    }

    public getOptions() {
        return this.options;
    }

    public setOptions(args, suppressRender, suppressColumnSet) {
        if (!this.getEditorLock().commitCurrentEdit()) {
            return;
        }

        this.makeActiveCellNormal();

        if (args.showColumnHeader !== undefined) {
            this.setColumnHeaderVisibility(args.showColumnHeader);
        }

        if (this.options.enableAddRow !== args.enableAddRow) {
            this.invalidateRow(this.getDataLength());
        }

        var originalOptions = $.extend(true, {}, this.options);
        this.options = $.extend(this.options, args);
        this.trigger(this.onSetOptions, { "optionsBefore": originalOptions, "optionsAfter": this.options });

        this.validateAndEnforceOptions();

        this.$viewport.css("overflow-y", this.options.autoHeight ? "hidden" : "auto");
        if (!suppressRender) {
            this.render();
        }

        this.setFrozenOptions();
        this.setScroller();
        this.zombieRowNodeFromLastMouseWheelEvent = null;

        if (!suppressColumnSet) {
            this.setColumns(this.treeColumns.extractColumns());
        }

        if (this.options.enableMouseWheelScrollHandler && this.$viewport && (jQuery.fn as any).mousewheel) {
            var viewportEvents = ($ as any)._data(this.$viewport[0], "events");
            if (!viewportEvents || !viewportEvents.mousewheel) {
                this.$viewport.on("mousewheel", this.handleMouseWheel);
            }
        } else if (this.options.enableMouseWheelScrollHandler === false) {
            this.$viewport.off("mousewheel"); // remove scroll handler when option is disable
        }
    }

    private validateAndEnforceOptions() {
        if (this.options.autoHeight) {
            this.options.leaveSpaceForNewRows = false;
        }
        if (this.options.forceFitColumns) {
            this.options.autosizeColsMode = GridAutosizeColsMode.LegacyForceFit;
            console.log("forceFitColumns option is deprecated - use autosizeColsMode");
        }
    }

    public setData(newData, scrollToTop) {
        this.data = newData;
        this.invalidateAllRows();
        this.updateRowCount();
        if (scrollToTop) {
            this.scrollTo(0);
        }
    }

    public getData() {
        return this.data;
    }

    public getDataLength(): number {
        if (this.data.getLength) {
            return this.data.getLength();
        } else {
            return this.data && this.data.length || 0;
        }
    }

    private getDataLengthIncludingAddNew() {
        return this.getDataLength() + (!this.options.enableAddRow ? 0
            : (!this.pagingActive || this.pagingIsLastPage ? 1 : 0)
        );
    }

    public getDataItem(i) {
        if (this.data.getItem) {
            return this.data.getItem(i);
        } else {
            return this.data[i];
        }
    }

    public getTopPanel() {
        return this.$topPanel[0];
    }

    public setTopPanelVisibility(visible, animate) {
        var animated = (animate === false) ? false : true;

        if (this.options.showTopPanel != visible) {
            this.options.showTopPanel = visible;
            if (visible) {
                if (animated) {
                    this.$topPanelScroller.slideDown("fast", this.resizeCanvas);
                } else {
                    this.$topPanelScroller.show();
                    this.resizeCanvas();
                }
            } else {
                if (animated) {
                    this.$topPanelScroller.slideUp("fast", this.resizeCanvas);
                } else {
                    this.$topPanelScroller.hide();
                    this.resizeCanvas();
                }
            }
        }
    }

    public setHeaderRowVisibility(visible, animate) {
        var animated = (animate === false) ? false : true;

        if (this.options.showHeaderRow != visible) {
            this.options.showHeaderRow = visible;
            if (visible) {
                if (animated) {
                    this.$headerRowScroller.slideDown("fast", this.resizeCanvas);
                } else {
                    this.$headerRowScroller.show();
                    this.resizeCanvas();
                }
            } else {
                if (animated) {
                    this.$headerRowScroller.slideUp("fast", this.resizeCanvas);
                } else {
                    this.$headerRowScroller.hide();
                    this.resizeCanvas();
                }
            }
        }
    }

    public setColumnHeaderVisibility(visible, animate?) {
        if (this.options.showColumnHeader != visible) {
            this.options.showColumnHeader = visible;
            if (visible) {
                if (animate) {
                    this.$headerScroller.slideDown("fast", this.resizeCanvas);
                } else {
                    this.$headerScroller.show();
                    this.resizeCanvas();
                }
            } else {
                if (animate) {
                    this.$headerScroller.slideUp("fast", this.resizeCanvas);
                } else {
                    this.$headerScroller.hide();
                    this.resizeCanvas();
                }
            }
        }
    }

    public setFooterRowVisibility(visible, animate) {
        var animated = (animate === false) ? false : true;

        if (this.options.showFooterRow != visible) {
            this.options.showFooterRow = visible;
            if (visible) {
                if (animated) {
                    this.$footerRowScroller.slideDown("fast", this.resizeCanvas);
                } else {
                    this.$footerRowScroller.show();
                    this.resizeCanvas();
                }
            } else {
                if (animated) {
                    this.$footerRowScroller.slideUp("fast", this.resizeCanvas);
                } else {
                    this.$footerRowScroller.hide();
                    this.resizeCanvas();
                }
            }
        }
    }

    public setPreHeaderPanelVisibility(visible, animate) {
        var animated = (animate === false) ? false : true;

        if (this.options.showPreHeaderPanel != visible) {
            this.options.showPreHeaderPanel = visible;
            if (visible) {
                if (animated) {
                    this.$preHeaderPanelScroller.slideDown("fast", this.resizeCanvas);
                } else {
                    this.$preHeaderPanelScroller.show();
                    this.resizeCanvas();
                }
            } else {
                if (animated) {
                    this.$preHeaderPanelScroller.slideUp("fast", this.resizeCanvas);
                } else {
                    this.$preHeaderPanelScroller.hide();
                    this.resizeCanvas();
                }
            }
        }
    }

    public getContainerNode() {
        return this.$container.get(0);
    }

    //////////////////////////////////////////////////////////////////////////////////////////////
    // Rendering / Scrolling

    private getRowTop(row) {
        return this.options.rowHeight * row - this.offset;
    }

    private getRowFromPosition(y) {
        return Math.floor((y + this.offset) / this.options.rowHeight);
    }

    public scrollTo(y) {
        y = Math.max(y, 0);
        y = Math.min(y, this.th - this.$viewportScrollContainerY.height() + ((this.viewportHasHScroll || this.hasFrozenColumns()) ? scrollbarDimensions.height : 0));

        var oldOffset = this.offset;

        this.page = Math.min(this.n - 1, Math.floor(y / this.ph));
        this.offset = Math.round(this.page * this.cj);
        var newScrollTop = y - this.offset;

        if (this.offset != oldOffset) {
            var range = this.getVisibleRange(newScrollTop);
            this.cleanupRows(range);
            this.updateRowPositions();
        }

        if (this.prevScrollTop != newScrollTop) {
            this.vScrollDir = (this.prevScrollTop + oldOffset < newScrollTop + this.offset) ? 1 : -1;
            this.lastRenderedScrollTop = (this.scrollTop = this.prevScrollTop = newScrollTop);

            if (this.hasFrozenColumns()) {
                this.$viewportTopL[0].scrollTop = newScrollTop;
            }

            if (this.hasFrozenRows) {
                this.$viewportBottomL[0].scrollTop = this.$viewportBottomR[0].scrollTop = newScrollTop;
            }

            this.$viewportScrollContainerY[0].scrollTop = newScrollTop;

            this.trigger(this.onViewportChanged, {});
        }
    }

    private defaultFormatter(row, cell, value, columnDef, dataContext, grid) {
        if (value == null) {
            return "";
        } else {
            return (value + "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }
    }

    private getFormatter(row, column) {
        var rowMetadata = this.data.getItemMetadata && this.data.getItemMetadata(row);

        // look up by id, then index
        var columnOverrides = rowMetadata &&
            rowMetadata.columns &&
            (rowMetadata.columns[column.id] || rowMetadata.columns[this.getColumnIndex(column.id)]);

        return (columnOverrides && columnOverrides.formatter) ||
            (rowMetadata && rowMetadata.formatter) ||
            column.formatter ||
            (this.options.formatterFactory && this.options.formatterFactory.getFormatter(column)) ||
            this.options.defaultFormatter;
    }

    private getEditor(row, cell) {
        var column = this.columns[cell];
        var rowMetadata = this.data.getItemMetadata && this.data.getItemMetadata(row);
        var columnMetadata = rowMetadata && rowMetadata.columns;

        if (columnMetadata && columnMetadata[column.id] && columnMetadata[column.id].editor !== undefined) {
            return columnMetadata[column.id].editor;
        }
        if (columnMetadata && columnMetadata[cell] && columnMetadata[cell].editor !== undefined) {
            return columnMetadata[cell].editor;
        }

        return column.editor || (this.options.editorFactory && this.options.editorFactory.getEditor(column));
    }

    private getDataItemValueForColumn(item, columnDef) {
        if (this.options.dataItemColumnValueExtractor) {
            return this.options.dataItemColumnValueExtractor(item, columnDef);
        }
        return item[columnDef.field];
    }

    private appendRowHtml(stringArrayL, stringArrayR, row, range, dataLength) {
        var d = this.getDataItem(row);
        var dataLoading = row < dataLength && !d;
        var rowCss = "slick-row" +
            (this.hasFrozenRows && row <= this.options.frozenRow ? ' frozen' : '') +
            (dataLoading ? " loading" : "") +
            (row === this.activeRow && this.options.showCellSelection ? " active" : "") +
            (row % 2 == 1 ? " odd" : " even");

        if (!d) {
            rowCss += " " + this.options.addNewRowCssClass;
        }

        var metadata = this.data.getItemMetadata && this.data.getItemMetadata(row);

        if (metadata && metadata.cssClasses) {
            rowCss += " " + metadata.cssClasses;
        }

        var frozenRowOffset = this.getFrozenRowOffset(row);

        var rowHtml = "<div class='ui-widget-content " + rowCss + "' style='top:"
            + (this.getRowTop(row) - frozenRowOffset)
            + "px'>";

        stringArrayL.push(rowHtml);

        if (this.hasFrozenColumns()) {
            stringArrayR.push(rowHtml);
        }

        var colspan, m;
        for (var i = 0, ii = this.columns.length; i < ii; i++) {
            m = this.columns[i];
            colspan = 1;
            if (metadata && metadata.columns) {
                var columnData = metadata.columns[m.id] || metadata.columns[i];
                colspan = (columnData && columnData.colspan) || 1;
                if (colspan === "*") {
                    colspan = ii - i;
                }
            }

            // Do not render cells outside of the viewport.
            if (this.columnPosRight[Math.min(ii - 1, i + colspan - 1)] > range.leftPx) {
                if (!m.alwaysRenderColumn && this.columnPosLeft[i] > range.rightPx) {
                    // All columns to the right are outside the range.
                    break;
                }

                if (this.hasFrozenColumns() && (i > this.options.frozenColumn)) {
                    this.appendCellHtml(stringArrayR, row, i, colspan, d);
                } else {
                    this.appendCellHtml(stringArrayL, row, i, colspan, d);
                }
            } else if (m.alwaysRenderColumn || (this.hasFrozenColumns() && i <= this.options.frozenColumn)) {
                this.appendCellHtml(stringArrayL, row, i, colspan, d);
            }

            if (colspan > 1) {
                i += (colspan - 1);
            }
        }

        stringArrayL.push("</div>");

        if (this.hasFrozenColumns()) {
            stringArrayR.push("</div>");
        }
    }

    private appendCellHtml(stringArray, row, cell, colspan, item) {
        // stringArray: stringBuilder containing the HTML parts
        // row, cell: row and column index
        // colspan: HTML colspan
        // item: grid data for row

        var m = this.columns[cell];
        var cellCss = "slick-cell l" + cell + " r" + Math.min(this.columns.length - 1, cell + colspan - 1) +
            (m.cssClass ? " " + m.cssClass : "");

        if (this.hasFrozenColumns() && cell <= this.options.frozenColumn) {
            cellCss += (" frozen");
        }

        if (row === this.activeRow && cell === this.activeCell && this.options.showCellSelection) {
            cellCss += (" active");
        }

        // TODO:  merge them together in the setter
        for (var key in this.cellCssClasses) {
            if (this.cellCssClasses[key][row] && this.cellCssClasses[key][row][m.id]) {
                cellCss += (" " + this.cellCssClasses[key][row][m.id]);
            }
        }

        var value = null, formatterResult: any = '';
        if (item) {
            value = this.getDataItemValueForColumn(item, m);
            formatterResult = this.getFormatter(row, m)(row, cell, value, m, item, self);
            if (formatterResult === null || formatterResult === undefined) { formatterResult = ''; }
        }

        // get addl css class names from object type formatter return and from string type return of onBeforeAppendCell
        var addlCssClasses = this.trigger(this.onBeforeAppendCell, { row: row, cell: cell, value: value, dataContext: item }) || '';
        addlCssClasses += (formatterResult && formatterResult.addClasses ? (addlCssClasses ? ' ' : '') + formatterResult.addClasses : '');
        var toolTip = formatterResult && formatterResult.toolTip ? "title='" + formatterResult.toolTip + "'" : '';

        var customAttrStr = '';
        if (m.hasOwnProperty('cellAttrs') && m.cellAttrs instanceof Object) {
            for (var key in m.cellAttrs) {
                if (m.cellAttrs.hasOwnProperty(key)) {
                    customAttrStr += ' ' + key + '="' + m.cellAttrs[key] + '" ';
                }
            }
        }

        stringArray.push("<div class='" + cellCss + (addlCssClasses ? ' ' + addlCssClasses : '') + "' " + toolTip + customAttrStr + ">");

        // if there is a corresponding row (if not, this is the Add New row or this data hasn't been loaded yet)
        if (item) {
            stringArray.push(Object.prototype.toString.call(formatterResult) !== '[object Object]' ? formatterResult : formatterResult.text);
        }

        stringArray.push("</div>");

        this.rowsCache[row].cellRenderQueue.push(cell);
        this.rowsCache[row].cellColSpans[cell] = colspan;
    }


    private cleanupRows(rangeToKeep) {
        for (var i in this.rowsCache) {
            var removeFrozenRow = true;

            if (this.hasFrozenRows
                && ((this.options.frozenBottom && i as any >= this.actualFrozenRow) // Frozen bottom rows
                    || (!this.options.frozenBottom && i as any <= this.actualFrozenRow) // Frozen top rows
                )
            ) {
                removeFrozenRow = false;
            }

            if (((i = parseInt(i, 10) as any) !== this.activeRow)
                && (i < rangeToKeep.top || i > rangeToKeep.bottom)
                && (removeFrozenRow)
            ) {
                this.removeRowFromCache(i);
            }
        }
        if (this.options.enableAsyncPostRenderCleanup) { this.startPostProcessingCleanup(); }
    }

    public invalidate() {
        this.updateRowCount();
        this.invalidateAllRows();
        this.render();
    }

    public invalidateAllRows() {
        if (this.currentEditor) {
            this.makeActiveCellNormal();
        }
        for (var row in this.rowsCache) {
            this.removeRowFromCache(row);
        }
        if (this.options.enableAsyncPostRenderCleanup) { this.startPostProcessingCleanup(); }
    }

    private queuePostProcessedRowForCleanup(cacheEntry, postProcessedRow, rowIdx) {
        this.postProcessgroupId++;

        // store and detach node for later async cleanup
        for (var columnIdx in postProcessedRow) {
            if (postProcessedRow.hasOwnProperty(columnIdx)) {
                this.postProcessedCleanupQueue.push({
                    actionType: 'C',
                    groupId: this.postProcessgroupId,
                    node: cacheEntry.cellNodesByColumnIdx[columnIdx as any | 0],
                    columnIdx: columnIdx as any | 0,
                    rowIdx: rowIdx
                });
            }
        }
        this.postProcessedCleanupQueue.push({
            actionType: 'R',
            groupId: this.postProcessgroupId,
            node: cacheEntry.rowNode
        });
        $(cacheEntry.rowNode).detach();
    }

    private queuePostProcessedCellForCleanup(cellnode, columnIdx, rowIdx) {
        this.postProcessedCleanupQueue.push({
            actionType: 'C',
            groupId: this.postProcessgroupId,
            node: cellnode,
            columnIdx: columnIdx,
            rowIdx: rowIdx
        });
        $(cellnode).detach();
    }

    private removeRowFromCache(row) {
        var cacheEntry = this.rowsCache[row];
        if (!cacheEntry) {
            return;
        }

        if (this.rowNodeFromLastMouseWheelEvent == cacheEntry.rowNode[0]
            || (this.hasFrozenColumns() && this.rowNodeFromLastMouseWheelEvent == cacheEntry.rowNode[1])) {

            cacheEntry.rowNode.hide();

            this.zombieRowNodeFromLastMouseWheelEvent = cacheEntry.rowNode;
        } else {

            cacheEntry.rowNode.each((i, el) => {
                el.parentElement.removeChild(el);
            });

        }

        delete this.rowsCache[row];
        delete this.postProcessedRows[row];
        this.renderedRows--;
        this.counter_rows_removed++;
    }

    public invalidateRows(rows) {
        var i, rl;
        if (!rows || !rows.length) {
            return;
        }
        this.vScrollDir = 0;
        rl = rows.length;
        for (i = 0; i < rl; i++) {
            if (this.currentEditor && this.activeRow === rows[i]) {
                this.makeActiveCellNormal();
            }
            if (this.rowsCache[rows[i]]) {
                this.removeRowFromCache(rows[i]);
            }
        }
        if (this.options.enableAsyncPostRenderCleanup) { this.startPostProcessingCleanup(); }
    }

    public invalidateRow(row) {
        if (!row && row !== 0) { return; }
        this.invalidateRows([row]);
    }

    public applyFormatResultToCellNode(formatterResult, cellNode, suppressRemove?) {
        if (formatterResult === null || formatterResult === undefined) { formatterResult = ''; }
        if (Object.prototype.toString.call(formatterResult) !== '[object Object]') {
            cellNode.innerHTML = formatterResult;
            return;
        }
        cellNode.innerHTML = formatterResult.text;
        if (formatterResult.removeClasses && !suppressRemove) {
            $(cellNode).removeClass(formatterResult.removeClasses);
        }
        if (formatterResult.addClasses) {
            $(cellNode).addClass(formatterResult.addClasses);
        }
        if (formatterResult.toolTip) {
            $(cellNode).attr("title", formatterResult.toolTip);
        }
    }

    public updateCell(row, cell) {
        var cellNode = this.getCellNode(row, cell);
        if (!cellNode) {
            return;
        }

        var m = this.columns[cell], d = this.getDataItem(row);
        if (this.currentEditor && this.activeRow === row && this.activeCell === cell) {
            this.currentEditor.loadValue(d);
        } else {
            var formatterResult = d ? this.getFormatter(row, m)(row, cell, this.getDataItemValueForColumn(d, m), m, d, self) : "";
            this.applyFormatResultToCellNode(formatterResult, cellNode);
            this.invalidatePostProcessingResults(row);
        }
    }

    public updateRow(row) {
        var cacheEntry = this.rowsCache[row];
        if (!cacheEntry) {
            return;
        }

        this.ensureCellNodesInRowsCache(row);

        var formatterResult, d = this.getDataItem(row);

        for (var columnIdx in cacheEntry.cellNodesByColumnIdx) {
            if (!cacheEntry.cellNodesByColumnIdx.hasOwnProperty(columnIdx)) {
                continue;
            }

            columnIdx = ((columnIdx as any) | 0) as any;
            var m = this.columns[columnIdx],
                node = cacheEntry.cellNodesByColumnIdx[columnIdx][0];

            if (row === this.activeRow && columnIdx === this.activeCell && this.currentEditor) {
                this.currentEditor.loadValue(d);
            } else if (d) {
                formatterResult = this.getFormatter(row, m)(row, columnIdx, this.getDataItemValueForColumn(d, m), m, d, self);
                this.applyFormatResultToCellNode(formatterResult, node);
            } else {
                node.innerHTML = "";
            }
        }

        this.invalidatePostProcessingResults(row);
    }

    private getViewportHeight() {
        if (!this.options.autoHeight || this.options.frozenColumn != -1) {
            this.topPanelH = (this.options.showTopPanel) ? this.options.topPanelHeight + this.getVBoxDelta(this.$topPanelScroller) : 0;
            this.headerRowH = (this.options.showHeaderRow) ? this.options.headerRowHeight + this.getVBoxDelta(this.$headerRowScroller) : 0;
            this.footerRowH = (this.options.showFooterRow) ? this.options.footerRowHeight + this.getVBoxDelta(this.$footerRowScroller) : 0;
        }
        if (this.options.autoHeight) {
            var fullHeight = this.$paneHeaderL.outerHeight();
            fullHeight += (this.options.showHeaderRow) ? this.options.headerRowHeight + this.getVBoxDelta(this.$headerRowScroller) : 0;
            fullHeight += (this.options.showFooterRow) ? this.options.footerRowHeight + this.getVBoxDelta(this.$footerRowScroller) : 0;
            fullHeight += (this.getCanvasWidth() > this.viewportW) ? scrollbarDimensions.height : 0;

            this.viewportH = this.options.rowHeight
                * this.getDataLengthIncludingAddNew()
                + ((this.options.frozenColumn == -1) ? fullHeight : 0);
        } else {
            var columnNamesH = (this.options.showColumnHeader) ? parseFloat($.css(this.$headerScroller[0], "height"))
                + this.getVBoxDelta(this.$headerScroller) : 0;
            var preHeaderH = (this.options.createPreHeaderPanel && this.options.showPreHeaderPanel) ? this.options.preHeaderPanelHeight + this.getVBoxDelta(this.$preHeaderPanelScroller) : 0;

            this.viewportH = parseFloat($.css(this.$container[0], "height"))
                - parseFloat($.css(this.$container[0], "paddingTop"))
                - parseFloat($.css(this.$container[0], "paddingBottom"))
                - columnNamesH
                - this.topPanelH
                - this.headerRowH
                - this.footerRowH
                - preHeaderH;
        }

        this.numVisibleRows = Math.ceil(this.viewportH / this.options.rowHeight);
        return this.viewportH;
    }

    private getViewportWidth() {
        this.viewportW = parseFloat(this.$container.width() as any);
    }

    public resizeCanvas() {
        if (!this.initialized) { return; }
        this.paneTopH = 0;
        this.paneBottomH = 0;
        this.viewportTopH = 0;
        this.viewportBottomH = 0;

        this.getViewportWidth();
        this.getViewportHeight();

        // Account for Frozen Rows
        if (this.hasFrozenRows) {
            if (this.options.frozenBottom) {
                this.paneTopH = this.viewportH - this.frozenRowsHeight - scrollbarDimensions.height;
                this.paneBottomH = this.frozenRowsHeight + scrollbarDimensions.height;
            } else {
                this.paneTopH = this.frozenRowsHeight;
                this.paneBottomH = this.viewportH - this.frozenRowsHeight;
            }
        } else {
            this.paneTopH = this.viewportH;
        }

        // The top pane includes the top panel and the header row
        this.paneTopH += this.topPanelH + this.headerRowH + this.footerRowH;

        if (this.hasFrozenColumns() && this.options.autoHeight) {
            this.paneTopH += scrollbarDimensions.height;
        }

        // The top viewport does not contain the top panel or header row
        this.viewportTopH = this.paneTopH - this.topPanelH - this.headerRowH - this.footerRowH;

        if (this.options.autoHeight) {
            if (this.hasFrozenColumns()) {
                this.$container.height(
                    this.paneTopH
                    + parseFloat($.css(this.$headerScrollerL[0], "height"))
                );
            }

            this.$paneTopL.css('position', 'relative');
        }

        this.$paneTopL.css({
            'top': this.$paneHeaderL.height(), 'height': this.paneTopH
        });

        var paneBottomTop = this.$paneTopL.position().top
            + this.paneTopH;

        if (!this.options.autoHeight) {
            this.$viewportTopL.height(this.viewportTopH);
        }

        if (this.hasFrozenColumns()) {
            this.$paneTopR.css({
                'top': this.$paneHeaderL.height(), 'height': this.paneTopH
            });

            this.$viewportTopR.height(this.viewportTopH);

            if (this.hasFrozenRows) {
                this.$paneBottomL.css({
                    'top': paneBottomTop, 'height': this.paneBottomH
                });

                this.$paneBottomR.css({
                    'top': paneBottomTop, 'height': this.paneBottomH
                });

                this.$viewportBottomR.height(this.paneBottomH);
            }
        } else {
            if (this.hasFrozenRows) {
                this.$paneBottomL.css({
                    'width': '100%', 'height': this.paneBottomH
                });

                this.$paneBottomL.css('top', paneBottomTop);
            }
        }

        if (this.hasFrozenRows) {
            this.$viewportBottomL.height(this.paneBottomH);

            if (this.options.frozenBottom) {
                this.$canvasBottomL.height(this.frozenRowsHeight);

                if (this.hasFrozenColumns()) {
                    this.$canvasBottomR.height(this.frozenRowsHeight);
                }
            } else {
                this.$canvasTopL.height(this.frozenRowsHeight);

                if (this.hasFrozenColumns()) {
                    this.$canvasTopR.height(this.frozenRowsHeight);
                }
            }
        } else {
            this.$viewportTopR.height(this.viewportTopH);
        }

        if (!scrollbarDimensions || !scrollbarDimensions.width) {
            scrollbarDimensions = this.measureScrollbar();
        }

        if (this.options.autosizeColsMode === GridAutosizeColsMode.LegacyForceFit) {
            this.autosizeColumns();
        }

        this.updateRowCount();
        this.handleScroll();
        // Since the width has changed, force the render() to reevaluate virtually rendered cells.
        this.lastRenderedScrollLeft = -1;
        this.render();
    }

    public updatePagingStatusFromView(pagingInfo) {
        this.pagingActive = (pagingInfo.pageSize !== 0);
        this.pagingIsLastPage = (pagingInfo.pageNum == pagingInfo.totalPages - 1);
    }

    public updateRowCount() {
        if (!this.initialized) { return; }

        var dataLength = this.getDataLength();
        var dataLengthIncludingAddNew = this.getDataLengthIncludingAddNew();
        var numberOfRows = 0;
        var oldH = (this.hasFrozenRows && !this.options.frozenBottom) ? this.$canvasBottomL.height() : this.$canvasTopL.height();

        if (this.hasFrozenRows) {
            numberOfRows = this.getDataLength() - this.options.frozenRow;
        } else {
            numberOfRows = dataLengthIncludingAddNew + (this.options.leaveSpaceForNewRows ? this.numVisibleRows - 1 : 0);
        }

        var tempViewportH = this.$viewportScrollContainerY.height();
        var oldViewportHasVScroll = this.viewportHasVScroll;
        // with autoHeight, we do not need to accommodate the vertical scroll bar
        this.viewportHasVScroll = this.options.alwaysShowVerticalScroll || !this.options.autoHeight && (numberOfRows * this.options.rowHeight > tempViewportH);

        this.makeActiveCellNormal();

        // remove the rows that are now outside of the data range
        // this helps avoid redundant calls to .removeRow() when the size of the data decreased by thousands of rows
        var r1 = dataLength - 1;
        for (var i in this.rowsCache) {
            if (i as any > r1) {
                this.removeRowFromCache(i);
            }
        }
        if (this.options.enableAsyncPostRenderCleanup) { this.startPostProcessingCleanup(); }

        if (this.activeCellNode && this.activeRow > r1) {
            this.resetActiveCell();
        }

        var oldH = this.h;
        if (this.options.autoHeight) {
            this.h = this.options.rowHeight * numberOfRows;
        } else {
            this.th = Math.max(this.options.rowHeight * numberOfRows, tempViewportH - scrollbarDimensions.height);
            if (this.th < maxSupportedCssHeight) {
                // just one page
                this.h = this.ph = this.th;
                this.n = 1;
                this.cj = 0;
            } else {
                // break into pages
                this.h = maxSupportedCssHeight;
                this.ph = this.h / 100;
                this.n = Math.floor(this.th / this.ph);
                this.cj = (this.th - this.h) / (this.n - 1);
            }
        }

        if (this.h !== oldH) {
            if (this.hasFrozenRows && !this.options.frozenBottom) {
                this.$canvasBottomL.css("height", this.h);

                if (this.hasFrozenColumns()) {
                    this.$canvasBottomR.css("height", this.h);
                }
            } else {
                this.$canvasTopL.css("height", this.h);
                this.$canvasTopR.css("height", this.h);
            }

            this.scrollTop = this.$viewportScrollContainerY[0].scrollTop;
        }

        var oldScrollTopInRange = (this.scrollTop + this.offset <= this.th - tempViewportH);

        if (this.th == 0 || this.scrollTop == 0) {
            this.page = this.offset = 0;
        } else if (oldScrollTopInRange) {
            // maintain virtual position
            this.scrollTo(this.scrollTop + this.offset);
        } else {
            // scroll to bottom
            this.scrollTo(this.th - tempViewportH);
        }

        if (this.h != oldH && this.options.autoHeight) {
            this.resizeCanvas();
        }

        if (this.options.autosizeColsMode === GridAutosizeColsMode.LegacyForceFit && oldViewportHasVScroll != this.viewportHasVScroll) {
            this.autosizeColumns();
        }
        this.updateCanvasWidth(false);
    }

    public getViewPort(viewportTop, viewportLeft) {
        return this.getVisibleRange()
    }

    private getVisibleRange(viewportTop?, viewportLeft?) {
        if (viewportTop == null) {
            viewportTop = this.scrollTop;
        }
        if (viewportLeft == null) {
            viewportLeft = this.scrollLeft;
        }

        return {
            top: this.getRowFromPosition(viewportTop),
            bottom: this.getRowFromPosition(viewportTop + this.viewportH) + 1,
            leftPx: viewportLeft,
            rightPx: viewportLeft + this.viewportW
        };
    }

    public getRenderedRange(viewportTop?, viewportLeft?) {
        var range = this.getVisibleRange(viewportTop, viewportLeft);
        var buffer = Math.round(this.viewportH / this.options.rowHeight);
        var minBuffer = this.options.minRowBuffer;

        if (this.vScrollDir == -1) {
            range.top -= buffer;
            range.bottom += minBuffer;
        } else if (this.vScrollDir == 1) {
            range.top -= minBuffer;
            range.bottom += buffer;
        } else {
            range.top -= minBuffer;
            range.bottom += minBuffer;
        }

        range.top = Math.max(0, range.top);
        range.bottom = Math.min(this.getDataLengthIncludingAddNew() - 1, range.bottom);

        range.leftPx -= this.viewportW;
        range.rightPx += this.viewportW;

        range.leftPx = Math.max(0, range.leftPx);
        range.rightPx = Math.min(this.canvasWidth, range.rightPx);

        return range;
    }

    private ensureCellNodesInRowsCache(row) {
        var cacheEntry = this.rowsCache[row];
        if (cacheEntry) {
            if (cacheEntry.cellRenderQueue.length) {
                var $lastNode = cacheEntry.rowNode.children().last();
                while (cacheEntry.cellRenderQueue.length) {
                    var columnIdx = cacheEntry.cellRenderQueue.pop();

                    cacheEntry.cellNodesByColumnIdx[columnIdx] = $lastNode;
                    $lastNode = $lastNode.prev();

                    // Hack to retrieve the frozen columns because
                    if ($lastNode.length === 0) {
                        $lastNode = $(cacheEntry.rowNode[0]).children().last();
                    }
                }
            }
        }
    }

    private cleanUpCells(range, row) {
        // Ignore frozen rows
        if (this.hasFrozenRows
            && ((this.options.frozenBottom && row > this.actualFrozenRow) // Frozen bottom rows
                || (row <= this.actualFrozenRow)                     // Frozen top rows
            )
        ) {
            return;
        }

        var totalCellsRemoved = 0;
        var cacheEntry = this.rowsCache[row];

        // Remove cells outside the range.
        var cellsToRemove = [];
        for (var i in cacheEntry.cellNodesByColumnIdx) {
            // I really hate it when people mess with Array.prototype.
            if (!cacheEntry.cellNodesByColumnIdx.hasOwnProperty(i)) {
                continue;
            }

            // This is a string, so it needs to be cast back to a number.
            i = i as any | 0;

            // Ignore frozen columns
            if (i <= this.options.frozenColumn) {
                continue;
            }

            // Ignore alwaysRenderedColumns
            if (Array.isArray(this.columns) && this.columns[i] && this.columns[i].alwaysRenderColumn) {
                continue;
            }

            var colspan = cacheEntry.cellColSpans[i];
            if (this.columnPosLeft[i] > range.rightPx ||
                this.columnPosRight[Math.min(this.columns.length - 1, i as any + colspan - 1)] < range.leftPx) {
                if (!(row == this.activeRow && i == this.activeCell)) {
                    cellsToRemove.push(i);
                }
            }
        }

        var cellToRemove;
        while ((cellToRemove = cellsToRemove.pop()) != null) {
            cacheEntry.cellNodesByColumnIdx[cellToRemove][0].parentElement.removeChild(cacheEntry.cellNodesByColumnIdx[cellToRemove][0]);

            delete cacheEntry.cellColSpans[cellToRemove];
            delete cacheEntry.cellNodesByColumnIdx[cellToRemove];
            if (this.postProcessedRows[row]) {
                delete this.postProcessedRows[row][cellToRemove];
            }
            totalCellsRemoved++;
        }
    }

    private cleanUpAndRenderCells(range) {
        var cacheEntry;
        var stringArray = [];
        var processedRows = [];
        var cellsAdded;
        var totalCellsAdded = 0;
        var colspan;

        for (var row = range.top, btm = range.bottom; row <= btm; row++) {
            cacheEntry = this.rowsCache[row];
            if (!cacheEntry) {
                continue;
            }

            // cellRenderQueue populated in renderRows() needs to be cleared first
            this.ensureCellNodesInRowsCache(row);

            this.cleanUpCells(range, row);

            // Render missing cells.
            cellsAdded = 0;

            var metadata = this.data.getItemMetadata && this.data.getItemMetadata(row);
            metadata = metadata && metadata.columns;

            var d = this.getDataItem(row);

            // TODO:  shorten this loop (index? heuristics? binary search?)
            for (var i = 0, ii = this.columns.length; i < ii; i++) {
                // Cells to the right are outside the range.
                if (this.columnPosLeft[i] > range.rightPx) {
                    break;
                }

                // Already rendered.
                if ((colspan = cacheEntry.cellColSpans[i]) != null) {
                    i += (colspan > 1 ? colspan - 1 : 0);
                    continue;
                }

                colspan = 1;
                if (metadata) {
                    var columnData = metadata[this.columns[i].id] || metadata[i];
                    colspan = (columnData && columnData.colspan) || 1;
                    if (colspan === "*") {
                        colspan = ii - i;
                    }
                }

                if (this.columnPosRight[Math.min(ii - 1, i + colspan - 1)] > range.leftPx) {
                    this.appendCellHtml(stringArray, row, i, colspan, d);
                    cellsAdded++;
                }

                i += (colspan > 1 ? colspan - 1 : 0);
            }

            if (cellsAdded) {
                totalCellsAdded += cellsAdded;
                processedRows.push(row);
            }
        }

        if (!stringArray.length) {
            return;
        }

        var x = document.createElement("div");
        x.innerHTML = stringArray.join("");

        var processedRow;
        var node;
        while ((processedRow = processedRows.pop()) != null) {
            cacheEntry = this.rowsCache[processedRow];
            var columnIdx;
            while ((columnIdx = cacheEntry.cellRenderQueue.pop()) != null) {
                node = x.lastChild;

                if (this.hasFrozenColumns() && (columnIdx > this.options.frozenColumn)) {
                    cacheEntry.rowNode[1].appendChild(node);
                } else {
                    cacheEntry.rowNode[0].appendChild(node);
                }
                cacheEntry.cellNodesByColumnIdx[columnIdx] = $(node);
            }
        }
    }

    private renderRows(range) {
        var stringArrayL = [],
            stringArrayR = [],
            rows = [],
            needToReselectCell = false,
            dataLength = this.getDataLength();

        for (let i = range.top, ii = range.bottom; i <= ii; i++) {
            if (this.rowsCache[i] || (this.hasFrozenRows && this.options.frozenBottom && i == this.getDataLength())) {
                continue;
            }
            this.renderedRows++;
            rows.push(i);

            // Create an entry right away so that appendRowHtml() can
            // start populatating it.
            this.rowsCache[i] = {
                "rowNode": null,

                // ColSpans of rendered cells (by column idx).
                // Can also be used for checking whether a cell has been rendered.
                "cellColSpans": [],

                // Cell nodes (by column idx).  Lazy-populated by ensureCellNodesInRowsCache().
                "cellNodesByColumnIdx": [],

                // Column indices of cell nodes that have been rendered, but not yet indexed in
                // cellNodesByColumnIdx.  These are in the same order as cell nodes added at the
                // end of the row.
                "cellRenderQueue": []
            };

            this.appendRowHtml(stringArrayL, stringArrayR, i, range, dataLength);
            if (this.activeCellNode && this.activeRow === i) {
                needToReselectCell = true;
            }
            this.counter_rows_rendered++;
        }

        if (!rows.length) { return; }

        var x = document.createElement("div"),
            xRight = document.createElement("div");

        x.innerHTML = stringArrayL.join("");
        xRight.innerHTML = stringArrayR.join("");

        for (let i = 0, ii = rows.length; i < ii; i++) {
            if ((this.hasFrozenRows) && (rows[i] >= this.actualFrozenRow)) {
                if (this.hasFrozenColumns()) {
                    this.rowsCache[rows[i]].rowNode = $()
                        .add($(x.firstChild as any).appendTo(this.$canvasBottomL))
                        .add($(xRight.firstChild as any).appendTo(this.$canvasBottomR));
                } else {
                    this.rowsCache[rows[i]].rowNode = $()
                        .add($(x.firstChild as any).appendTo(this.$canvasBottomL));
                }
            } else if (this.hasFrozenColumns()) {
                this.rowsCache[rows[i]].rowNode = $()
                    .add($(x.firstChild as any).appendTo(this.$canvasTopL))
                    .add($(xRight.firstChild as any).appendTo(this.$canvasTopR));
            } else {
                this.rowsCache[rows[i]].rowNode = $()
                    .add($(x.firstChild as any).appendTo(this.$canvasTopL));
            }
        }

        if (needToReselectCell) {
            this.activeCellNode = this.getCellNode(this.activeRow, this.activeCell);
        }
    }

    private startPostProcessing() {
        if (!this.options.enableAsyncPostRender) {
            return;
        }
        clearTimeout(this.h_postrender);
        this.h_postrender = setTimeout(this.asyncPostProcessRows, this.options.asyncPostRenderDelay);
    }

    private startPostProcessingCleanup() {
        if (!this.options.enableAsyncPostRenderCleanup) {
            return;
        }
        clearTimeout(this.h_postrenderCleanup);
        this.h_postrenderCleanup = setTimeout(this.asyncPostProcessCleanupRows, this.options.asyncPostRenderCleanupDelay);
    }

    private invalidatePostProcessingResults(row) {
        // change status of columns to be re-rendered
        for (var columnIdx in this.postProcessedRows[row]) {
            if (this.postProcessedRows[row].hasOwnProperty(columnIdx)) {
                this.postProcessedRows[row][columnIdx] = 'C';
            }
        }
        this.postProcessFromRow = Math.min(this.postProcessFromRow, row);
        this.postProcessToRow = Math.max(this.postProcessToRow, row);
        this.startPostProcessing();
    }

    private updateRowPositions() {
        for (var row in this.rowsCache) {
            var rowNumber = row ? parseInt(row) : 0;
            this.rowsCache[rowNumber].rowNode[0].style.top = this.getRowTop(rowNumber) + "px";
        }
    }

    public render() {
        if (!this.initialized) { return; }

        this.scrollThrottle.dequeue();

        var visible = this.getVisibleRange();
        var rendered = this.getRenderedRange();

        // remove rows no longer in the viewport
        this.cleanupRows(rendered);

        // add new rows & missing cells in existing rows
        if (this.lastRenderedScrollLeft != this.scrollLeft) {

            if (this.hasFrozenRows) {

                var renderedFrozenRows = jQuery.extend(true, {}, rendered);

                if (this.options.frozenBottom) {

                    renderedFrozenRows.top = this.actualFrozenRow;
                    renderedFrozenRows.bottom = this.getDataLength();
                }
                else {

                    renderedFrozenRows.top = 0;
                    renderedFrozenRows.bottom = this.options.frozenRow;
                }

                this.cleanUpAndRenderCells(renderedFrozenRows);
            }

            this.cleanUpAndRenderCells(rendered);
        }

        // render missing rows
        this.renderRows(rendered);

        // Render frozen rows
        if (this.hasFrozenRows) {
            if (this.options.frozenBottom) {
                this.renderRows({
                    top: this.actualFrozenRow, bottom: this.getDataLength() - 1, leftPx: rendered.leftPx, rightPx: rendered.rightPx
                });
            }
            else {
                this.renderRows({
                    top: 0, bottom: this.options.frozenRow - 1, leftPx: rendered.leftPx, rightPx: rendered.rightPx
                });
            }
        }

        this.postProcessFromRow = visible.top;
        this.postProcessToRow = Math.min(this.getDataLengthIncludingAddNew() - 1, visible.bottom);
        this.startPostProcessing();

        this.lastRenderedScrollTop = this.scrollTop;
        this.lastRenderedScrollLeft = this.scrollLeft;
        this.h_render = null;
        this.trigger(this.onRendered, { startRow: visible.top, endRow: visible.bottom, grid: self });
    }

    private handleHeaderScroll() {
        this.handleElementScroll(this.$headerScrollContainer[0]);
    }

    private handleHeaderRowScroll() {
        var scrollLeft = this.$headerRowScrollContainer[0].scrollLeft;
        if (scrollLeft != this.$viewportScrollContainerX[0].scrollLeft) {
            this.$viewportScrollContainerX[0].scrollLeft = scrollLeft;
        }
    }

    private handleFooterRowScroll() {
        var scrollLeft = this.$footerRowScrollContainer[0].scrollLeft;
        if (scrollLeft != this.$viewportScrollContainerX[0].scrollLeft) {
            this.$viewportScrollContainerX[0].scrollLeft = scrollLeft;
        }
    }

    private handlePreHeaderPanelScroll() {
        this.handleElementScroll(this.$preHeaderPanelScroller[0]);
    }

    private handleElementScroll(element) {
        var scrollLeft = element.scrollLeft;
        if (scrollLeft != this.$viewportScrollContainerX[0].scrollLeft) {
            this.$viewportScrollContainerX[0].scrollLeft = scrollLeft;
        }
    }

    private handleScroll() {
        this.scrollTop = this.$viewportScrollContainerY[0].scrollTop;
        this.scrollLeft = this.$viewportScrollContainerX[0].scrollLeft;
        return this._handleScroll(false);
    }

    private _handleScroll(isMouseWheel) {
        var maxScrollDistanceY = this.$viewportScrollContainerY[0].scrollHeight - this.$viewportScrollContainerY[0].clientHeight;
        var maxScrollDistanceX = this.$viewportScrollContainerY[0].scrollWidth - this.$viewportScrollContainerY[0].clientWidth;

        // Protect against erroneous clientHeight/Width greater than scrollHeight/Width.
        // Sometimes seen in Chrome.
        maxScrollDistanceY = Math.max(0, maxScrollDistanceY);
        maxScrollDistanceX = Math.max(0, maxScrollDistanceX);

        // Ceiling the max scroll values
        if (this.scrollTop > maxScrollDistanceY) {
            this.scrollTop = maxScrollDistanceY;
        }
        if (this.scrollLeft > maxScrollDistanceX) {
            this.scrollLeft = maxScrollDistanceX;
        }

        var vScrollDist = Math.abs(this.scrollTop - this.prevScrollTop);
        var hScrollDist = Math.abs(this.scrollLeft - this.prevScrollLeft);

        if (hScrollDist) {
            this.prevScrollLeft = this.scrollLeft;

            this.$viewportScrollContainerX[0].scrollLeft = this.scrollLeft;
            this.$headerScrollContainer[0].scrollLeft = this.scrollLeft;
            this.$topPanelScroller[0].scrollLeft = this.scrollLeft;
            this.$headerRowScrollContainer[0].scrollLeft = this.scrollLeft;
            if (this.options.createFooterRow) {
                this.$footerRowScrollContainer[0].scrollLeft = this.scrollLeft;
            }
            if (this.options.createPreHeaderPanel) {
                if (this.hasFrozenColumns()) {
                    this.$preHeaderPanelScrollerR[0].scrollLeft = this.scrollLeft;
                } else {
                    this.$preHeaderPanelScroller[0].scrollLeft = this.scrollLeft;
                }
            }

            if (this.hasFrozenColumns()) {
                if (this.hasFrozenRows) {
                    this.$viewportTopR[0].scrollLeft = this.scrollLeft;
                }
            } else {
                if (this.hasFrozenRows) {
                    this.$viewportTopL[0].scrollLeft = this.scrollLeft;
                }
            }
        }

        if (vScrollDist) {
            this.vScrollDir = this.prevScrollTop < this.scrollTop ? 1 : -1;
            this.prevScrollTop = this.scrollTop;

            if (isMouseWheel) {
                this.$viewportScrollContainerY[0].scrollTop = this.scrollTop;
            }

            if (this.hasFrozenColumns()) {
                if (this.hasFrozenRows && !this.options.frozenBottom) {
                    this.$viewportBottomL[0].scrollTop = this.scrollTop;
                } else {
                    this.$viewportTopL[0].scrollTop = this.scrollTop;
                }
            }

            // switch virtual pages if needed
            if (vScrollDist < this.viewportH) {
                this.scrollTo(this.scrollTop + this.offset);
            } else {
                var oldOffset = this.offset;
                if (this.h == this.viewportH) {
                    this.page = 0;
                } else {
                    this.page = Math.min(this.n - 1, Math.floor(this.scrollTop * ((this.th - this.viewportH) / (this.h - this.viewportH)) * (1 / this.ph)));
                }
                this.offset = Math.round(this.page * this.cj);
                if (oldOffset != this.offset) {
                    this.invalidateAllRows();
                }
            }
        }

        if (hScrollDist || vScrollDist) {
            var dx = Math.abs(this.lastRenderedScrollLeft - this.scrollLeft);
            var dy = Math.abs(this.lastRenderedScrollTop - this.scrollTop);
            if (dx > 20 || dy > 20) {
                // if rendering is forced or scrolling is small enough to be "easy", just render
                if (this.options.forceSyncScrolling || (dy < this.viewportH && dx < this.viewportW)) {
                    this.render();
                } else {
                    // otherwise, perform "difficult" renders at a capped frequency
                    this.scrollThrottle.enqueue();
                }

                this.trigger(this.onViewportChanged, {});
            }
        }

        this.trigger(this.onScroll, { scrollLeft: this.scrollLeft, scrollTop: this.scrollTop });

        if (hScrollDist || vScrollDist) return true;
        return false;
    }

    /*
    limits the frequency at which the provided action is executed.
    call enqueue to execute the action - it will execute either immediately or, if it was executed less than minPeriod_ms in the past, as soon as minPeriod_ms has expired.
    call dequeue to cancel any pending action.
    */
    private ActionThrottle(action, minPeriod_ms) {

        var blocked = false;
        var queued = false;

        function enqueue() {
            if (!blocked) {
                blockAndExecute();
            } else {
                queued = true;
            }
        }

        function dequeue() {
            queued = false;
        }

        function blockAndExecute() {
            blocked = true;
            setTimeout(unblock, minPeriod_ms);
            action();
        }

        function unblock() {
            if (queued) {
                dequeue();
                blockAndExecute();
            } else {
                blocked = false;
            }
        }

        return {
            enqueue: enqueue,
            dequeue: dequeue
        };
    }

    private asyncPostProcessRows() {
        var dataLength = this.getDataLength();
        while (this.postProcessFromRow <= this.postProcessToRow) {
            var row = (this.vScrollDir >= 0) ? this.postProcessFromRow++ : this.postProcessToRow--;
            var cacheEntry = this.rowsCache[row];
            if (!cacheEntry || row >= dataLength) {
                continue;
            }

            if (!this.postProcessedRows[row]) {
                this.postProcessedRows[row] = {};
            }

            this.ensureCellNodesInRowsCache(row);
            for (var columnIdx in cacheEntry.cellNodesByColumnIdx) {
                if (!cacheEntry.cellNodesByColumnIdx.hasOwnProperty(columnIdx)) {
                    continue;
                }

                columnIdx = columnIdx as any | 0;

                var m = this.columns[columnIdx];
                var processedStatus = this.postProcessedRows[row][columnIdx]; // C=cleanup and re-render, R=rendered
                if (m.asyncPostRender && processedStatus !== 'R') {
                    var node = cacheEntry.cellNodesByColumnIdx[columnIdx];
                    if (node) {
                        m.asyncPostRender(node, row, this.getDataItem(row), m, (processedStatus === 'C'));
                    }
                    this.postProcessedRows[row][columnIdx] = 'R';
                }
            }

            this.h_postrender = setTimeout(this.asyncPostProcessRows, this.options.asyncPostRenderDelay);
            return;
        }
    }

    private asyncPostProcessCleanupRows() {
        if (this.postProcessedCleanupQueue.length > 0) {
            var groupId = this.postProcessedCleanupQueue[0].groupId;

            // loop through all queue members with this groupID
            while (this.postProcessedCleanupQueue.length > 0 && this.postProcessedCleanupQueue[0].groupId == groupId) {
                var entry = this.postProcessedCleanupQueue.shift();
                if (entry.actionType == 'R') {
                    $(entry.node).remove();
                }
                if (entry.actionType == 'C') {
                    var column = this.columns[entry.columnIdx];
                    if (column.asyncPostRenderCleanup && entry.node) {
                        // cleanup must also remove element
                        column.asyncPostRenderCleanup(entry.node, entry.rowIdx, column);
                    }
                }
            }

            // call this function again after the specified delay
            this.h_postrenderCleanup = setTimeout(this.asyncPostProcessCleanupRows, this.options.asyncPostRenderCleanupDelay);
        }
    }

    private updateCellCssStylesOnRenderedRows(addedHash, removedHash) {
        var node, columnId, addedRowHash, removedRowHash;
        for (var row in this.rowsCache) {
            removedRowHash = removedHash && removedHash[row];
            addedRowHash = addedHash && addedHash[row];

            if (removedRowHash) {
                for (columnId in removedRowHash) {
                    if (!addedRowHash || removedRowHash[columnId] != addedRowHash[columnId]) {
                        node = this.getCellNode(row, this.getColumnIndex(columnId));
                        if (node) {
                            $(node).removeClass(removedRowHash[columnId]);
                        }
                    }
                }
            }

            if (addedRowHash) {
                for (columnId in addedRowHash) {
                    if (!removedRowHash || removedRowHash[columnId] != addedRowHash[columnId]) {
                        node = this.getCellNode(row, this.getColumnIndex(columnId));
                        if (node) {
                            $(node).addClass(addedRowHash[columnId]);
                        }
                    }
                }
            }
        }
    }

    public addCellCssStyles(key, hash) {
        if (this.cellCssClasses[key]) {
            throw new Error("addCellCssStyles: cell CSS hash with key '" + key + "' already exists.");
        }

        this.cellCssClasses[key] = hash;
        this.updateCellCssStylesOnRenderedRows(hash, null);

        this.trigger(this.onCellCssStylesChanged, { "key": key, "hash": hash, "grid": self });
    }

    public removeCellCssStyles(key) {
        if (!this.cellCssClasses[key]) {
            return;
        }

        this.updateCellCssStylesOnRenderedRows(null, this.cellCssClasses[key]);
        delete this.cellCssClasses[key];

        this.trigger(this.onCellCssStylesChanged, { "key": key, "hash": null, "grid": self });
    }

    public setCellCssStyles(key, hash) {
        var prevHash = this.cellCssClasses[key];

        this.cellCssClasses[key] = hash;
        this.updateCellCssStylesOnRenderedRows(hash, prevHash);

        this.trigger(this.onCellCssStylesChanged, { "key": key, "hash": hash, "grid": self });
    }

    public getCellCssStyles(key) {
        return this.cellCssClasses[key];
    }

    public flashCell(row, cell, speed) {
        speed = speed || 100;

        const toggleCellClass = ($cell, times) => {
            if (!times) {
                return;
            }

            setTimeout(() => {
                $cell.queue(() => {
                    $cell.toggleClass(this.options.cellFlashingCssClass).dequeue();
                    toggleCellClass($cell, times - 1);
                });
            }, speed);
        }

        if (this.rowsCache[row]) {
            var $cell = $(this.getCellNode(row, cell));

            toggleCellClass($cell, 4);
        }
    }

    //////////////////////////////////////////////////////////////////////////////////////////////
    // Interactivity

    private handleMouseWheel(e, delta, deltaX, deltaY) {
        var $rowNode = $(e.target).closest(".slick-row");
        var rowNode = $rowNode[0];
        if (rowNode != this.rowNodeFromLastMouseWheelEvent) {

            var $gridCanvas = $rowNode.parents('.grid-canvas');
            var left = $gridCanvas.hasClass('grid-canvas-left');

            if (this.zombieRowNodeFromLastMouseWheelEvent && this.zombieRowNodeFromLastMouseWheelEvent[left ? 0 : 1] != rowNode) {
                var zombieRow = this.zombieRowNodeFromLastMouseWheelEvent[left || this.zombieRowNodeFromLastMouseWheelEvent.length == 1 ? 0 : 1];
                zombieRow.parentElement.removeChild(zombieRow);

                this.zombieRowNodeFromLastMouseWheelEvent = null;
            }

            this.rowNodeFromLastMouseWheelEvent = rowNode;
        }

        this.scrollTop = Math.max(0, this.$viewportScrollContainerY[0].scrollTop - (deltaY * this.options.rowHeight));
        this.scrollLeft = this.$viewportScrollContainerX[0].scrollLeft + (deltaX * 10);
        var handled = this._handleScroll(true);
        if (handled) e.preventDefault();
    }

    private handleDragInit(e, dd) {
        var cell = this.getCellFromEvent(e);
        if (!cell || !this.cellExists(cell.row, cell.cell)) {
            return false;
        }

        var retval = this.trigger(this.onDragInit, dd, e);
        if (e.isImmediatePropagationStopped()) {
            return retval;
        }

        // if nobody claims to be handling drag'n'drop by stopping immediate propagation,
        // cancel out of it
        return false;
    }

    private handleDragStart(e, dd) {
        var cell = this.getCellFromEvent(e);
        if (!cell || !this.cellExists(cell.row, cell.cell)) {
            return false;
        }

        var retval = this.trigger(this.onDragStart, dd, e);
        if (e.isImmediatePropagationStopped()) {
            return retval;
        }

        return false;
    }

    private handleDrag(e, dd) {
        return this.trigger(this.onDrag, dd, e);
    }

    private handleDragEnd(e, dd) {
        this.trigger(this.onDragEnd, dd, e);
    }

    private handleKeyDown(e) {
        this.trigger(this.onKeyDown, { row: this.activeRow, cell: this.activeCell }, e);
        var handled = e.isImmediatePropagationStopped();
        var keyCode = keyCode;

        if (!handled) {
            if (!e.shiftKey && !e.altKey) {
                if (this.options.editable && this.currentEditor && this.currentEditor.keyCaptureList) {
                    if (this.currentEditor.keyCaptureList.indexOf(e.which) > -1) {
                        return;
                    }
                }
                if (e.which == keyCode.HOME) {
                    handled = (e.ctrlKey) ? this.navigateTop() : this.navigateRowStart();
                } else if (e.which == keyCode.END) {
                    handled = (e.ctrlKey) ? this.navigateBottom() : this.navigateRowEnd();
                }
            }
        }
        if (!handled) {
            if (!e.shiftKey && !e.altKey && !e.ctrlKey) {
                // editor may specify an array of keys to bubble
                if (this.options.editable && this.currentEditor && this.currentEditor.keyCaptureList) {
                    if (this.currentEditor.keyCaptureList.indexOf(e.which) > -1) {
                        return;
                    }
                }
                if (e.which == keyCode.ESCAPE) {
                    if (!this.getEditorLock().isActive()) {
                        return; // no editing mode to cancel, allow bubbling and default processing (exit without cancelling the event)
                    }
                    this.cancelEditAndSetFocus();
                } else if (e.which == keyCode.PAGE_DOWN) {
                    this.navigatePageDown();
                    handled = true;
                } else if (e.which == keyCode.PAGE_UP) {
                    this.navigatePageUp();
                    handled = true;
                } else if (e.which == keyCode.LEFT) {
                    handled = this.navigateLeft();
                } else if (e.which == keyCode.RIGHT) {
                    handled = this.navigateRight();
                } else if (e.which == keyCode.UP) {
                    handled = this.navigateUp();
                } else if (e.which == keyCode.DOWN) {
                    handled = this.navigateDown();
                } else if (e.which == keyCode.TAB) {
                    handled = this.navigateNext();
                } else if (e.which == keyCode.ENTER) {
                    if (this.options.editable) {
                        if (this.currentEditor) {
                            // adding new row
                            if (this.activeRow === this.getDataLength()) {
                                this.navigateDown();
                            } else {
                                this.commitEditAndSetFocus();
                            }
                        } else {
                            if (this.getEditorLock().commitCurrentEdit()) {
                                this.makeActiveCellEditable(undefined, undefined, e);
                            }
                        }
                    }
                    handled = true;
                }
            } else if (e.which == keyCode.TAB && e.shiftKey && !e.ctrlKey && !e.altKey) {
                handled = this.navigatePrev();
            }
        }

        if (handled) {
            // the event has been handled so don't let parent element (bubbling/propagation) or browser (default) handle it
            e.stopPropagation();
            e.preventDefault();
            try {
                e.originalEvent.keyCode = 0; // prevent default behaviour for special keys in IE browsers (F3, F5, etc.)
            }
            // ignore exceptions - setting the original event's keycode throws access denied exception for "Ctrl"
            // (hitting control key only, nothing else), "Shift" (maybe others)
            catch (error) {
            }
        }
    }

    private handleClick(e) {
        if (!this.currentEditor) {
            // if this click resulted in some cell child node getting focus,
            // don't steal it back - keyboard events will still bubble up
            // IE9+ seems to default DIVs to tabIndex=0 instead of -1, so check for cell clicks directly.
            if (e.target != document.activeElement || $(e.target).hasClass("slick-cell")) {
                this.setFocus();
            }
        }

        var cell = this.getCellFromEvent(e);
        if (!cell || (this.currentEditor !== null && this.activeRow == cell.row && this.activeCell == cell.cell)) {
            return;
        }

        this.trigger(this.onClick, { row: cell.row, cell: cell.cell }, e);
        if (e.isImmediatePropagationStopped()) {
            return;
        }

        // this optimisation causes trouble - MLeibman #329
        //if ((activeCell != cell.cell || activeRow != cell.row) && canCellBeActive(cell.row, cell.cell)) {
        if (this.canCellBeActive(cell.row, cell.cell)) {
            if (!this.getEditorLock().isActive() || this.getEditorLock().commitCurrentEdit()) {
                this.scrollRowIntoView(cell.row, false);

                var preClickModeOn = (e.target && e.target.className === preClickClassName);
                var column = this.columns[cell.cell];
                var suppressActiveCellChangedEvent = !!(this.options.editable && column && column.editor && this.options.suppressActiveCellChangeOnEdit);
                this.setActiveCellInternal(this.getCellNode(cell.row, cell.cell), null, preClickModeOn, suppressActiveCellChangedEvent, e);
            }
        }
    }

    private handleContextMenu(e) {
        var $cell = $(e.target).closest(".slick-cell", this.$canvas);
        if ($cell.length === 0) {
            return;
        }

        // are we editing this cell?
        if (this.activeCellNode === $cell[0] && this.currentEditor !== null) {
            return;
        }

        this.trigger(this.onContextMenu, {}, e);
    }

    private handleDblClick(e) {
        var cell = this.getCellFromEvent(e);
        if (!cell || (this.currentEditor !== null && this.activeRow == cell.row && this.activeCell == cell.cell)) {
            return;
        }

        this.trigger(this.onDblClick, { row: cell.row, cell: cell.cell }, e);
        if (e.isImmediatePropagationStopped()) {
            return;
        }

        if (this.options.editable) {
            this.gotoCell(cell.row, cell.cell, true, e);
        }
    }

    private handleHeaderMouseEnter(e) {
        this.trigger(this.onHeaderMouseEnter, {
            "column": $(e.target).data("column"),
            "grid": self
        }, e);
    }

    private handleHeaderMouseLeave(e) {
        this.trigger(this.onHeaderMouseLeave, {
            "column": $(e.target).data("column"),
            "grid": self
        }, e);
    }

    private handleHeaderContextMenu(e) {
        var $header = $(e.target).closest(".slick-header-column", $(".slick-header-columns")[0]);
        var column = $header && $header.data("column");
        this.trigger(this.onHeaderContextMenu, { column: column }, e);
    }

    private handleHeaderClick(e) {
        if (this.columnResizeDragging) return;
        var $header = $(e.target).closest(".slick-header-column", $(".slick-header-columns")[0]);
        var column = $header && $header.data("column");
        if (column) {
            this.trigger(this.onHeaderClick, { column: column }, e);
        }
    }

    private handleFooterContextMenu(e) {
        var $footer = $(e.target).closest(".slick-footerrow-column", $(".slick-footerrow-columns")[0]);
        var column = $footer && $footer.data("column");
        this.trigger(this.onFooterContextMenu, { column: column }, e);
    }

    private handleFooterClick(e) {
        var $footer = $(e.target).closest(".slick-footerrow-column", $(".slick-footerrow-columns")[0]);
        var column = $footer && $footer.data("column");
        this.trigger(this.onFooterClick, { column: column }, e);
    }

    private handleMouseEnter(e) {
        this.trigger(this.onMouseEnter, {}, e);
    }

    private handleMouseLeave(e) {
        this.trigger(this.onMouseLeave, {}, e);
    }

    private cellExists(row, cell) {
        return !(row < 0 || row >= this.getDataLength() || cell < 0 || cell >= this.columns.length);
    }

    public getCellFromPoint(x, y) {
        var row = this.getRowFromPosition(y);
        var cell = 0;

        var w = 0;
        for (var i = 0; i < this.columns.length && w < x; i++) {
            w += this.columns[i].width;
            cell++;
        }

        if (cell < 0) {
            cell = 0;
        }

        return { row: row, cell: cell - 1 };
    }

    private getCellFromNode(cellNode) {
        // read column number from .l<columnNumber> CSS class
        var cls = /l\d+/.exec(cellNode.className);
        if (!cls) {
            throw new Error("getCellFromNode: cannot get cell - " + cellNode.className);
        }
        return parseInt(cls[0].substr(1, cls[0].length - 1), 10);
    }

    private getRowFromNode(rowNode) {
        for (var row in this.rowsCache) {
            for (var i in this.rowsCache[row].rowNode) {
                if (this.rowsCache[row].rowNode[i] === rowNode)
                    return (row ? parseInt(row) : 0);
            }
        }
        return null;
    }

    public getFrozenRowOffset(row) {
        var offset =
            (this.hasFrozenRows)
                ? (this.options.frozenBottom)
                    ? (row >= this.actualFrozenRow)
                        ? (this.h < this.viewportTopH)
                            ? (this.actualFrozenRow * this.options.rowHeight)
                            : this.h
                        : 0
                    : (row >= this.actualFrozenRow)
                        ? this.frozenRowsHeight
                        : 0
                : 0;

        return offset;
    }

    public getCellFromEvent(e) {
        var row, cell;
        var $cell = $(e.target).closest(".slick-cell", this.$canvas);
        if (!$cell.length) {
            return null;
        }

        row = this.getRowFromNode($cell[0].parentNode);

        if (this.hasFrozenRows) {

            var c = $cell.parents('.grid-canvas').offset();

            var rowOffset = 0;
            var isBottom = $cell.parents('.grid-canvas-bottom').length;

            if (isBottom) {
                rowOffset = (this.options.frozenBottom) ? this.$canvasTopL.height() : this.frozenRowsHeight;
            }

            row = this.getCellFromPoint(e.clientX - c.left, e.clientY - c.top + rowOffset + $(document).scrollTop()).row;
        }

        cell = this.getCellFromNode($cell[0]);

        if (row == null || cell == null) {
            return null;
        } else {
            return {
                "row": row,
                "cell": cell
            };
        }
    }

    public getCellNodeBox(row, cell) {
        if (!this.cellExists(row, cell)) {
            return null;
        }

        var frozenRowOffset = this.getFrozenRowOffset(row);

        var y1 = this.getRowTop(row) - frozenRowOffset;
        var y2 = y1 + this.options.rowHeight - 1;
        var x1 = 0;
        for (var i = 0; i < cell; i++) {
            x1 += this.columns[i].width;

            if (this.options.frozenColumn == i) {
                x1 = 0;
            }
        }
        var x2 = x1 + this.columns[cell].width;

        return {
            top: y1,
            left: x1,
            bottom: y2,
            right: x2
        };
    }

    //////////////////////////////////////////////////////////////////////////////////////////////
    // Cell switching

    public resetActiveCell() {
        this.setActiveCellInternal(null, false);
    }

    public focus() {
        this.setFocus()
    }

    private setFocus() {
        if (this.tabbingDirection == -1) {
            this.$focusSink[0].focus();
        } else {
            this.$focusSink2[0].focus();
        }
    }

    public scrollCellIntoView(row, cell, doPaging) {
        this.scrollRowIntoView(row, doPaging);

        if (cell <= this.options.frozenColumn) {
            return;
        }

        var colspan = this.getColspan(row, cell);
        this.internalScrollColumnIntoView(this.columnPosLeft[cell], this.columnPosRight[cell + (colspan > 1 ? colspan - 1 : 0)]);
    }

    private internalScrollColumnIntoView(left, right) {
        var scrollRight = this.scrollLeft + this.$viewportScrollContainerX.width();

        if (left < this.scrollLeft) {
            this.$viewportScrollContainerX.scrollLeft(left);
            this.handleScroll();
            this.render();
        } else if (right > scrollRight) {
            this.$viewportScrollContainerX.scrollLeft(Math.min(left, right - this.$viewportScrollContainerX[0].clientWidth));
            this.handleScroll();
            this.render();
        }
    }

    public scrollColumnIntoView(cell) {
        this.internalScrollColumnIntoView(this.columnPosLeft[cell], this.columnPosRight[cell]);
    }

    private setActiveCellInternal(newCell, opt_editMode?, preClickModeOn?, suppressActiveCellChangedEvent?, e?) {
        if (this.activeCellNode !== null) {
            this.makeActiveCellNormal();
            $(this.activeCellNode).removeClass("active");
            if (this.rowsCache[this.activeRow]) {
                $(this.rowsCache[this.activeRow].rowNode).removeClass("active");
            }
        }

        var activeCellChanged = (this.activeCellNode !== newCell);
        this.activeCellNode = newCell;

        if (this.activeCellNode != null) {
            var $activeCellNode = $(this.activeCellNode);
            var $activeCellOffset = $activeCellNode.offset();

            var rowOffset = Math.floor($activeCellNode.parents('.grid-canvas').offset().top);
            var isBottom = $activeCellNode.parents('.grid-canvas-bottom').length;

            if (this.hasFrozenRows && isBottom) {
                rowOffset -= (this.options.frozenBottom)
                    ? this.$canvasTopL.height()
                    : this.frozenRowsHeight;
            }

            var cell = this.getCellFromPoint($activeCellOffset.left, Math.ceil($activeCellOffset.top) - rowOffset);

            this.activeRow = cell.row;
            this.activeCell = this.activePosX = this.activeCell = this.activePosX = this.getCellFromNode(this.activeCellNode);

            if (opt_editMode == null) {
                opt_editMode = (this.activeRow == this.getDataLength()) || this.options.autoEdit;
            }

            if (this.options.showCellSelection) {
                $activeCellNode.addClass("active");
                if (this.rowsCache[this.activeRow]) {
                    $(this.rowsCache[this.activeRow].rowNode).addClass("active");
                }
            }

            if (this.options.editable && opt_editMode && this.isCellPotentiallyEditable(this.activeRow, this.activeCell)) {
                clearTimeout(this.h_editorLoader);

                if (this.options.asyncEditorLoading) {
                    this.h_editorLoader = setTimeout(() => {
                        this.makeActiveCellEditable(undefined, preClickModeOn, e);
                    }, this.options.asyncEditorLoadDelay);
                } else {
                    this.makeActiveCellEditable(undefined, preClickModeOn, e);
                }
            }
        } else {
            this.activeRow = this.activeCell = null;
        }

        // this optimisation causes trouble - MLeibman #329
        //if (activeCellChanged) {
        if (!suppressActiveCellChangedEvent) { this.trigger(this.onActiveCellChanged, this.getActiveCell()); }
        //}
    }

    private clearTextSelection() {
        if ('selection' in document && (document as any).selection.empty) {
            try {
                //IE fails here if selected element is not in dom
                (document as any).selection.empty();
            } catch (e) { }
        } else if (window.getSelection) {
            var sel = window.getSelection();
            if (sel && sel.removeAllRanges) {
                sel.removeAllRanges();
            }
        }
    }

    private isCellPotentiallyEditable(row, cell) {
        var dataLength = this.getDataLength();
        // is the data for this row loaded?
        if (row < dataLength && !this.getDataItem(row)) {
            return false;
        }

        // are we in the Add New row?  can we create new from this cell?
        if (this.columns[cell].cannotTriggerInsert && row >= dataLength) {
            return false;
        }

        // does this cell have an editor?
        if (!this.getEditor(row, cell)) {
            return false;
        }

        return true;
    }

    private makeActiveCellNormal() {
        if (!this.currentEditor) {
            return;
        }
        this.trigger(this.onBeforeCellEditorDestroy, { editor: this.currentEditor });
        this.currentEditor.destroy();
        this.currentEditor = null;

        if (this.activeCellNode) {
            var d = this.getDataItem(this.activeRow);
            $(this.activeCellNode).removeClass("editable invalid");
            if (d) {
                var column = this.columns[this.activeCell];
                var formatter = this.getFormatter(this.activeRow, column);
                var formatterResult = formatter(this.activeRow, this.activeCell, this.getDataItemValueForColumn(d, column), column, d, self);
                this.applyFormatResultToCellNode(formatterResult, this.activeCellNode);
                this.invalidatePostProcessingResults(this.activeRow);
            }
        }

        // if there previously was text selected on a page (such as selected text in the edit cell just removed),
        // IE can't set focus to anything else correctly
        if (navigator.userAgent.toLowerCase().match(/msie/)) {
            this.clearTextSelection();
        }

        this.getEditorLock().deactivate(this.editController);
    }

    public editActiveCell(editor, preClickModeOn, e) {
        this.makeActiveCellEditable(editor, preClickModeOn, e);
    }

    private makeActiveCellEditable(editor, preClickModeOn, e) {
        if (!this.activeCellNode) {
            return;
        }
        if (!this.options.editable) {
            throw new Error("Grid : makeActiveCellEditable : should never get called when this.options.editable is false");
        }

        // cancel pending async call if there is one
        clearTimeout(this.h_editorLoader);

        if (!this.isCellPotentiallyEditable(this.activeRow, this.activeCell)) {
            return;
        }

        var columnDef = this.columns[this.activeCell];
        var item = this.getDataItem(this.activeRow);

        if (this.trigger(this.onBeforeEditCell, { row: this.activeRow, cell: this.activeCell, item: item, column: columnDef }) === false) {
            this.setFocus();
            return;
        }

        this.getEditorLock().activate(this.editController);
        $(this.activeCellNode).addClass("editable");

        var useEditor = editor || this.getEditor(this.activeRow, this.activeCell);

        // don't clear the cell if a custom editor is passed through
        if (!editor && !useEditor.suppressClearOnEdit) {
            this.activeCellNode.innerHTML = "";
        }

        var metadata = this.data.getItemMetadata && this.data.getItemMetadata(this.activeRow);
        metadata = metadata && metadata.columns;
        var columnMetaData = metadata && (metadata[columnDef.id] || metadata[this.activeCell]);

        var editorArgs = {
            grid: self,
            gridPosition: this.absBox(this.$container[0]),
            position: this.absBox(this.activeCellNode),
            container: this.activeCellNode,
            column: columnDef,
            columnMetaData: columnMetaData,
            item: item || {},
            event: e,
            commitChanges: this.commitEditAndSetFocus,
            cancelChanges: this.cancelEditAndSetFocus
        };

        // editor can be a function or a factory (like CompositeEditor)
        this.currentEditor = 'editor' in useEditor && typeof useEditor.editor === 'function'
            ? useEditor.editor(editorArgs)
            : new useEditor();

        if (item) {
            this.currentEditor.loadValue(item);
            if (preClickModeOn && this.currentEditor.preClick) {
                this.currentEditor.preClick();
            }
        }

        this.serializedEditorValue = this.currentEditor.serializeValue();

        if (this.currentEditor.position) {
            this.handleActiveCellPositionChange();
        }
    }

    private commitEditAndSetFocus() {
        // if the commit fails, it would do so due to a validation error
        // if so, do not steal the focus from the editor
        if (this.getEditorLock().commitCurrentEdit()) {
            this.setFocus();
            if (this.options.autoEdit) {
                this.navigateDown();
            }
        }
    }

    private cancelEditAndSetFocus() {
        if (this.getEditorLock().cancelCurrentEdit()) {
            this.setFocus();
        }
    }

    private absBox(elem) {
        var box = {
            top: elem.offsetTop,
            left: elem.offsetLeft,
            bottom: 0,
            right: 0,
            width: $(elem).outerWidth(),
            height: $(elem).outerHeight(),
            visible: true
        };
        box.bottom = box.top + box.height;
        box.right = box.left + box.width;

        // walk up the tree
        var offsetParent = elem.offsetParent;
        while ((elem = elem.parentNode) != document.body) {
            if (elem == null) break;

            if (box.visible && elem.scrollHeight != elem.offsetHeight && $(elem).css("overflowY") != "visible") {
                box.visible = box.bottom > elem.scrollTop && box.top < elem.scrollTop + elem.clientHeight;
            }

            if (box.visible && elem.scrollWidth != elem.offsetWidth && $(elem).css("overflowX") != "visible") {
                box.visible = box.right > elem.scrollLeft && box.left < elem.scrollLeft + elem.clientWidth;
            }

            box.left -= elem.scrollLeft;
            box.top -= elem.scrollTop;

            if (elem === offsetParent) {
                box.left += elem.offsetLeft;
                box.top += elem.offsetTop;
                offsetParent = elem.offsetParent;
            }

            box.bottom = box.top + box.height;
            box.right = box.left + box.width;
        }

        return box;
    }

    public getActiveCellPosition() {
        return this.absBox(this.activeCellNode);
    }

    public getGridPosition() {
        return this.absBox(this.$container[0]);
    }

    private handleActiveCellPositionChange() {
        if (!this.activeCellNode) {
            return;
        }

        this.trigger(this.onActiveCellPositionChanged, {});

        if (this.currentEditor) {
            var cellBox = this.getActiveCellPosition();
            if (this.currentEditor.show && this.currentEditor.hide) {
                if (!cellBox.visible) {
                    this.currentEditor.hide();
                } else {
                    this.currentEditor.show();
                }
            }

            if (this.currentEditor.position) {
                this.currentEditor.position(cellBox);
            }
        }
    }

    public getCellEditor() {
        return this.currentEditor;
    }

    public getActiveCell() {
        if (!this.activeCellNode) {
            return null;
        } else {
            return { row: this.activeRow, cell: this.activeCell };
        }
    }

    public getActiveCellNode() {
        return this.activeCellNode;
    }

    public scrollRowIntoView(row, doPaging) {
        if (!this.hasFrozenRows ||
            (!this.options.frozenBottom && row > this.actualFrozenRow - 1) ||
            (this.options.frozenBottom && row < this.actualFrozenRow - 1)) {

            var viewportScrollH = this.$viewportScrollContainerY.height();

            // if frozen row on top
            // subtract number of frozen row
            var rowNumber = (this.hasFrozenRows && !this.options.frozenBottom ? row - this.options.frozenRow : row);

            var rowAtTop = rowNumber * this.options.rowHeight;
            var rowAtBottom = (rowNumber + 1) * this.options.rowHeight
                - viewportScrollH
                + (this.viewportHasHScroll ? scrollbarDimensions.height : 0);

            // need to page down?
            if ((rowNumber + 1) * this.options.rowHeight > this.scrollTop + viewportScrollH + this.offset) {
                scrollTo(doPaging ? rowAtTop : rowAtBottom);
                this.render();
            }
            // or page up?
            else if (rowNumber * this.options.rowHeight < this.scrollTop + this.offset) {
                scrollTo(doPaging ? rowAtBottom : rowAtTop);
                this.render();
            }
        }
    }

    public scrollRowToTop(row) {
        this.scrollTo(row * this.options.rowHeight);
        this.render();
    }

    private scrollPage(dir) {
        var deltaRows = dir * this.numVisibleRows;
        /// First fully visible row crosses the line with
        /// y == bottomOfTopmostFullyVisibleRow
        var bottomOfTopmostFullyVisibleRow = this.scrollTop + this.options.rowHeight - 1;
        this.scrollTo((this.getRowFromPosition(bottomOfTopmostFullyVisibleRow) + deltaRows) * this.options.rowHeight);
        this.render();

        if (this.options.enableCellNavigation && this.activeRow != null) {
            var row = this.activeRow + deltaRows;
            var dataLengthIncludingAddNew = this.getDataLengthIncludingAddNew();
            if (row >= dataLengthIncludingAddNew) {
                row = dataLengthIncludingAddNew - 1;
            }
            if (row < 0) {
                row = 0;
            }

            var cell = 0, prevCell = null;
            var prevActivePosX = this.activePosX;
            while (cell <= this.activePosX) {
                if (this.canCellBeActive(row, cell)) {
                    prevCell = cell;
                }
                cell += this.getColspan(row, cell);
            }

            if (prevCell !== null) {
                this.setActiveCellInternal(this.getCellNode(row, prevCell));
                this.activePosX = prevActivePosX;
            } else {
                this.resetActiveCell();
            }
        }
    }

    public navigatePageDown() {
        this.scrollPage(1);
    }

    public navigatePageUp() {
        this.scrollPage(-1);
    }

    public navigateTop() {
        this.navigateToRow(0);
    }

    public navigateBottom() {
        this.navigateToRow(this.getDataLength() - 1);
    }

    private navigateToRow(row) {
        var num_rows = this.getDataLength();
        if (!num_rows) return true;

        if (row < 0) row = 0;
        else if (row >= num_rows) row = num_rows - 1;

        this.scrollCellIntoView(row, 0, true);
        if (this.options.enableCellNavigation && this.activeRow != null) {
            var cell = 0, prevCell = null;
            var prevActivePosX = this.activePosX;
            while (cell <= this.activePosX) {
                if (this.canCellBeActive(row, cell)) {
                    prevCell = cell;
                }
                cell += this.getColspan(row, cell);
            }

            if (prevCell !== null) {
                this.setActiveCellInternal(this.getCellNode(row, prevCell));
                this.activePosX = prevActivePosX;
            } else {
                this.resetActiveCell();
            }
        }
        return true;
    }

    private getColspan(row, cell) {
        var metadata = this.data.getItemMetadata && this.data.getItemMetadata(row);
        if (!metadata || !metadata.columns) {
            return 1;
        }

        var columnData = metadata.columns[this.columns[cell].id] || metadata.columns[cell];
        var colspan = (columnData && columnData.colspan);
        if (colspan === "*") {
            colspan = this.columns.length - cell;
        } else {
            colspan = colspan || 1;
        }

        return colspan;
    }

    private findFirstFocusableCell(row) {
        var cell = 0;
        while (cell < this.columns.length) {
            if (this.canCellBeActive(row, cell)) {
                return cell;
            }
            cell += this.getColspan(row, cell);
        }
        return null;
    }

    private findLastFocusableCell(row) {
        var cell = 0;
        var lastFocusableCell = null;
        while (cell < this.columns.length) {
            if (this.canCellBeActive(row, cell)) {
                lastFocusableCell = cell;
            }
            cell += this.getColspan(row, cell);
        }
        return lastFocusableCell;
    }

    private gotoRight(row, cell, posX) {
        if (cell >= this.columns.length) {
            return null;
        }

        do {
            cell += this.getColspan(row, cell);
        }
        while (cell < this.columns.length && !this.canCellBeActive(row, cell));

        if (cell < this.columns.length) {
            return {
                "row": row,
                "cell": cell,
                "posX": cell
            };
        }
        return null;
    }

    private gotoLeft(row, cell, posX) {
        if (cell <= 0) {
            return null;
        }

        var firstFocusableCell = this.findFirstFocusableCell(row);
        if (firstFocusableCell === null || firstFocusableCell >= cell) {
            return null;
        }

        var prev = {
            "row": row,
            "cell": firstFocusableCell,
            "posX": firstFocusableCell
        };
        var pos;
        while (true) {
            pos = this.gotoRight(prev.row, prev.cell, prev.posX);
            if (!pos) {
                return null;
            }
            if (pos.cell >= cell) {
                return prev;
            }
            prev = pos;
        }
    }

    private gotoDown(row, cell, posX) {
        var prevCell;
        var dataLengthIncludingAddNew = this.getDataLengthIncludingAddNew();
        while (true) {
            if (++row >= dataLengthIncludingAddNew) {
                return null;
            }

            prevCell = cell = 0;
            while (cell <= posX) {
                prevCell = cell;
                cell += this.getColspan(row, cell);
            }

            if (this.canCellBeActive(row, prevCell)) {
                return {
                    "row": row,
                    "cell": prevCell,
                    "posX": posX
                };
            }
        }
    }

    private gotoUp(row, cell, posX) {
        var prevCell;
        while (true) {
            if (--row < 0) {
                return null;
            }

            prevCell = cell = 0;
            while (cell <= posX) {
                prevCell = cell;
                cell += this.getColspan(row, cell);
            }

            if (this.canCellBeActive(row, prevCell)) {
                return {
                    "row": row,
                    "cell": prevCell,
                    "posX": posX
                };
            }
        }
    }

    private gotoNext(row, cell, posX) {
        if (row == null && cell == null) {
            row = cell = posX = 0;
            if (this.canCellBeActive(row, cell)) {
                return {
                    "row": row,
                    "cell": cell,
                    "posX": cell
                };
            }
        }

        var pos = this.gotoRight(row, cell, posX);
        if (pos) {
            return pos;
        }

        var firstFocusableCell = null;
        var dataLengthIncludingAddNew = this.getDataLengthIncludingAddNew();

        // if at last row, cycle through columns rather than get stuck in the last one
        if (row === dataLengthIncludingAddNew - 1) { row--; }

        while (++row < dataLengthIncludingAddNew) {
            firstFocusableCell = this.findFirstFocusableCell(row);
            if (firstFocusableCell !== null) {
                return {
                    "row": row,
                    "cell": firstFocusableCell,
                    "posX": firstFocusableCell
                };
            }
        }
        return null;
    }

    private gotoPrev(row, cell, posX) {
        if (row == null && cell == null) {
            row = this.getDataLengthIncludingAddNew() - 1;
            cell = posX = this.columns.length - 1;
            if (this.canCellBeActive(row, cell)) {
                return {
                    "row": row,
                    "cell": cell,
                    "posX": cell
                };
            }
        }

        var pos;
        var lastSelectableCell;
        while (!pos) {
            pos = this.gotoLeft(row, cell, posX);
            if (pos) {
                break;
            }
            if (--row < 0) {
                return null;
            }

            cell = 0;
            lastSelectableCell = this.findLastFocusableCell(row);
            if (lastSelectableCell !== null) {
                pos = {
                    "row": row,
                    "cell": lastSelectableCell,
                    "posX": lastSelectableCell
                };
            }
        }
        return pos;
    }

    private gotoRowStart(row, cell, posX) {
        var newCell = this.findFirstFocusableCell(row);
        if (newCell === null) return null;

        return {
            "row": row,
            "cell": newCell,
            "posX": newCell
        };
    }

    private gotoRowEnd(row, cell, posX) {
        var newCell = this.findLastFocusableCell(row);
        if (newCell === null) return null;

        return {
            "row": row,
            "cell": newCell,
            "posX": newCell
        };
    }

    public navigateRight() {
        return this.navigate("right");
    }

    public navigateLeft() {
        return this.navigate("left");
    }

    public navigateDown() {
        return this.navigate("down");
    }

    public navigateUp() {
        return this.navigate("up");
    }

    public navigateNext() {
        return this.navigate("next");
    }

    public navigatePrev() {
        return this.navigate("prev");
    }

    public navigateRowStart() {
        return this.navigate("home");
    }

    public navigateRowEnd() {
        return this.navigate("end");
    }

    /**
     * @param {string} dir Navigation direction.
     * @return {boolean} Whether navigation resulted in a change of active cell.
     */
    private navigate(dir) {
        if (!this.options.enableCellNavigation) {
            return false;
        }

        if (!this.activeCellNode && dir != "prev" && dir != "next") {
            return false;
        }

        if (!this.getEditorLock().commitCurrentEdit()) {
            return true;
        }
        this.setFocus();

        var tabbingDirections = {
            "up": -1,
            "down": 1,
            "left": -1,
            "right": 1,
            "prev": -1,
            "next": 1,
            "home": -1,
            "end": 1
        };
        this.tabbingDirection = tabbingDirections[dir];

        var stepFunctions = {
            "up": this.gotoUp,
            "down": this.gotoDown,
            "left": this.gotoLeft,
            "right": this.gotoRight,
            "prev": this.gotoPrev,
            "next": this.gotoNext,
            "home": this.gotoRowStart,
            "end": this.gotoRowEnd
        };
        var stepFn = stepFunctions[dir];
        var pos = stepFn(this.activeRow, this.activeCell, this.activePosX);
        if (pos) {
            if (this.hasFrozenRows && this.options.frozenBottom && (pos.row as any) == this.getDataLength()) {
                return false;
            }

            var isAddNewRow = (pos.row == this.getDataLength());

            if ((!this.options.frozenBottom && pos.row >= this.actualFrozenRow)
                || (this.options.frozenBottom && pos.row < this.actualFrozenRow)
            ) {
                this.scrollCellIntoView(pos.row, pos.cell, !isAddNewRow && this.options.emulatePagingWhenScrolling);
            }
            this.setActiveCellInternal(this.getCellNode(pos.row, pos.cell));
            this.activePosX = pos.posX;
            return true;
        } else {
            this.setActiveCellInternal(this.getCellNode(this.activeRow, this.activeCell));
            return false;
        }
    }

    public getCellNode(row, cell) {
        if (this.rowsCache[row]) {
            this.ensureCellNodesInRowsCache(row);
            try {
                if (this.rowsCache[row].cellNodesByColumnIdx.length > cell) {
                    return this.rowsCache[row].cellNodesByColumnIdx[cell][0];
                }
                else {
                    return null;
                }
            } catch (e) {
                return this.rowsCache[row].cellNodesByColumnIdx[cell];
            }
        }
        return null;
    }

    public setActiveCell(row, cell, opt_editMode, preClickModeOn, suppressActiveCellChangedEvent) {
        if (!this.initialized) { return; }
        if (row > this.getDataLength() || row < 0 || cell >= this.columns.length || cell < 0) {
            return;
        }

        if (!this.options.enableCellNavigation) {
            return;
        }

        this.scrollCellIntoView(row, cell, false);
        this.setActiveCellInternal(this.getCellNode(row, cell), opt_editMode, preClickModeOn, suppressActiveCellChangedEvent);
    }

    public setActiveRow(row, cell, suppressScrollIntoView) {
        if (!this.initialized) { return; }
        if (row > this.getDataLength() || row < 0 || cell >= this.columns.length || cell < 0) {
            return;
        }

        this.activeRow = row;
        if (!suppressScrollIntoView) {
            this.scrollCellIntoView(row, cell || 0, false);
        }
    }

    public canCellBeActive(row, cell) {
        if (!this.options.enableCellNavigation || row >= this.getDataLengthIncludingAddNew() ||
            row < 0 || cell >= this.columns.length || cell < 0) {
            return false;
        }

        var rowMetadata = this.data.getItemMetadata && this.data.getItemMetadata(row);
        if (rowMetadata && typeof rowMetadata.focusable !== "undefined") {
            return !!rowMetadata.focusable;
        }

        var columnMetadata = rowMetadata && rowMetadata.columns;
        if (columnMetadata && columnMetadata[this.columns[cell].id] && typeof columnMetadata[this.columns[cell].id].focusable !== "undefined") {
            return !!columnMetadata[this.columns[cell].id].focusable;
        }
        if (columnMetadata && columnMetadata[cell] && typeof columnMetadata[cell].focusable !== "undefined") {
            return !!columnMetadata[cell].focusable;
        }

        return !!this.columns[cell].focusable;
    }

    public canCellBeSelected(row, cell) {
        if (row >= this.getDataLength() || row < 0 || cell >= this.columns.length || cell < 0) {
            return false;
        }

        var rowMetadata = this.data.getItemMetadata && this.data.getItemMetadata(row);
        if (rowMetadata && typeof rowMetadata.selectable !== "undefined") {
            return !!rowMetadata.selectable;
        }

        var columnMetadata = rowMetadata && rowMetadata.columns && (rowMetadata.columns[this.columns[cell].id] || rowMetadata.columns[cell]);
        if (columnMetadata && typeof columnMetadata.selectable !== "undefined") {
            return !!columnMetadata.selectable;
        }

        return !!this.columns[cell].selectable;
    }

    public gotoCell(row, cell, forceEdit, e) {
        if (!this.initialized) { return; }
        if (!this.canCellBeActive(row, cell)) {
            return;
        }

        if (!this.getEditorLock().commitCurrentEdit()) {
            return;
        }

        this.scrollCellIntoView(row, cell, false);

        var newCell = this.getCellNode(row, cell);

        // if selecting the 'add new' row, start editing right away
        var column = this.columns[cell];
        var suppressActiveCellChangedEvent = !!(this.options.editable && column && column.editor && this.options.suppressActiveCellChangeOnEdit);
        this.setActiveCellInternal(newCell, (forceEdit || (row === this.getDataLength()) || this.options.autoEdit), null, suppressActiveCellChangedEvent, e);

        // if no editor was created, set the focus back on the grid
        if (!this.currentEditor) {
            this.setFocus();
        }
    }


    //////////////////////////////////////////////////////////////////////////////////////////////
    // IEditor implementation for the editor lock

    private commitCurrentEdit() {
        var item = this.getDataItem(this.activeRow);
        var column = this.columns[this.activeCell];
        const self = this;

        if (this.currentEditor) {
            if (this.currentEditor.isValueChanged()) {
                var validationResults = this.currentEditor.validate();

                if (validationResults.valid) {
                    if (this.activeRow < this.getDataLength()) {
                        var editCommand = {
                            row: this.activeRow,
                            cell: this.activeCell,
                            editor: this.currentEditor,
                            serializedValue: this.currentEditor.serializeValue(),
                            prevSerializedValue: this.serializedEditorValue,
                            execute: function () {
                                this.editor.applyValue(item, this.serializedValue);
                                self.updateRow(this.row);
                                self.trigger(self.onCellChange, {
                                    row: this.row,
                                    cell: this.cell,
                                    item: item,
                                    column: column
                                });
                            },
                            undo: function () {
                                this.editor.applyValue(item, this.prevSerializedValue);
                                self.updateRow(this.row);
                                self.trigger(self.onCellChange, {
                                    row: this.row,
                                    cell: this.cell,
                                    item: item,
                                    column: column
                                });
                            }
                        };

                        if (this.options.editCommandHandler) {
                            this.makeActiveCellNormal();
                            this.options.editCommandHandler(item, column, editCommand);
                        } else {
                            editCommand.execute();
                            this.makeActiveCellNormal();
                        }

                    } else {
                        var newItem = {};
                        this.currentEditor.applyValue(newItem, this.currentEditor.serializeValue());
                        this.makeActiveCellNormal();
                        this.trigger(this.onAddNewRow, { item: newItem, column: column });
                    }

                    // check whether the lock has been re-acquired by event handlers
                    return !this.getEditorLock().isActive();
                } else {
                    // Re-add the CSS class to trigger transitions, if any.
                    $(this.activeCellNode).removeClass("invalid");
                    $(this.activeCellNode).width();  // force layout
                    $(this.activeCellNode).addClass("invalid");

                    this.trigger(this.onValidationError, {
                        editor: this.currentEditor,
                        cellNode: this.activeCellNode,
                        validationResults: validationResults,
                        row: this.activeRow,
                        cell: this.activeCell,
                        column: column
                    });

                    this.currentEditor.focus();
                    return false;
                }
            }

            this.makeActiveCellNormal();
        }
        return true;
    }

    private cancelCurrentEdit() {
        this.makeActiveCellNormal();
        return true;
    }

    private rowsToRanges(rows) {
        var ranges = [];
        var lastCell = this.columns.length - 1;
        for (var i = 0; i < rows.length; i++) {
            ranges.push(new Range(rows[i], 0, rows[i], lastCell));
        }
        return ranges;
    }

    public getSelectedRows() {
        if (!this.selectionModel) {
            throw new Error("Selection model is not set");
        }
        return this.selectedRows.slice(0);
    }

    public setSelectedRows(rows) {
        if (!this.selectionModel) {
            throw new Error("Selection model is not set");
        }
        if (this && this.getEditorLock && !this.getEditorLock().isActive()) {
            this.selectionModel.setSelectedRanges(this.rowsToRanges(rows));
        }
    }


    //////////////////////////////////////////////////////////////////////////////////////////////
    // Debug

    private debug() {
        var s = "";

        s += ("\n" + "counter_rows_rendered:  " + this.counter_rows_rendered);
        s += ("\n" + "counter_rows_removed:  " + this.counter_rows_removed);
        s += ("\n" + "renderedRows:  " + this.renderedRows);
        s += ("\n" + "numVisibleRows:  " + this.numVisibleRows);
        s += ("\n" + "maxSupportedCssHeight:  " + maxSupportedCssHeight);
        s += ("\n" + "n(umber of pages):  " + this.n);
        s += ("\n" + "(current) page:  " + this.page);
        s += ("\n" + "page height (ph):  " + this.ph);
        s += ("\n" + "vScrollDir:  " + this.vScrollDir);

        alert(s);
    };

    // a debug helper to be able to access private members
    private eval(expr) {
        return eval(expr);
    };

    // Events
    public onScroll = new Event();
    public onSort = new Event();
    public onHeaderMouseEnter = new Event();
    public onHeaderMouseLeave = new Event();
    public onHeaderContextMenu = new Event();
    public onHeaderClick = new Event();
    public onHeaderCellRendered = new Event();
    public onBeforeHeaderCellDestroy = new Event();
    public onHeaderRowCellRendered = new Event();
    public onFooterRowCellRendered = new Event();
    public onFooterContextMenu = new Event();
    public onFooterClick = new Event();
    public onBeforeHeaderRowCellDestroy = new Event();
    public onBeforeFooterRowCellDestroy = new Event();
    public onMouseEnter = new Event();
    public onMouseLeave = new Event();
    public onClick = new Event();
    public onDblClick = new Event();
    public onContextMenu = new Event();
    public onKeyDown = new Event();
    public onAddNewRow = new Event();
    public onBeforeAppendCell = new Event();
    public onValidationError = new Event();
    public onViewportChanged = new Event();
    public onColumnsReordered = new Event();
    public onColumnsDrag = new Event();
    public onColumnsResized = new Event();
    public onBeforeColumnsResize = new Event();
    public onCellChange = new Event();
    public onCompositeEditorChange = new Event();
    public onBeforeEditCell = new Event();
    public onBeforeCellEditorDestroy = new Event();
    public onBeforeDestroy = new Event();
    public onActiveCellChanged = new Event();
    public onActiveCellPositionChanged = new Event();
    public onDragInit = new Event();
    public onDragStart = new Event();
    public onDrag = new Event();
    public onDragEnd = new Event();
    public onSelectedRowsChanged = new Event();
    public onCellCssStylesChanged = new Event();
    public onAutosizeColumns = new Event();
    public onRendered = new Event();
    public onSetOptions = new Event();

}