exports.rawResponseBuffer = {
    name: 'rawResponseBuffer',
    method: 'get',
    endpoint: '/raw-response-buffer',
    rawResponse: true,
    run: (services, inputs, next) => {
        const buffer = Buffer.from('raw buffer response data');
        next(null, buffer);
    }
};

exports.rawResponseString = {
    name: 'rawResponseString',
    method: 'get',
    endpoint: '/raw-response-string',
    rawResponse: true,
    run: (services, inputs, next) => {
        next(null, 'raw string response data');
    }
};

exports.rawResponseWithParams = {
    name: 'rawResponseWithParams',
    method: 'post',
    endpoint: '/raw-response-params',
    rawResponse: true,
    inputs: {
        prefix: {
            required: true
        }
    },
    run: (services, inputs, next) => {
        const response = `${inputs.prefix}: raw response with params`;
        next(null, response);
    }
};

exports.jsonResponse = {
    name: 'jsonResponse',
    method: 'get',
    endpoint: '/json-response',
    rawResponse: false,
    run: (services, inputs, next) => {
        next(null, {
            success: true,
            message: 'This is a JSON response',
            data: { test: 'value' }
        });
    }
};

exports.rawResponseObject = {
    name: 'rawResponseObject',
    method: 'get',
    endpoint: '/raw-response-object',
    rawResponse: true,
    run: (services, inputs, next) => {
        // Even with rawResponse: true, objects should fall through to JSON serialization
        next(null, {
            success: true,
            message: 'This should be JSON serialized'
        });
    }
};

