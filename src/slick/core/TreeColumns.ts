import { IColumnIndexAccess } from "./IColumnIndexAccess";

export interface TreeColumn {
    id: any,
    columns: TreeColumn[],
    visible: boolean
}

export class TreeColumns {
    private _columnsById: any = {};
    private _treeColumns: TreeColumn[];

    /**
     * @param treeColumns Array com levels of columns
     */
    public constructor(treeColumns: TreeColumn[]) {
        this._treeColumns = treeColumns;
        this.mapToId(treeColumns);
    }

    private mapToId(columns: TreeColumn[]) {
        columns
            .forEach(column => {
                this._columnsById[column.id] = column;

                if (column.columns) {
                    this.mapToId(column.columns);
                }
            });
    }

    private filterFrom(node: TreeColumn[], condition: () => boolean): TreeColumn[] {
        return node.filter(column => {
            const valid = condition.call(column);

            if (valid && column.columns) {
                column.columns = this.filterFrom(column.columns, condition);
            }

            return valid && (!column.columns || column.columns.length);
        });
    }



    private getOrDefault(value: any) {
        return typeof value === 'undefined' ? -1 : value;
    }

    private sort(columns: TreeColumn[], grid: IColumnIndexAccess) {
        columns
            .sort((a, b) => {
                var indexA = this.getOrDefault(grid.getColumnIndex(a.id)),
                    indexB = this.getOrDefault(grid.getColumnIndex(b.id));
                return indexA - indexB;
            })
            .forEach(column => {
                if (column.columns) {
                    this.sort(column.columns, grid);
                }
            });
    }


    private getDepthFrom(node: TreeColumn[] | TreeColumn): number {
        if ((node as any).length) {
            for (const i in node) {
                return this.getDepthFrom((node as any)[i] as TreeColumn[]);
            }
            return 0;
        }
        else if ((node as any).columns) {
            return 1 + this.getDepthFrom((node as TreeColumn).columns);
        }
        else {
            return 1;
        }
    }


    private getColumnsInDepthFrom(node: TreeColumn[], depth: number, current: number = 0): TreeColumn[] {
        let columns: TreeColumn[] = [];

        if (depth == current) {

            if (node.length) {
                node.forEach(n => {
                    if (n.columns) {
                        (n as any).extractColumns = () => {
                            return this.extractColumnsFrom(n);
                        };
                    }
                });
            }

            return node;
        } else {
            for (var i in node) {
                if (node[i].columns) {
                    columns = columns.concat(this.getColumnsInDepthFrom(node[i].columns, depth, current + 1));
                }
            }
        }

        return columns;
    }

    private extractColumnsFrom(node: TreeColumn[] | TreeColumn): TreeColumn[] | TreeColumn {
        let result: TreeColumn[] = [];

        if (node.hasOwnProperty('length')) {
            for (var i = 0; i < (node as any).length; i++) {
                result = result.concat(this.extractColumnsFrom((node as any)[i]));
            }
        } else {
            if (node.hasOwnProperty('columns')) {
                result = result.concat(this.extractColumnsFrom((node as TreeColumn).columns));
            }
            else {
                return node;
            }
        }

        return result;
    }

    private cloneTreeColumns() {
        return $.extend(true, [], this._treeColumns);
    }


    public hasDepth() {
        for (var i in this._treeColumns) {
            if (this._treeColumns[i].hasOwnProperty('columns')) {
                return true;
            }
        }
        return false;
    }

    public getTreeColumns() {
        return this._treeColumns;
    }

    public extractColumns() {
        return this.hasDepth() ? this.extractColumnsFrom(this._treeColumns) : this._treeColumns;
    }

    public getDepth() {
        return this.getDepthFrom(this._treeColumns);
    }

    public getColumnsInDepth(depth: number) {
        return this.getColumnsInDepthFrom(this._treeColumns, depth);
    }

    public getColumnsInGroup(groups: TreeColumn[]) {
        return this.extractColumnsFrom(groups);
    }

    public visibleColumns() {
        return this.filterFrom(this.cloneTreeColumns(), function (this: TreeColumn) {
            return this.visible
        });
    }

    public filter(condition: () => boolean) {
        return this.filterFrom(this.cloneTreeColumns(), condition);
    }

    public reOrder(grid: IColumnIndexAccess) {
        return this.sort(this._treeColumns, grid);
    }

    public getById(id: any) {
        return this._columnsById[id];
    }

    public getInIds(ids: any[]) {
        return ids.map((id) => {
            return this._columnsById[id];
        });
    }
}