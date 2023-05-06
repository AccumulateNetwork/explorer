import React, { useState, useEffect } from 'react';

import {
    Typography, Table, Tag, Tabs, Alert, List
} from 'antd';

import RPC from './../common/RPC';

const { Title } = Typography;

const Network = () => {
    const [error, setError] = useState(null);
    const [peers, setPeers] = useState([]);
    const [peerStatus, setPeerStatus] = useState({});
    const [peersAreLoading, setPeersAreLoading] = useState(true);
    const [dynamicTabs, setDynamicTabs] = useState([
        <Tabs.TabPane tab="Directory" key="directory">
            Loading...
        </Tabs.TabPane>
    ]);

    // Fetch network global variables, such as partitions and validators. This
    // changes extremely infrequently so loading this once is sufficient.
    const [network, setNetwork] = useState(null);
    useEffect(() => {
        const load = async () => {
            try {
                const { network } = await RPC.request('network-status', {}, 'v3');

                // Add a lower case ID
                for (const part of network.partitions) {
                    part.lcid = part.id.toLowerCase()
                }

                setNetwork(network);
            } catch (error) {
                setError(error.message);
            }
        }
        load();
    }, []);

    // Get the node info for all the nodes in the network
    useEffect(() => {
        const load = async () => {
            try {
                setPeersAreLoading(true);

                // Figure out what network we're talking to
                const { network } = await RPC.request('node-info', {}, 'v3');

                // Find all the nodes
                const peerIDs = await RPC.request('find-service', { network }, 'v3');

                // Get each node's info (with a batch request)
                const peers = [];
                for (const peer of await RPC.batchRequest(peerIDs.map(({ peerID }) => ({ method: 'node-info', params: { peerID } })), 'v3')) {
                    const data = {};
                    peers.push({ info: peer, data });

                    // List which consensus networks it participates in. A given
                    // node participates in zero or more consensus networks. An
                    // API or bootstrap node does not participate in any whereas
                    // most core nodes participate in the directory and a BVN.
                    data.partitions = {};
                    for (const service of peer.services) {
                        if (service.type === 'consensus') {
                            data.partitions[service.argument.toLowerCase()] = null
                        }
                    }
                }
                setPeers(peers);
                setPeersAreLoading(false);
            } catch (error) {
                debugger
                setError(error.message);
            }
        }
        load();
    }, []);

    // Show a table for each partition
    useEffect(() => {
        // withStatus collects various bits used by column renderers, to reduce
        // code duplication
        const withStatus = (fn) => ({ peer, part, ...rest }) => {
            const status = peer.data.partitions[part.lcid];
            const validator = status && network.validators.find(x => x.publicKeyHash === status.validatorKeyHash);
            return fn({ peer, part, status, validator, ...rest });
        }

        const colums = [
            {
                title: 'Node',
                render: withStatus(({ peer, status }) => (
                    <span>{status?.nodeKeyHash || peer.info.peerID}</span>
                ))
            },
            {
                title: 'Operator',
                render: withStatus(({ validator }) => (
                    <span>{validator?.operator}</span>
                ))
            },
            {
                title: "Height",
                render: withStatus(({ status }) => (
                    <span>{status?.lastBlock.height}</span>
                ))
            },
            {
                title: "Time",
                render: withStatus(({ status }) => (
                    <span>{status?.lastBlock.time}</span>
                ))
            },
            {
                title: "DN Anchor",
                render: withStatus(({ status }) => (
                    <span>{status?.lastBlock.directoryAnchorHeight}</span>
                ))
            },
            {
                title: "Peers",
                render: withStatus(({ status }) => (
                    <span>{status?.peers.length}</span>
                ))
            },
        ]

        const load = async () => {
            try {
                // If the network info hasn't been loaded yet there's nothing to
                // do
                if (!network) return;

                // Put the Directory first
                const dir = network.partitions.find(x => x.lcid === 'directory')
                const partitions = [dir].concat(network.partitions.filter(x => x !== dir));

                // Create a tab and a table for each partition
                setDynamicTabs(partitions.map(part =>
                    <Tabs.TabPane tab={part.id} key={part.lcid}>
                        <Table
                            dataSource={peers.filter(x => part.lcid in x.data.partitions).map(peer => ({ peer, part }))}
                            columns={colums}
                            rowKey="peerID"
                            loading={peersAreLoading}
                        />
                    </Tabs.TabPane>
                ));
            } catch (error) {
                debugger
                setError(error.message);
            }
        }
        load();
    }, [
        peers,
        peersAreLoading,
        network,
        peerStatus, // This ensures the table is updated when the statuses are updated
    ])

    // Create a simple ticker
    const [time, setTime] = useState(Date.now())
    useEffect(() => {
        const interval = setInterval(() => setTime(Date.now()), 2000);
        return () => clearInterval(interval);
    })

    // Update the node statuses
    useEffect(() => {
        const load = async () => {
            try {
                // Build a list of requests plus extra data we'll need later
                const requests = peers.flatMap(peer => Object.keys(peer.data.partitions).map(partition => {
                    const request = { method: 'consensus-status', params: { nodeID: peer.info.peerID, partition } }
                    return { peer, partition, request }
                }))

                // Send a batch request for all the nodes
                const response = await RPC.batchRequest(requests.map(x => x.request), 'v3');

                // Unpack the responses
                const status = {};
                for (const i in requests) {
                    const { peer, partition } = requests[i];
                    peer.data.partitions[partition] = response[i];
                    status[`${peer.info.peerID}:${partition}`] = peer.data.partitions[partition];
                }
                setPeerStatus(status);
            } catch (error) {
                debugger
                setError(error.message);
            }
        }

        load();
    }, [peers, time])

    return (
        <div>
            <Title level={2} style={{ display: 'flex' }}>
                <span style={{ flex: 1 }}>Network</span>
            </Title>

            {error ? <Alert message={error} type="error" showIcon /> : null}

            <Tabs defaultActiveKey="directory" children={dynamicTabs.concat([
                <Tabs.TabPane tab="Services" key="all">
                    <List
                        dataSource={peers}
                        renderItem={peer => {
                            const parts = [
                                <span>{peer.info.peerID}</span>,
                            ]
                            for (const service of peer.info.services) {
                                switch (service.type) {
                                    case 'node':
                                    case 'ServiceType:61441':
                                        continue;
                                    default: // Ok
                                }
                                parts.push(
                                    <Tag color="blue">{service.argument ? `${service.type}:${service.argument}` : service.type}</Tag>
                                )
                            }
                            return <List.Item key={peer.info.peerID}><div>{parts}</div></List.Item>
                        }}
                    />
                </Tabs.TabPane>
            ])} />
        </div>
    )
}

export default Network;
