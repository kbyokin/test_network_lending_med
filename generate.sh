#!/bin/bash
export PATH=${PWD}/bin:$PATH
export FABRIC_CFG_PATH=${PWD}/config

# Generate crypto material
cryptogen generate --config=./config/crypto-config.yaml --output="organizations"

# Bring up network
docker compose -f compose/compose-test-net.yaml -f compose/docker/docker-compose-test-net.yaml up -d

export FABRIC_CFG_PATH=${PWD}/configtx

export ORDERER_CA=crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
export ORDERER_ADMIN_TLS_SIGN_CERT=crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.crt
export ORDERER_ADMIN_TLS_PRIVATE_KEY=crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.key

# Create channel genesis block
configtxgen -profile ChannelUsingRaft -channelID system-channel -outputBlock ./channel-artifacts/genesis.block

# Channel creation
osnadmin channel join --channelID system-channel --config-block channel-artifacts/genesis.block -o localhost:7053 --ca-file "$ORDERER_CA"  --client-cert "$ORDERER_ADMIN_TLS_SIGN_CERT" --client-key "$ORDERER_ADMIN_TLS_PRIVATE_KEY"

# View detail channel status
# osnadmin channel list --channelID system-channel -o localhost:7053 --ca-file crypto-config/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem  --client-cert crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.crt --client-key crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.key

# # Add organizations to the channel
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=hospitalaMSP
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/hospitala.example.com/peers/peer0.hospitala.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/hospitala.example.com/users/Admin@hospitala.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

peer channel join -b ./channel-artifacts/genesis.block

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=hospitalbMSP
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/hospitalb.example.com/peers/peer0.hospitalb.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/hospitalb.example.com/users/Admin@hospitalb.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051

peer channel join -b ./channel-artifacts/genesis.block

# # Generate channel configuration transaction
# configtxgen -profile TwoOrgsChannel -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID mychannel

# # Generate anchor peer transactions
# configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org1MSPanchors.tx -channelID mychannel -asOrg Org1MSP
# configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org2MSPanchors.tx -channelID mychannel -asOrg Org2MSP