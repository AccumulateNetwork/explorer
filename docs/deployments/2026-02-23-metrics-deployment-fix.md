# Deployment Report: Metrics Service Deployment Fix

**Date**: February 23, 2026
**Server**: dal-server1
**Service**: accumulate-metrics
**URL**: https://metrics.accumulatenetwork.io

## Problem

The initial deployment attempt failed with:
```
chown: invalid user: 'paul:paul'
```

This occurred because the deploy script used the local `$USER` environment variable which didn't correspond to a user on dal-server1.

## Root Cause

1. The deploy script tried to `chown` using `$USER:$USER` which expanded to "paul:paul" locally
2. No user named "paul" exists on dal-server1
3. The systemd service was configured to run as user "accumulate" which didn't exist
4. Exit code 217/USER from systemd indicated missing user

## Solution

Updated `metrics-service/deploy.sh` to:

1. **Create system user**: Automatically create "accumulate" user if it doesn't exist
   ```bash
   ssh $SERVER "id accumulate >/dev/null 2>&1 || sudo useradd -r -s /bin/false -d $DEPLOY_DIR accumulate"
   ```

2. **Use /tmp for file transfer**: Copy files to /tmp first, then move with sudo
   ```bash
   scp metrics-service $SERVER:/tmp/metrics-service-new
   ssh $SERVER "sudo mv /tmp/metrics-service-new $DEPLOY_DIR/metrics-service"
   ```

3. **Set proper ownership**: Ensure all files are owned by accumulate user
   ```bash
   sudo chown -R accumulate:accumulate $DEPLOY_DIR
   ```

## Deployment Steps Executed

1. Fixed deploy.sh script
2. Created accumulate system user on dal-server1
3. Deployed service binary and configuration
4. Started systemd service
5. Verified endpoints

## Verification

All endpoints tested and confirmed working:

```bash
# Health check
curl https://metrics.accumulatenetwork.io/health
{"status":"healthy","time":"2026-02-23T06:59:08Z"}

# Supply metrics
curl https://metrics.accumulatenetwork.io/v1/supply
{"max":50000000000000000,"total":32567998467211002,"circulating":26054398773768802,"circulatingTokens":26054398773768802,"staked":6513599693442200}

# Timestamp query
curl https://metrics.accumulatenetwork.io/v1/timestamp/a46534924b17040b9bbc6098e42be6629202181283e397e3fd770ff5be1e5ee6
{"chains":[{"chain":"signature","block":18745449,"time":"2026-02-21T19:22:52Z"}],"status":"delivered","minorBlock":18745449,"majorBlock":2310}
```

## Service Status

```
● accumulate-metrics.service - Accumulate Metrics API
     Loaded: loaded (/etc/systemd/system/accumulate-metrics.service; enabled)
     Active: active (running) since Mon 2026-02-23 06:58:42 UTC
   Main PID: 2488043 (metrics-service)
```

Service is running as user "accumulate" (uid=998, gid=998)

## Files Modified

- `metrics-service/deploy.sh` - Fixed deployment script with proper user creation and file handling

## Commit

```
f84afef fix: Improve deployment script for dal-server1
```

## Notes

- Future deployments will automatically handle user creation
- LevelDB cache persists in `/opt/accumulate-metrics/data/`
- Service restarts automatically on failure (RestartSec=10)
- Logs available via: `ssh dal-server1 sudo journalctl -u accumulate-metrics -f`
