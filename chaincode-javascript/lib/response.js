'use strict';

// const stringify = require('json-stringify-deterministic');
// const sortKeysRecursive = require('sort-keys-recursive');

class ResponseFunctions {
    async QueryConfirmReturn(ctx, respondingHospitalNameEN, status) {
        const responseQuery = {
            selector: {
                respondingHospitalNameEN: respondingHospitalNameEN,
                status: status,
            }
        };
        const responseResults = await ctx.stub.getQueryResult(JSON.stringify(responseQuery));
        const enrichedResponses = [];
        const requestCache = {};
        let res = await responseResults.next();
        while (!res.done) {
            const response = JSON.parse(res.value.value.toString('utf8'));
            const responseId = response.id;
            if (!requestCache[responseId]) {
                const requestBytes = await ctx.stub.getState(responseId);
                if (requestBytes && requestBytes.length > 0) {
                    const request = JSON.parse(requestBytes.toString('utf8'));
                    requestCache[responseId] = request;
                }
            }
            enrichedResponses.push(response);
            res = await responseResults.next();
        }
        await responseResults.close();
        return enrichedResponses;
    }
}

module.exports = ResponseFunctions;