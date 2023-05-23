import React, { useState, useEffect } from 'react';

import {
    Typography, Table, Tag, Tabs, Alert, Collapse
} from 'antd';

import {
    CloseCircleFilled
} from '@ant-design/icons';

import RPC, { RPCError } from './../common/RPC';

const { Title, Text } = Typography;

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
                const response = await RPC.rawRequest(peerIDs.map(({ peerID }) => ({ method: 'node-info', params: { peerID } })), 'v3')
                for (const i in response) {
                    const record = {
                        ...peerIDs[i],
                        data: {
                            partitions: {},
                        },
                    };
                    peers.push(record);

                    if (response[i] instanceof RPCError) {
                        record.error = response[i];
                        continue;
                    } else {
                        record.info = response[i];
                    }

                    // List which consensus networks it participates in. A given
                    // node participates in zero or more consensus networks. An
                    // API or bootstrap node does not participate in any whereas
                    // most core nodes participate in the directory and a BVN.
                    for (const service of record.info.services) {
                        if (service.type === 'consensus') {
                            record.data.partitions[service.argument.toLowerCase()] = null
                        }
                    }
                }
                setPeers(peers);
                setPeersAreLoading(false);
            } catch (error) {
                setError(error.message);
            }
        }
        load();
    }, []);

    // Show a table for each partition
    useEffect(() => {
        const columns = [
            {
                title: 'Node',
                render: ({ peer, status, validator }) => (
                    <div>
                        <Text className="code">{status?.nodeKeyHash || peer.peerID}</Text>&nbsp;
                        {validator?.active ? <Tag color="green">validator</Tag> : null}
                    </div>
                )
            },
            {
                title: 'Operator',
                dataIndex: ['validator', 'operator'],
            },
            {
                title: "Version",
                dataIndex: ['status', 'version'],
            },
            {
                title: "Height",
                dataIndex: ['status', 'lastBlock', 'height'],
            },
            {
                title: "Time",
                dataIndex: ['status', 'lastBlock', 'time'],
            },
            {
                title: "DN Anchor",
                dataIndex: ['status', 'lastBlock', 'directoryAnchorHeight'],
            },
            {
                title: "Peers",
                dataIndex: ['status', 'peers', 'length'],
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
                setDynamicTabs(partitions.map(part => {
                    const entries = [];
                    for (const peer of peers) {
                        // Skip nodes that do not participate in this partition
                        if (!(part.lcid in peer.data.partitions)) continue;

                        // Retrieve partition-specific data to simplify the
                        // columns
                        const status = peer.data.partitions[part.lcid];
                        let validator = status && network.validators.find(x => x.publicKeyHash === status.validatorKeyHash);
                        if (validator) {
                            const active = validator.partitions.some(x => x.active && x.id.toLowerCase() === part.lcid)
                            validator = { active, ...validator };
                        }
                        entries.push({ peer, part, status, validator });
                    }

                    return (
                        <Tabs.TabPane tab={part.id} key={part.lcid}>
                            <Table
                                dataSource={entries}
                                columns={columns}
                                rowKey={({ peer }) => peer.peerID}
                                loading={peersAreLoading}
                            />
                        </Tabs.TabPane>
                    )
                }));
            } catch (error) {
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
                    const request = { method: 'consensus-status', params: { nodeID: peer.peerID, partition } }
                    return { peer, partition, request }
                }))

                // Send a batch request for all the nodes
                const response = await RPC.batchRequest(requests.map(x => x.request), 'v3');

                // Unpack the responses
                const status = {};
                for (const i in requests) {
                    const { peer, partition } = requests[i];
                    if (!response[i]) {
                        // TODO Add some indicator that there may be an issue
                        continue;
                    }

                    peer.data.partitions[partition] = response[i];
                    status[`${peer.peerID}:${partition}`] = peer.data.partitions[partition];
                }
                setPeerStatus(status);
            } catch (error) {
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
                <Tabs.TabPane tab="All Nodes" key="all">
                    <Collapse>{peers.map(peer =>
                        <Collapse.Panel
                            className={`node-details ${peer.error && "node-error"}`}
                            key={peer.peerID}
                            header={peer.error ? <span><CloseCircleFilled className="node-error-icon" /> {peer.peerID}</span> : <span>{peer.peerID}</span>}
                            >
                            {peer.error && <pre>{peer.error.message}</pre>}
                            {peer.info && peer.info.services.filter(service => {
                                switch (service.type) {
                                    case 'node':
                                    case 'ServiceType:61441':
                                        return false;
                                    default:
                                        return true;
                                }
                            }).map(service =>
                                <Tag color="blue">{service.argument ? `${service.type}:${service.argument}` : service.type}</Tag>
                            )}
                        </Collapse.Panel>
                    )}</Collapse>
                </Tabs.TabPane>
            ])} />
        </div>
    )
}

export default Network;
