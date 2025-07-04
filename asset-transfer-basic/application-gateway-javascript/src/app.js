/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const grpc = require('@grpc/grpc-js');
const { connect, hash, signers } = require('@hyperledger/fabric-gateway');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { TextDecoder } = require('node:util');

// ============================================================================
// CONFIGURATION
// ============================================================================

const channelName = envOrDefault('CHANNEL_NAME', 'main-channel');
const chaincodeName = envOrDefault('CHAINCODE_NAME', 'basic');
const mspId = envOrDefault('MSP_ID', 'hospitalaMSP');

// Path to crypto materials.
const cryptoPath = envOrDefault(
    'CRYPTO_PATH',
    path.resolve(
        __dirname,
        '..',
        '..',
        '..',
        'organizations',
        'peerOrganizations',
        'hospitala.example.com'
    )
);

// Path to user private key directory.
const keyDirectoryPath = envOrDefault(
    'KEY_DIRECTORY_PATH',
    path.resolve(
        cryptoPath,
        'users',
        'User1@hospitala.example.com',
        'msp',
        'keystore'
    )
);

// Path to user certificate directory.
const certDirectoryPath = envOrDefault(
    'CERT_DIRECTORY_PATH',
    path.resolve(
        cryptoPath,
        'users',
        'User1@hospitala.example.com',
        'msp',
        'signcerts'
    )
);

// Path to peer tls certificate.
const tlsCertPath = envOrDefault(
    'TLS_CERT_PATH',
    path.resolve(cryptoPath, 'peers', 'peer0.hospitala.example.com', 'tls', 'ca.crt')
);

// Gateway peer endpoint.
const peerEndpoint = envOrDefault('PEER_ENDPOINT', 'localhost:7051');

// Gateway peer SSL host name override.
const peerHostAlias = envOrDefault('PEER_HOST_ALIAS', 'peer0.hospitala.example.com');

// ============================================================================
// CONSTANTS & DATA
// ============================================================================

const utf8Decoder = new TextDecoder();
const now = Date.now();

const hospitalEntities = [
    {
        nameTH: 'โีรงพยาบาลหาดใหญ่',
        nameEN: 'Hat Yai Hospital',
        id: 'hatyaiHospitalMSP',
        address: '123 Main St, City A',
    },
    {
        nameTH: 'โีรงพยาบาลสงขลา',
        nameEN: 'Songkhla Hospital',
        id: 'songkhlaHospitalMSP',
        address: '123 Main St, City A',
    },
    {
        nameTH: 'โีรงพยาบาลนาหม่อม',
        nameEN: 'Na Mom Hospital',
        id: 'namomHospitalMSP',
        address: '456 Elm St, City B',
    },
    {
        nameTH: 'โีรงพยาบาลสิงหนคร',
        nameEN: 'Singha Nakhon Hospital',
        id: 'singhanakohnHospitalMSP',
        address: '789 Oak St, City C',
    },
];

const daysFromNow = (days) => {
    const futureTimeStamp = now + days * 24 * 60 * 60 * 1000;
    return futureTimeStamp.toString();
};

// ============================================================================
// MAIN APPLICATION
// ============================================================================

