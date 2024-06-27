import { CloseCircleFilled } from '@ant-design/icons';
import { Alert, Select, Table, Tabs, Tag, Typography } from 'antd';
import React, { useContext, useEffect, useState } from 'react';

import { RpcError } from 'accumulate.js/lib/api_v3';

import { Network as NetworkCtx } from '../common/Network';
import { useAsyncEffect } from '../common/useAsync';

const { Title, Text } = Typography;

export default NetworkDashboard;

export function NetworkDashboard() {
  const [error, setError] = useState(null);
  const [peers, setPeers] = useState([]);
  const [peerStatus, setPeerStatus] = useState({});
  const [peersAreLoading, setPeersAreLoading] = useState(true);
  const [dynamicTabs, setDynamicTabs] = useState([
    <Tabs.TabPane tab="Directory" key="directory">
      Loading...
    </Tabs.TabPane>,
  ]);
  const [filter, setFilter] = useState<(_: any) => boolean>(() => () => true);

  const onError = (error) => {
    console.error(error);
    setError(`${error}`);
  };

  // Fetch network global variables, such as partitions and validators. This
  // changes extremely infrequently so loading this once is sufficient.
  const [network, setNetwork] = useState(null);
  const { api, network: apiNet } = useContext(NetworkCtx);
  useAsyncEffect(async (mounted) => {
    const { network } = await api.networkStatus();
    if (!mounted()) {
      return;
    }

    // Add a lower case ID
    for (const part of network.partitions) {
      (part as any).lcid = part.id.toLowerCase();
    }

    setNetwork(network);
  }, []).catch(onError);

  // Get the node info for all the nodes in the network
  useAsyncEffect(async (mounted) => {
    setPeersAreLoading(true);

    // Figure out what network we're talking to
    const { network } = await api.call('node-info', {});

    // Find all the nodes
    const peerIDs = await api.call('find-service', { network });

    // Get each node's info (with a batch request)
    const peers = [];
    const response = await api.call(
      peerIDs.map(({ peerID }) => ({
        method: 'node-info',
        params: { peerID },
      })),
    );
    for (const i in response) {
      const record = {
        ...peerIDs[i],
        data: {
          partitions: {},
          validator: {},
          services: [],
        },
      };
      peers.push(record);

      if (response[i] instanceof RpcError) {
        record.error = response[i];
        continue;
      } else {
        record.info = response[i];
      }

      for (const service of record.info.services) {
        switch (service.type) {
          case 'node':
          case 'ServiceType:61441':
            continue;
          default:
            record.data.services.push(service);
        }
      }

      // List which consensus networks it participates in. A given
      // node participates in zero or more consensus networks. An
      // API or bootstrap node does not participate in any whereas
      // most core nodes participate in the directory and a BVN.
      for (const service of record.info.services) {
        if (service.type === 'consensus') {
          record.data.partitions[service.argument.toLowerCase()] = null;
        }
      }
    }
    if (mounted()) {
      setPeers(peers);
      setPeersAreLoading(false);
    }
  }, [])
    .catch(onError)
    .finally(() => setPeersAreLoading(false));

  // Show a table for each partition
  useEffect(() => {
    const columns = [
      {
        title: 'Node',
        render: ({ peer, status, validator }) => (
          <div>
            <Text className="code">{status?.nodeKeyHash || peer.peerID}</Text>
            &nbsp;
            {validator?.active ? <Tag color="green">validator</Tag> : null}
          </div>
        ),
      },
      {
        title: 'Operator',
        dataIndex: ['validator', 'operator'],
      },
      {
        title: 'Version',
        dataIndex: ['status', 'version'],
      },
      {
        title: 'Height',
        dataIndex: ['status', 'lastBlock', 'height'],
      },
      {
        title: 'Time',
        dataIndex: ['status', 'lastBlock', 'time'],
      },
      {
        title: 'DN Anchor',
        dataIndex: ['status', 'lastBlock', 'directoryAnchorHeight'],
      },
      {
        title: 'Peers',
        dataIndex: ['status', 'peers', 'length'],
      },
    ];

    const load = async () => {
      try {
        // If the network info hasn't been loaded yet there's nothing to
        // do
        if (!network) return;

        // Put the Directory first
        const dir = network.partitions.find((x) => x.lcid === 'directory');
        const partitions = [dir].concat(
          network.partitions.filter((x) => x !== dir),
        );

        // Create a tab and a table for each partition
        setDynamicTabs(
          partitions.map((part) => {
            const entries = [];
            for (const peer of peers) {
              // Skip nodes that do not participate in this partition
              if (!(part.lcid in peer.data.partitions)) continue;

              // Retrieve partition-specific data to simplify the
              // columns
              const status = peer.data.partitions[part.lcid];
              const validator = peer.data.validator[part.lcid];

              entries.push({ peer, part, status, validator });
            }

            return (
              <Tabs.TabPane tab={part.id} key={part.lcid}>
                <Table
                  dataSource={entries.filter(({ peer, part }) =>
                    filter({ ...peer, part }),
                  )}
                  columns={columns}
                  rowKey={({ peer }) => peer.peerID}
                  loading={peersAreLoading}
                />
              </Tabs.TabPane>
            );
          }),
        );
      } catch (error) {
        onError(error);
      }
    };
    load();
  }, [
    peers,
    peersAreLoading,
    network,
    filter,
    peerStatus, // This ensures the table is updated when the statuses are updated
  ]);

  // Create a simple ticker
  const [time, setTime] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setTime(Date.now()), 2000);
    return () => clearInterval(interval);
  });

  // Update the node statuses
  useEffect(() => {
    const load = async () => {
      try {
        // Build a list of requests plus extra data we'll need later
        const requests = peers.flatMap((peer) =>
          Object.keys(peer.data.partitions).map((partition) => {
            const request = {
              method: 'consensus-status',
              params: { nodeID: peer.peerID, partition },
            };
            return { peer, partition, request };
          }),
        );

        // Send a batch request for all the nodes
        const response = await api.call(requests.map((x) => x.request) || []);

        // Unpack the responses
        const status = {};
        for (const i in requests) {
          const { peer, partition } = requests[i];
          if (!response[i]) {
            // TODO Add some indicator that there may be an issue
            continue;
          }

          // Record consensus status
          peer.data.partitions[partition] = response[i];
          status[`${peer.peerID}:${partition}`] =
            peer.data.partitions[partition];

          // Record validator info
          const validator = network.validators.find(
            (x) => x.publicKeyHash === response[i].validatorKeyHash,
          );
          if (validator) {
            const active = validator.partitions.some(
              (x) => x.active && x.id.toLowerCase() === partition,
            );
            peer.data.validator[partition] = { active, ...validator };
          }
        }
        setPeerStatus(status);
      } catch (error) {
        onError(error);
      }
    };

    load();
  }, [peers, time, network]);

  const didChangeSelector = (values) => {
    const fns = [];

    const validators = values?.includes('validators');
    const followers = values?.includes('followers');
    if (!(validators && followers)) {
      fns.push((peer) => {
        // Are we a validator on...
        const isVal = peer.part
          ? peer.data.validator[peer.part.lcid]?.active // The specified partition
          : Object.values(peer.data.validator).some((x: any) => x.active); // Any partition

        return (isVal && validators) || (!isVal && followers);
      });
    }

    if (values?.includes('errors')) {
      fns.push((peer) => peer.error);
    }

    setFilter(() => (peer) => {
      for (const fn of fns) if (!fn(peer)) return false;
      return true;
    });
  };

  const tabsExtra = (
    <Select
      mode="multiple"
      placeholder="Place select a value"
      defaultValue={['validators', 'followers']}
      onChange={didChangeSelector}
      style={{ minWidth: 150 }}
    >
      <Select.Option key="validators">Validators</Select.Option>
      <Select.Option key="followers">Followers</Select.Option>
      <Select.Option key="errors">Errors</Select.Option>
    </Select>
  );

  const allNodesColumns = [
    {
      title: 'ID',
      dataIndex: ['peerID'],
    },
    {
      title: '', // Status
      render: (peer) =>
        peer.error && <CloseCircleFilled className="node-error-icon" />,
    },
    {
      title: 'Services',
      dataIndex: ['data', 'services', 'length'],
    },
  ];

  const allNodesExpanded = (peer) => (
    <div>
      {peer.error && <pre>{peer.error.message}</pre>}
      {peer.info &&
        peer.data.services.map((service, index) => (
          <Tag color="blue" key={index}>
            {service.argument
              ? `${service.type}:${service.argument}`
              : service.type}
          </Tag>
        ))}
    </div>
  );

  const allNodes = (
    <Table
      dataSource={peers.filter((peer) => filter(peer))}
      columns={allNodesColumns}
      rowClassName={(peer) => `node-details ${peer.error && 'node-error'}`}
      rowKey="peerID"
      loading={peersAreLoading}
      expandable={{
        rowExpandable: (peer) => peer.error || peer.data.services.length > 0,
        expandedRowRender: allNodesExpanded,
      }}
    />
  );

  return (
    <div>
      <Title level={2} style={{ display: 'flex' }}>
        <span style={{ flex: 1 }}>Network</span>
      </Title>

      {error ? <Alert message={error} type="error" showIcon /> : null}

      <Tabs
        defaultActiveKey="directory"
        tabBarExtraContent={tabsExtra}
        children={dynamicTabs.concat([
          <Tabs.TabPane tab="All Nodes" key="all" children={allNodes} />,
        ])}
      />
    </div>
  );
}
