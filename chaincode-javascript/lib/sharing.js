'use strict';

const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');

class SharingFunctions {
    async CreateSharing(ctx, sharingData, hospitalList) {
        const data = JSON.parse(sharingData);
        const hospitals = JSON.parse(hospitalList);
        const sharingId = `SHAR-${data.id}-${hospitals[0].id}`;
        const responseIds = hospitals.map(hospital => `RESP-${data.id}-${hospital.id}`);
        const sharing = {
            id: sharingId,
            responseIds: responseIds,
            postingHospitalId: data.postingHospitalId,
            postingHospitalNameEN: data.postingHospitalNameEN,
            postingHospitalNameTH: data.postingHospitalNameTH,
            postingHospitalAddress: data.postingHospitalAddress,
            status: data.status,
            createdAt: data.createdAt,
            sharingMedicine: data.sharingMedicine,
            sharingReturnTerm: data.sharingReturnTerm,
            ticketType: 'sharing'
        };
        await ctx.stub.putState(sharing.id, Buffer.from(stringify(sortKeysRecursive(sharing))));
        // create a response for each hospital
        for (const hospital of hospitals) {
            const responseId = `RESP-${data.id}-${hospital.id}`;
            const response = {
                id: responseId,
                sharingId: sharingId,
                ticketType: 'sharing',
                respondingHospitalId: hospital.id,
                respondingHospitalNameEN: hospital.nameEN,
                respondingHospitalNameTH: hospital.nameTH,
                respondingHospitalAddress: hospital.address,
                status: 'pending',
                createdAt: data.createdAt,
                updatedAt: data.createdAt,
                acceptedOffer: null,
                returnTerm: null
            };
            await ctx.stub.putState(response.id, Buffer.from(stringify(sortKeysRecursive(response))));
        }
        return JSON.stringify({
            sharingId: sharingId,
            responsesCreated: hospitals.map(h => `RESP-${data.id}-${h.id}`)
        });
    }

    async AcceptSharing(ctx, acceptSharingData) {
        const data = JSON.parse(acceptSharingData);
        const sharingId = data.sharingId;
        const returnTerm = data.returnTerm;
        const acceptOffer = data.acceptOffer;
        const updatedAt = data.updatedAt;
        const status = data.status;

        const sharing = await ctx.stub.getState(sharingId);
        const sharingData = JSON.parse(sharing);
        sharingData.status = status;
        sharingData.returnTerm = returnTerm;
        sharingData.acceptedOffer = acceptOffer;
        sharingData.updatedAt = updatedAt;
        await ctx.stub.putState(sharingId, Buffer.from(stringify(sortKeysRecursive(sharingData))));
    }

    async UpdateStatus(ctx, sharingId, status, updatedAt) {
        const sharingBuffer = await ctx.stub.getState(sharingId);
        const sharingData = JSON.parse(sharingBuffer);
        sharingData.status = status;
        sharingData.updatedAt = updatedAt;
        await ctx.stub.putState(sharingId, Buffer.from(stringify(sortKeysRecursive(sharingData))));
        return JSON.stringify(sharingData);
    }
}

module.exports = SharingFunctions;