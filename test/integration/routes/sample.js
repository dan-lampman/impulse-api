exports.test_get_data = {
    name: 'test-get-data',
    description: 'retrieve some data',
    method: 'GET',
    endpoint: '/test-get-data',
    version: 'v1',
    inputs: {
        'test': {
            required: true
        }
    },
    requestBodyOverride: true,
    run: (services, inputs, next) => {
        next({
            data: "I'm a little teapot",
            inputs
        });
    }
}

exports.test_post_data = {
    name: 'test-post-data',
    description: 'retrieve some data',
    method: 'POST',
    endpoint: '/test-post-data',
    version: 'v1',
    inputs: {
        'test': {
            required: true
        }
    },
    requestBodyOverride: true,
    run: (services, inputs, next) => {
        next({
            data: "I'm a little teapot",
            inputs
        });
    }
}