const Api = require('../src/api');
const assert = require('assert');

describe('server-test', () => {
    describe('instantiation', () => {
        it('should contain the Errors functions', () => {
            const config = {
                name: 'test-Server',
                routeDir: './test-routes',
                port: 4000,
                env: 'test',
                appKey: 'TestKey'
            };
            const TestApi = new Api(config);
            assert(TestApi.Errors !== undefined);
        });
    });
});