async function main() {
    displayInputParameters();

    // The gRPC client connection should be shared by all Gateway connections to this endpoint.
    const client = await newGrpcConnection();

    const gateway = connect({
        client,
        identity: await newIdentity(),
        signer: await newSigner(),
        hash: hash.sha256,
        // Default timeouts for different gRPC calls
        evaluateOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        endorseOptions: () => {
            return { deadline: Date.now() + 15000 }; // 15 seconds
        },
        submitOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        commitStatusOptions: () => {
            return { deadline: Date.now() + 60000 }; // 1 minute
        },
    });

    try {
        // Get a network instance representing the channel where the smart contract is deployed.
        const network = gateway.getNetwork(channelName);

        // Get the smart contract from the network.
        const contract = network.getContract(chaincodeName);

        // ============================================================================
        // ACTIVE OPERATIONS - Uncomment/modify as needed for testing
        // ============================================================================
        
        // create sharing asset
        // await createSharingAsset(contract);

        // Query sharing status to hospital
        // await querySharingStatusToHospital(contract, 'Songkhla Hospital', 'to-transfer');
        
        // Query with multiple statuses (example)
        // await querySharingStatusToHospital(contract, 'Hatyai Hospital', ['pending', 're-confirm']);
        // await querySharingStatus(contract, 'Songkla Hospital', 'pending');

        // ============================================================================
        // AVAILABLE OPERATIONS - Uncomment as needed for testing
        // ============================================================================
        
        // Initialize ledger
        // await initLedger(contract);

        // Create and manage sharing assets
        // await createSharingAsset(contract);
        // await updateSharingStatus(contract, 'SHAR-SHARE-1751099747863-2', 'pending', 'testtime');

        // Query operations
        await queryToHospital(contract, 'Songkla Hospital', ['pending', 'offered'], 'request');
        // await queryConfirmReturn(contract, 'Na Mom Hospital', 'confirm-return');
        // await getAllAssets(contract);

        // Update operations
        // await updateConfirmReturn(contract, 'RESP-REQ-1750572718671-1', 'completed');
        // await updateSharingStatus(contract, 'RESP-SHARE-1751128752605-4', 'offered', 'testtime');

        // Complete request flow example:
        // await runCompleteRequestFlow(contract);

    } finally {
        gateway.close();
        client.close();
    }
}

main().catch((error) => {
    console.error('******** FAILED to run the application:', error);
    process.exitCode = 1;
});

// ============================================================================
// CONNECTION & IDENTITY SETUP
// ============================================================================

async function newGrpcConnection() {
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': peerHostAlias,
    });
}

async function newIdentity() {
    const certPath = await getFirstDirFileName(certDirectoryPath);
    const credentials = await fs.readFile(certPath);
    return { mspId, credentials };
}

