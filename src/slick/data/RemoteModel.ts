import { Event } from '../core/Event'

interface JQueryXHR extends JQuery.jqXHR {
    fromPage: number;
    toPage: number;
}

/***
 * A sample AJAX data store implementation.
 * Right now, it's hooked up to load search results from Octopart, but can
 * easily be extended to support any JSONP-compatible backend that accepts paging parameters.
 */
export class RemoteModel {
    // private
    private PAGESIZE = 50;
    public data = { length: 0 };
    private searchstr = "";
    private sortcol = null;
    private sortdir = 1;
    private h_request = null;
    private req: JQueryXHR | null = null; // ajax request

    // events
    public onDataLoading = new Event();
    public onDataLoaded = new Event();


    public constructor() {
    }

    public isDataLoaded(from, to) {
        for (var i = from; i <= to; i++) {
            if (this.data[i] == undefined || this.data[i] == null) {
                return false;
            }
        }

        return true;
    }


    public clear() {
        for (var key in this.data) {
            delete this.data[key];
        }
        this.data.length = 0;
    }


    public ensureData(from, to) {
        if (this.req) {
            this.req.abort();
            for (var i = this.req.fromPage; i <= this.req.toPage; i++) {
                this.data[i * this.PAGESIZE] = undefined;
            }
        }

        if (from < 0) {
            from = 0;
        }

        if (this.data.length > 0) {
            to = Math.min(to, this.data.length - 1);
        }

        var fromPage = Math.floor(from / this.PAGESIZE);
        var toPage = Math.floor(to / this.PAGESIZE);

        while (this.data[fromPage * this.PAGESIZE] !== undefined && fromPage < toPage)
            fromPage++;

        while (this.data[toPage * this.PAGESIZE] !== undefined && fromPage < toPage)
            toPage--;

        if (fromPage > toPage || ((fromPage == toPage) && this.data[fromPage * this.PAGESIZE] !== undefined)) {
            // TODO:  look-ahead
            this.onDataLoaded.notify({ from: from, to: to });
            return;
        }

        var url = "http://octopart.com/api/v3/parts/search?apikey=68b25f31&include[]=short_description&show[]=uid&show[]=manufacturer&show[]=mpn&show[]=brand&show[]=octopart_url&show[]=short_description&q=" + this.searchstr + "&start=" + (fromPage * this.PAGESIZE) + "&limit=" + (((toPage - fromPage) * this.PAGESIZE) + this.PAGESIZE);

        if (this.sortcol != null) {
            url += ("&sortby=" + this.sortcol + ((this.sortdir > 0) ? "+asc" : "+desc"));
        }

        if (this.h_request != null) {
            clearTimeout(this.h_request);
        }

        this.h_request = setTimeout(() => {
            for (var i = fromPage; i <= toPage; i++)
                this.data[i * this.PAGESIZE] = null; // null indicates a 'requested but not available yet'

            this.onDataLoading.notify({ from: from, to: to });

            this.req = ($ as any).jsonp({
                url: url,
                callbackParameter: "callback",
                cache: true,
                success: this.onSuccess,
                error: () => {
                    this.onError(fromPage, toPage);
                }
            });
            this.req.fromPage = fromPage;
            this.req.toPage = toPage;
        }, 50);
    }


    private onError(fromPage, toPage) {
        alert("error loading pages " + fromPage + " to " + toPage);
    }

    private onSuccess(resp) {
        var from = resp.request.start, to = from + resp.results.length;
        this.data.length = Math.min(parseInt(resp.hits), 1000); // limitation of the API

        for (var i = 0; i < resp.results.length; i++) {
            var item = resp.results[i].item;

            this.data[from + i] = item;
            this.data[from + i].index = from + i;
        }

        this.req = null;

        this.onDataLoaded.notify({ from: from, to: to });
    }


    public reloadData(from, to) {
        for (var i = from; i <= to; i++)
            delete this.data[i];

        this.ensureData(from, to);
    }


    public setSort(column, dir) {
        this.sortcol = column;
        this.sortdir = dir;
        this.clear();
    }

    public setSearch(str) {
        this.searchstr = str;
        this.clear();
    }
}