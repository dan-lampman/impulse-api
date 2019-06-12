exports.missingMethod = {
    name: 'missingMethod',
    description: 'this route has no method',
    endpoint: '/missing-method/test',
    version: 'v1',
    tokenAuth: true,
    inputs: {},
    run: (services, inputs, next) => {
        next();
    }
}