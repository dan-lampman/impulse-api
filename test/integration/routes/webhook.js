exports.webhook = {
    name: 'webhook',
    method: 'post',
    endpoint: '/webhook',
    rawBody: true,
    run: (services, inputs, next) => {
        if (!Buffer.isBuffer(inputs.rawBody)) {
            return next(500, { error: 'rawBody is not a Buffer' });
        }
        next(200, { 
            success: true, 
            isBuffer: Buffer.isBuffer(inputs.rawBody),
            rawBodyLength: inputs.rawBody.length,
            rawBodyString: inputs.rawBody.toString()
        });
    }
};

