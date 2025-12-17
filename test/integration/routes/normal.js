exports.normal = {
    name: 'normal',
    method: 'post',
    endpoint: '/normal',
    inputs: {
        test: {
            required: true
        },
        value: {
            required: true
        }
    },
    run: (services, inputs, next) => {
        if (inputs.rawBody !== undefined) {
            return next(500, { error: 'rawBody should not be set' });
        }
        next(200, { 
            success: true,
            test: inputs.test,
            value: inputs.value
        });
    }
};

