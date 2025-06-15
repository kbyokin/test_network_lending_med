#!/bin/bash

# Stop and remove peer and orderer containers
docker stop peer0.hospitalb.example.com orderer.example.com peer0.hospitala.example.com
docker rm peer0.hospitalb.example.com orderer.example.com peer0.hospitala.example.com

# If rm_db argument is provided, stop and remove database containers
if [ "$1" = "rm_db" ]; then
    echo "Removing database containers and volumes..."
    docker stop couchdb-peer0-hospitalb couchdb-peer0-hospitala
    docker rm couchdb-peer0-hospitalb couchdb-peer0-hospitala
    docker volume rm compose_couchdb-peer0-hospitalb compose_couchdb-peer0-hospitala
fi

rm -rf organizations channel-artifacts

docker volume prune -f
docker volume ls
docker volume rm compose_orderer.example.com compose_peer0.hospitala.example.com compose_peer0.hospitalb.example.com