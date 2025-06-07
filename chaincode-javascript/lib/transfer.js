'use strict';

const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');

class TransferFunctions {
    async CreateMedicineTransfer(ctx, responseId, updatedAt) {
        const responseExists = await this.MedicineExists(ctx, responseId);
        if (!responseExists) {
            throw new Error(`The asset ${responseId} does not exist`);
        }
        const responseAssetString = await this.ReadMedicine(ctx, responseId);
        const responseAsset = JSON.parse(responseAssetString);
        const requestExists = await this.MedicineExists(ctx, responseAsset.requestId);
        if (!requestExists) {
            throw new Error(`The request ${responseAsset.requestId} does not exist`);
        }
        if (responseAsset.status !== 'accepted') {
            throw new Error(`The response ${responseId} is not in pending status`);
        }
        responseAsset.status = 'inTransfer';
        responseAsset.updatedAt = updatedAt;
        await ctx.stub.putState(responseAsset.id, Buffer.from(stringify(sortKeysRecursive(responseAsset))));

        const requestAssetString = await this.ReadMedicine(ctx, responseAsset.requestId);
        const requestAsset = JSON.parse(requestAssetString);
        // Create new transfer record
        const transferId = `TRANS-${requestAsset.id}-${requestAsset.postingHospitalId}`;
        const transferAsset = {
            transferId: transferId,
            requestId: requestAsset.requestId,
            responseId: responseAsset.responseId,
            fromHospitalId: responseAsset.postingHospitalId,
            fromHospitalNameEN: responseAsset.postingHospitalNameEN,
            toHospitalId: responseAsset.respondingHospitalId,
            toHospitalNameEN: responseAsset.respondingHospitalNameEN,
            createdAt: updatedAt,
            status: 'inTransfer',
            shipmentDetails: {
                trackingNumber: null,
                carrier: null,
                shippedFrom: null,
                shippedTo: null,
                shipmentDate: null
            }
        };
        await ctx.stub.putState(transferAsset.transferId, Buffer.from(stringify(sortKeysRecursive(transferAsset))));
        return JSON.stringify({
            requestId: requestAsset.requestId,
            transferId: transferAsset.transferId,
            updatedAt: updatedAt,
            status: 'inTransfer',
        });
    }

    async CreateMedicineReturn(ctx, responseId, returnData) {
        const responseExists = await this.MedicineExists(ctx, responseId);
        if (!responseExists) {
            throw new Error(`The asset ${responseId} does not exist`);
        }
        const responseAssetString = await this.ReadMedicine(ctx, responseId);
        const responseAsset = JSON.parse(responseAssetString);
        const returnAsset = JSON.parse(returnData);
        responseAsset.status = 'confirm-return';
        responseAsset.returnMedicine = returnAsset;
        responseAsset.updatedAt = returnAsset.updatedAt;
        await ctx.stub.putState(responseAsset.id, Buffer.from(stringify(sortKeysRecursive(responseAsset))));
        return JSON.stringify({
            requestId: responseAsset.requestId,
            responseId: responseId,
            status: 'confirm-return'
        });
    }

    async MedicineExists(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }

    async ReadMedicine(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return assetJSON.toString();
    }
}

module.exports = TransferFunctions;