async function newSigner() {
    const keyPath = await getFirstDirFileName(keyDirectoryPath);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

async function getFirstDirFileName(dirPath) {
    const files = await fs.readdir(dirPath);
    const file = files[0];
    if (!file) {
        throw new Error(`No files in directory: ${dirPath}`);
    }
    return path.join(dirPath, file);
}

// ============================================================================
// LEDGER INITIALIZATION
// ============================================================================

async function initLedger(contract) {
    console.log('\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger');
    await contract.submitTransaction('InitMedicines');
    console.log('*** Transaction committed successfully');
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

async function queryToHospital(contract, hospitalName, status, ticketType) {
    console.log(`\n--> Evaluate Transaction: QuerySharingStatusToHospital`);
    console.log(`    Hospital: ${hospitalName}`);
    console.log(`    Status: ${Array.isArray(status) ? status.join(', ') : status}`);
    
    // If status is an array, stringify it for the chaincode
    const statusParam = Array.isArray(status) ? JSON.stringify(status) : status;
    let resultBytes;
    if (ticketType === 'sharing') {
        resultBytes = await contract.evaluateTransaction('QuerySharingStatusToHospital', hospitalName, statusParam);
    } else if (ticketType === 'request') {
        resultBytes = await contract.evaluateTransaction('QueryRequestToHospital', hospitalName, statusParam);
    }
    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log('*** Result:', JSON.stringify(result, null, 2));
    return result;
}

async function querySharingStatus(contract, hospitalName, status) {
    console.log(`\n--> Evaluate Transaction: QuerySharingStatus - ${hospitalName}, Status: ${status}`);
    const resultBytes = await contract.evaluateTransaction('QuerySharingStatus', hospitalName, status);
    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log('*** Result:', JSON.stringify(result, null, 2));
    return result;
}

async function queryConfirmReturn(contract, respondingHospitalNameEN, status) {
    console.log(`\n--> Evaluate Transaction: QueryConfirmReturn - ${respondingHospitalNameEN}, Status: ${status}`);
    const resultBytes = await contract.evaluateTransaction('QueryConfirmReturn', respondingHospitalNameEN, status);
    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log('*** Result:', JSON.stringify(result, null, 2));
    return result;
}

async function getAllAssets(contract) {
    console.log('\n--> Evaluate Transaction: GetAllAssets, function returns all the current assets on the ledger');
    const resultBytes = await contract.evaluateTransaction('QueryRequestStatus', 'Hatyai Hospital', 'pending');
    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log('*** Result:', JSON.stringify(result, null, 2));
    return result;
}

async function readAssetByID(contract, assetId) {
    console.log(`\n--> Evaluate Transaction: ReadAsset - ${assetId}`);
    const resultBytes = await contract.evaluateTransaction('ReadAssetById', assetId);
    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log('*** Result:', JSON.stringify(result, null, 2));
    return result;
}

// ============================================================================
// UPDATE FUNCTIONS
// ============================================================================

async function updateSharingStatus(contract, sharingId, status, updatedAt) {
    console.log(`\n--> Submit Transaction: UpdateSharingStatus - ${sharingId}, Status: ${status}`);
    const resultBytes = await contract.submitTransaction('UpdateSharingStatus', sharingId, status, updatedAt);
    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log('*** Result:', JSON.stringify(result, null, 2));
    return result;
}

async function updateConfirmReturn(contract, responseId, status) {
    console.log(`\n--> Submit Transaction: UpdateConfirmReturn - ${responseId}, Status: ${status}`);
    const resultBytes = await contract.submitTransaction('UpdateConfirmReturn', responseId, status);
    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log('*** Result:', JSON.stringify(result, null, 2));
    return result;
}

// ============================================================================
// CREATE FUNCTIONS
// ============================================================================

async function createSharingAsset(contract) {
    console.log('\n--> Submit Transaction: CreateSharingAsset');
    const sharingId = `SHAR-${now.toString()}`;
    
    const asset = {
        id: sharingId,
        postingHospitalId: hospitalEntities[0].id,
        postingHospitalNameEN: hospitalEntities[0].nameEN,
        postingHospitalNameTH: hospitalEntities[0].nameTH,
        postingHospitalAddress: hospitalEntities[0].address,
        status: 'in-progress',
        createdAt: now.toString(),
        updatedAt: now.toString(),
        sharingMedicine: {
            name: 'Paracetamol',
            trademark: 'Adrenaline Injection',
            quantity: 100,
            pricePerUnit: 150,
            unit: '1mg/1ml',
            batchNumber: 'B12345',
            manufacturer: 'Pharma Inc.',
            manufactureDate: '1743572230567',
            expiryDate: '1743572230567',
            imageRef: 'base64encodedstring'
        },
        sharingReturnTerm: {
            expectedReturnDate: daysFromNow(10),
            receiveConditions: {
                exactType: false,
                subType: true,
                otherType: true,
                supportType: true,
                noReturn: true,
            }
        }
    };

    const hospitalList = hospitalEntities.slice(1, 4); // Use entities 1-3
    
    const resultBytes = await contract.submitTransaction(
        'CreateMedicineSharing',
        JSON.stringify(asset),
        JSON.stringify(hospitalList)
    );
    
    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log('*** Transaction committed successfully');
    console.log('*** Result:', JSON.stringify(result, null, 2));
    return result;
}

async function createRequestAsset(contract) {
    console.log('\n--> Submit Transaction: CreateRequestAsset');
    const assetId = `REQ-${now.toString()}`;

    const asset = {
        id: assetId,
        postingHospitalId: hospitalEntities[0].id,
        postingHospitalNameEN: hospitalEntities[0].nameEN,
        postingHospitalNameTH: hospitalEntities[0].nameTH,
        postingHospitalAddress: hospitalEntities[0].address,
        status: 'in-progress',
        createdAt: now.toString(),
        updatedAt: now.toString(),
        urgent: true,
        requestMedicine: {
            name: 'Paracetamol',
            trademark: 'Adrenaline Injection',
            quantity: 100,
            pricePerUnit: 150,
            unit: '1mg/1ml',
            batchNumber: 'B12345',
            manufacturer: 'Pharma Inc.',
            manufactureDate: '1743572230567',
            imageRef: 'base64encodedstring'
        },
        requestTerm: {
            expectedReturnDate: daysFromNow(10),
            receiveConditions: {
                exactType: false,
                subsidiary: true,
                other: true,
                notes: 'Equivalent brands also acceptable'
            }
        }
    };

    const hospitalList = hospitalEntities.slice(1, 4); // Use entities 1-3

    const resultBytes = await contract.submitTransaction(
        'CreateMedicineRequest',
        JSON.stringify(asset),
        JSON.stringify(hospitalList)
    );

    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log('*** Transaction committed successfully');
    console.log('*** Result:', JSON.stringify(result, null, 2));
    return result;
}

// ============================================================================
// WORKFLOW FUNCTIONS
// ============================================================================

async function runCompleteRequestFlow(contract) {
    console.log('\n========================================');
    console.log('STARTING COMPLETE REQUEST FLOW');
    console.log('========================================');

    // 1: Create hospitalA request medicine to desired hospitals
    console.log('\n--- Step 1: Create Request ---');
    const createReqResult = await createRequestAsset(contract);
    await readAssetByID(contract, createReqResult.requestId);

    // 2: hospitalB responds to hospitalA's request
    console.log('\n--- Step 2: Hospital Response ---');
    const assetId = createReqResult.responsesCreated[0];
    console.log("Before hospitalB's response:");
    await readAssetByID(contract, assetId);
    
    await updateResponseAsset(contract, assetId);
    
    console.log("After hospitalB's response:");
    await readAssetByID(contract, assetId);

    // 3: hospitalA approved hospitalB's response and create transfer
    console.log('\n--- Step 3: Create Transfer ---');
    const result = await createTransferAsset(contract, assetId);
    console.log('Transfer Result:', result.transferId);

    console.log('\n========================================');
    console.log('COMPLETE REQUEST FLOW FINISHED');
    console.log('========================================');
}

async function updateResponseAsset(contract, assetId) {
    console.log(`\n--> Submit Transaction: UpdateResponseAsset - ${assetId}`);
    const responseAsset = {
        responseId: assetId,
        updatedAt: now.toString(),
        status: 'in-transfer',
        offeredMedicine: {
            name: 'Paracetamol',
            trademark: 'Adrenaline Injection',
            quantity: 100,
            pricePerUnit: 150,
            unit: '1mg/1ml',
            batchNumber: 'B12345',
            manufacturer: 'Pharma Inc.',
            manufactureDate: now.toString(),
            expiryDate: now.toString(),
            imageRef: 'base64encodedstring',
            returnTerm: {
                sameUnit: true,
                subsidiary: false,
                sameValue: false,
                other: false,
                notes: "please return the same unit"
            }
        },
    };

    const resultBytes = await contract.submitTransaction('CreateMedicineResponse', JSON.stringify(responseAsset));
    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log('*** Transaction committed successfully');
    console.log('*** Result:', JSON.stringify(result, null, 2));
    return result;
}

async function createTransferAsset(contract, assetId) {
    console.log(`\n--> Submit Transaction: CreateTransferAsset - ${assetId}`);
    const updatedAt = now.toString();
    const responseId = assetId;
    
    const resultBytes = await contract.submitTransaction('CreateMedicineTransfer', responseId, updatedAt);
    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log('*** Transaction committed successfully');
    console.log('*** Result:', JSON.stringify(result, null, 2));
    return result;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function envOrDefault(key, defaultValue) {
    return process.env[key] || defaultValue;
}

function displayInputParameters() {
    console.log(`channelName:       ${channelName}`);
    console.log(`chaincodeName:     ${chaincodeName}`);
    console.log(`mspId:             ${mspId}`);
    console.log(`cryptoPath:        ${cryptoPath}`);
    console.log(`keyDirectoryPath:  ${keyDirectoryPath}`);
    console.log(`certDirectoryPath: ${certDirectoryPath}`);
    console.log(`tlsCertPath:       ${tlsCertPath}`);
    console.log(`peerEndpoint:      ${peerEndpoint}`);
    console.log(`peerHostAlias:     ${peerHostAlias}`);
}
