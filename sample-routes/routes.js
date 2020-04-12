exports.getDocument = {
    name: 'getDocument',
    description: 'get a document by id',
    method: 'get',
    endpoint: '/api/documents/:id',
    version: 'v1',
    inputs: {
        id: {
            required: true
        },
    },
    run: (services, inputs, next) => {
        const id = inputs.id;

        next(200, {
            id
        });
    },
};

exports.adminGetDocument = {
    name: 'getDocument',
    description: 'get a document by id',
    method: 'get',
    endpoint: '/api/documents/:id',
    version: 'v1',
    applicationAuth: true,
    inputs: {
        id: {
            required: true
        },
    },
    run: (services, inputs, next) => {
        const id = inputs.id;

        next(200, {
            id
        });
    },
};