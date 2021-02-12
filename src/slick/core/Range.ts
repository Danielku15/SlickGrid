/**
 * A structure containing a range of cells.
 */
export class Range {
    public fromRow: Number;
    public fromCell: Number;
    public toRow: Number;
    public toCell: Number;

    /**
     * @param fromRow Starting row.
     * @param fromCell Starting cell.
     * @param toRow Ending row.
     * @param toCell Ending cell.
     */
    public constructor(fromRow: number, fromCell: number, toRow: number = fromRow, toCell: number = fromCell) {
        this.fromRow = Math.min(fromRow, toRow);
        this.fromCell = Math.min(fromCell, toCell);
        this.toRow = Math.max(fromRow, toRow);
        this.toCell = Math.max(fromCell, toCell);
    }

    /***
     * Returns whether a range represents a single row.
     */
    public isSingleRow(): Boolean {
        return this.fromRow == this.toRow;
    }

    /***
     * Returns whether a range represents a single cell.
     */
    public isSingleCell(): Boolean {
        return this.fromRow == this.toRow && this.fromCell == this.toCell;
    }

    /***
     * Returns whether a range contains a given cell.
     */
    public contains(row: Number, cell: Number): Boolean {
        return row >= this.fromRow && row <= this.toRow &&
            cell >= this.fromCell && cell <= this.toCell;
    }

    /***
     * Returns a readable representation of a range.
     */
    public toString(): String {
        if (this.isSingleCell()) {
            return `(${this.fromRow}:${this.fromCell})`;
        }
        else {
            return `(${this.fromRow}:${this.fromCell} - ${this.toRow}:${this.toCell})`;
        }
    }
}