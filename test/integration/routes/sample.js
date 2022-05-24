exports.test = {
    name: 'test-get-person',
    description: 'retrieve a person by name and age',
    method: 'GET',
    endpoint: '/test-get-person',
    version: 'v1',
    inputs: {
        name: {
            required: true,
        },
        age: {
            required: true,
        },
    },
    requestBodyOverride: true,
    run: (services, inputs, next) => {
        next(inputs);
    }
}