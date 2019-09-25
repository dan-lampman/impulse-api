const Api = require('../src/api');
const assert = require('assert');

describe('server-test', () => {
    describe('instantiation', () => {
        it('should expoes the Errors functions', () => {
            assert(Api.Errors !== undefined);
        });
    });
});