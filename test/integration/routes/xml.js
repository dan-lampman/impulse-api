exports.test = {
    name: 'test',
    description: 'this route can do it all',
    method: 'post',
    endpoint: '/test',
    version: 'v1',
    inputs: {
        test: {
            required: true,
            validate: (test) => test === "123"
        }
    },
    requestBodyOverride: true,
    run: (services, inputs, next) => {
        next(inputs);
    }
}