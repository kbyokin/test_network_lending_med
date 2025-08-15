'use strict';

const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');

class MedicineFunctions {
    async CreateMedicine(ctx, id, postingDate, postingHospital, medicineName, quantity, unit, batchNumber, manufacturer, manufacturerDate, expiryDate, currentLocation, status) {
        const exists = await this.MedicineExists(ctx, id);
        if (exists) {
            throw new Error(`The asset ${id} does not exist`);
        }

        const asset = {
            ID: id,
            PostingDate: postingDate,
            PostingHospital: postingHospital,
            MedicineName: medicineName,
            Quantity: quantity,
            Unit: unit,
            BatchNumber: batchNumber,
            Manufacturer: manufacturer,
            ManufactureDate: manufacturerDate,
            ExpiryDate: expiryDate,
            CurrentLocation: currentLocation,
            Status: status,
            BorrowRecords: [],
            ShipmentDetails: [],
        };
        await ctx.stub.putState(id, Buffer.from(stringify(asset)));
        return JSON.stringify(asset);
    }

    async BorrowMedicine(ctx, id, borrowID, borrowingHospital, requestedQuantity, borrowDate) {
        const exists = await this.MedicineExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        const assetString = await this.ReadMedicine(ctx, id);
        const asset = JSON.parse(assetString);
        const requestedQty = parseInt(requestedQuantity, 10);
        if (asset.Quantity < requestedQty) {
            throw new Error(`Not enough quantity available for borrowing. Available: ${asset.Quantity}, Requested: ${requestedQuantity}`);
        }
        asset.Quantity -= requestedQty;
        const borrowRecord = {
            BorrowID: borrowID,
            BorrowingHospital: borrowingHospital,
            RequestedQuantity: requestedQty,
            BorrowDate: borrowDate,
            Status: 'Borrowed',
        };
        asset.BorrowRecords.push(borrowRecord);
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        return JSON.stringify(asset);
    }

    async ShipmentUpdates(ctx, id, statusDate, shipmentStatus) {
        const shipmentID = `shipment${String(Date.now())}`;
        const exists = await this.MedicineExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        const assetString = await this.ReadMedicine(ctx, id);
        const asset = JSON.parse(assetString);
        const shipmentRecord = {
            ShipmentID: shipmentID,
            StatusDate: statusDate,
            ShipmentStatus: shipmentStatus,
        };
        asset.ShipmentDetails.push(shipmentRecord);
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        return JSON.stringify(asset);
    }

    async ReadMedicine(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return assetJSON.toString();
    }

    async UpdateMedicine(ctx, id, name, batchNumber, manufacturer, manufacturerDate, expiryDate, currentLocation, temperature, price) {
        const exists = await this.MedicineExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }

        const updatedAsset = {
            ID: id,
            Name: name,
            BatchNumber: batchNumber,
            Manufacturer: manufacturer,
            ManufactureDate: manufacturerDate,
            ExpiryDate: expiryDate,
            CurrentLocation: currentLocation,
            Temperature: temperature,
            Price: price,
        };
        return ctx.stub.putState(id, Buffer.from(stringify(updatedAsset)));
    }

    async DeleteMedicine(ctx, id) {
        const exists = await this.MedicineExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return ctx.stub.deleteState(id);
    }

    async MedicineExists(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }

    async TransferMedicine(ctx, id, newOwner) {
        const assetString = await this.ReadMedicine(ctx, id);
        const asset = JSON.parse(assetString);
        const oldOwner = asset.Owner;
        asset.Owner = newOwner;
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        return oldOwner;
    }

    async GetRemainingAmount(ctx, id) {
        const assetString = await this.ReadMedicine(ctx, id); // this should return the original ticket
        const asset = JSON.parse(assetString);

        const status = ['to-transfer', 'in-transfer', 'to-confirm', 'in-return', 'to-return', 'in-transfer', 'completed', 'returned'];

        // Compose the query based on ticket type
        const querySelector = asset.ticketType === 'sharing'
            ? { selector: { sharingId: id, status: { $in: status } } }
            : { selector: { requestId: id, status: { $in: status } } };

        const iterator = await ctx.stub.getQueryResult(JSON.stringify(querySelector));

        let totalResponseAmount = 0;

        while (true) {
            const res = await iterator.next();
            if (res.value && res.value.value.toString()) {
                const response = JSON.parse(res.value.value.toString('utf8'));

                // Depending on ticket type, pick the right field
                const amount = asset.ticketType === 'sharing'
                    ? (response.acceptedOffer !== null && response.acceptedOffer !== undefined ? response.acceptedOffer.responseAmount || 0 : 0)
                    : (response.offeredMedicine !== null && response.offeredMedicine !== undefined ? response.offeredMedicine.offerAmount || 0 : 0);

                totalResponseAmount += Number(amount);
            }

            if (res.done) {
                break;
            }
        }

        await iterator.close();

        // Calculate remaining amount
        const originalAmount = asset.ticketType === 'sharing'
            ? Number(asset.sharingMedicine.sharingAmount)
            : Number(asset.requestMedicine.requestAmount);

        const remainingAmount = originalAmount - totalResponseAmount;

        // add remaining amount to the asset
        // asset.remainingAmount = remainingAmount;
        // await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));

        return remainingAmount;
    }

    async UpdateTicketStatus(ctx, id, status, updatedAt) {
        const data = await ctx.stub.getState(id);
        const parsedData = JSON.parse(data);
        parsedData.status = status;
        parsedData.updatedAt = updatedAt;
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(parsedData))));
        return JSON.stringify(parsedData);
    }


    async GetAllMedicines(ctx) {
        const allResults = [];
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }

    async GetHospitalTransactions(ctx, hospitalNameEN) {
        const selector = {
            selector: {
                $or: [
                    { postingHospitalNameEN: hospitalNameEN },
                    { respondingHospitalNameEN: hospitalNameEN }
                ]
            }
        };

        const iterator = await ctx.stub.getQueryResult(JSON.stringify(selector));
        const allResults = [];

        let result = await iterator.next();
        while (!result.done) {
            const record = JSON.parse(result.value.value.toString('utf8'));
            allResults.push(record);
            result = await iterator.next();
        }
        await iterator.close();

        // Group by status
        const grouped = {};
        for (const tx of allResults) {
            const status = tx.status || 'unknown';
            if (!grouped[status]) {
                grouped[status] = [];
            }
            grouped[status].push(tx);
        }

        // Convert grouped object to array
        const resultArray = Object.keys(grouped).map(status => ({
            status: status,
            length: grouped[status].length,
            transactions: grouped[status],
        }));

        return JSON.stringify(resultArray);
    }


}

module.exports = MedicineFunctions;