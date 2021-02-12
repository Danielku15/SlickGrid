/**
 * Polyfill for Map to support old browsers but
 * benefit of the Map speed in modern browsers.
 */
export class Map {
    private data = {};

    /***
     * Gets the item with the given key from the map or undefined if
     * the map does not contain the item. 
     * @param key {Map} The key of the item in the map.
     */
    public get(key) {
        return this.data[key];
    }

    /***
     * Adds or updates the item with the given key in the map. 
     * @param key The key of the item in the map.
     * @param value The value to insert into the map of the item in the map.
     */
    public set(key, value) {
        this.data[key] = value;
    }

    /***
     * Gets a value indicating whether the given key is present in the map.
     * @param key The key of the item in the map.
     */
    public has(key) {
        return key in this.data;
    }

    /***
     * Removes the item with the given key from the map. 
     * @param key The key of the item in the map.
     */
    public delete(key) {
        delete this.data[key];
    }
}