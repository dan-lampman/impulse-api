exports.missingParams = {
    name: 'missingParams',
    description: 'this route is missing the parameter id',
    method: 'get',
    endpoint: '/missing-params/test/:id?',
    version: 'v1',
    tokenAuth: true,
    inputs: {
        id: {
            required: true
        }
    },
    run: (services, inputs, next) => {
        next();
    }
}