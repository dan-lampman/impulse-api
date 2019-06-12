exports.missingEndpoint = {
    name: 'missingEndpoint',
    description: 'this route has no endpoint',
    method: 'get',
    version: 'v1',
    tokenAuth: true,
    inputs: {},
    run: (services, inputs, next) => {
        next();
    }
}