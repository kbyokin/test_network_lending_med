'use strict';

const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');

class RequestFunctions {
    async CreateRequest(ctx, requestData, hospitalList) {
        const data = JSON.parse(requestData);
        const hospitals = JSON.parse(hospitalList);
        const responseIds = hospitals.map(hospital => `RESP-${data.id}-${hospital.id}`);
        const request = {
            id: data.id,
            responseIds: responseIds,
            postingHospitalId: data.postingHospitalId,
            postingHospitalNameEN: data.postingHospitalNameEN,
            postingHospitalNameTH: data.postingHospitalNameTH,
            postingHospitalAddress: data.postingHospitalAddress,
            status: data.status,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            urgent: data.urgent,
            requestMedicine: {
                name: data.requestMedicine.name,
                requestAmount: data.requestMedicine.requestAmount,
                quantity: data.requestMedicine.quantity,
                unit: data.requestMedicine.unit,
                trademark: data.requestMedicine.trademark,
                manufacturer: data.requestMedicine.manufacturer,
                pricePerUnit: data.requestMedicine.pricePerUnit,
                imageRef: data.requestMedicine.imageRef
            },
            requestTerm: {
                expectedReturnDate: data.requestTerm.expectedReturnDate,
                receiveConditions: {
                    condition: data.requestTerm.receiveConditions.condition,
                    supportType: data.requestTerm.receiveConditions.supportType
                }
            },
            ticketType: 'request'
        };

        await ctx.stub.putState(request.id, Buffer.from(stringify(sortKeysRecursive(request))));
        // Create a response request for each hospital
        for (const hospital of hospitals ) {
            const responseId = `RESP-${data.id}-${hospital.id}`; // Unique response ID
            const responseRequest = {
                id: responseId,
                requestId: data.id,
                respondingHospitalId: hospital.id,
                respondingHospitalNameEN: hospital.nameEN,
                respondingHospitalNameTH: hospital.nameTH,
                respondingHospitalAddress: hospital.address,
                status: 'pending',
                createdAt: data.createdAt,
                updatedAt: data.createdAt,
                offeredMedicine: null,
                returnMedicine: null,
                ticketType: 'request'
            };
            await ctx.stub.putState(responseRequest.id, Buffer.from(stringify(sortKeysRecursive(responseRequest))));
        }
        return JSON.stringify({
            requestId: data.id,
            responsesCreated: hospitals.map(h => `RESP-${data.id}-${h.id}`)
        });
    }

    async UpdateSharingStatus(ctx, id, status) {
        const request = await ctx.stub.getState(id);
        const requestData = JSON.parse(request);
        requestData.status = status;
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(requestData))));
    }
}

module.exports = RequestFunctions;