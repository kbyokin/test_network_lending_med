#!/bin/bash
export PATH=${PWD}/bin:$PATH
export FABRIC_CFG_PATH=${PWD}/config

# Generate crypto material
cryptogen generate --config=./config/crypto-config.yaml

# Bring up network
docker compose -f compose/compose-test-net.yaml -f compose/docker/docker-compose-test-net.yaml up -d

# Create channel genesis block
configtxgen -profile ChannelUsingRaft -channelID system-channel -outputBlock ./channel-artifacts/genesis.block

# Channel creation
osnadmin channel join --channelID system-channel --config-block channel-artifacts/genesis.block -o localhost:7053 --ca-file crypto-config/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem  --client-cert crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.crt --client-key crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.key

# # Generate channel configuration transaction
# configtxgen -profile TwoOrgsChannel -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID mychannel

# # Generate anchor peer transactions
# configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org1MSPanchors.tx -channelID mychannel -asOrg Org1MSP
# configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org2MSPanchors.tx -channelID mychannel -asOrg Org2MSP