const Server = require('../../src/server');

const testApi = new Server({
    name: 'test-server',
    routeDir: __dirname.concat('/routes'),
    port: 3000,
    env: 'integration',
    version: 'alpha',
    services: {}
});

start = async function() {
    await testApi.init();
}

start();


