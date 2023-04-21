import axios from 'axios';
import { message } from 'antd';

export default async function getSupply(setSupply, setAPR) {
    setSupply(null);

    try {
        const response = await axios.get(process.env.REACT_APP_METRICS_API_PATH + "/supply");
        if (response && response.data) {
            setSupply(response.data);
        } else {
            throw new Error("Can not get ACME supply metrics");
        }
        const unissued = (Number(response.data.max) - Number(response.data.total)) / (10 ** 8);
        const rewards = unissued * 0.16 / 365 * 7;
        const rate = rewards / (response.data.staked / (10 ** 8));
        const apr = (1 + rate) ** 52 - 1;
        setAPR?.(apr);
    }
    catch (error) {
        setSupply(null);
        message.error(error.message);
    }
}
