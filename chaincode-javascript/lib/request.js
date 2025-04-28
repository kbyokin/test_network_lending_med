'use strict';

const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');

class RequestFunctions {
    async CreateRequest(ctx, requestData, hospitalList) {
        const data = JSON.parse(requestData);
        const hospitals = JSON.parse(hospitalList);
        const request = {
            id: data.id,
            requestId: data.requestId,
            postingHospitalId: data.postingHospitalId,
            status: 'available',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            urgent: data.urgent,
            requestMedicine: {
                name: data.name,
                quantity: data.quantity,
                unit: data.unit,
                batchNumber: data.batchNumber,
                manufacturer: data.manufacturer,
                manufactureDate: data.manufactureDate,
                expiryDate: data.expiryDate,
                imageRef: data.imageRef
            },
            requestTerm: {
                expectedReturnDate: data.expectedReturnDate,
                receiveConditions: {
                    exactType: data.exactType,
                    subsidiary: data.subsidiary,
                    other: data.other,
                    notes: data.notes
                }
            }
        };

        await ctx.stub.putState(request.id, Buffer.from(stringify(sortKeysRecursive(request))));
        // Create a response request for each hospital
        for (const hospital of hospitals ) {
            const responseId = `RESP-${data.id}-${hospital.id}`; // Unique response ID
            const responseRequest = {
                id: responseId,
                requestId: data.requestId,
                respondingHospitalId: hospital.id,
                respondingHospitalName: hospital.name,
                status: 'pending',
                createdAt: data.createdAt,
                updatedAt: data.createdAt,
                offeredMedicine: null,
                returnMedicine: null
            };
            await ctx.stub.putState(responseRequest.id, Buffer.from(stringify(sortKeysRecursive(responseRequest))));
        }
        return JSON.stringify({
            requestId: data.requestId,
            responsesCreated: hospitals.map(h => `RESP-${data.id}-${h.id}`)
        });
    }
}

module.exports = RequestFunctions;