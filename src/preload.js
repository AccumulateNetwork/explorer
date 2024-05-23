// Hacks for node modules
import { Buffer } from 'accumulate.js/lib/common';

window.global = window;
window.Buffer = {
    from(...args) { return Buffer.from(...args) },
    alloc(len) { return Buffer.from(new Uint8Array(len)) },
}