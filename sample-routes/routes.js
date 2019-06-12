exports.getDocument = {
    name: 'getDocument',
    description: 'get a document by id',
    method: 'get',
    endpoint: '/api/document/:id',
    version: 'v1',
    tokenAuth: true,
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