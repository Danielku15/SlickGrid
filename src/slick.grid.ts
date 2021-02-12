
// make sure required JavaScript modules are loaded
if (typeof jQuery === "undefined") {
    throw new Error("SlickGrid requires jquery module to be loaded");
}
if (!('drag' in jQuery.fn)) {
    throw new Error("SlickGrid requires jquery.event.drag module to be loaded");
}
if (!('Slick' in window)) {
    throw new Error("slick.core.js not loaded");
}

export { Grid } from './slick/Grid';