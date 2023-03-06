import axios from "axios";
import {
    message
  } from 'antd';
  
export default async function getTs(hash, setTs, setBlock) {
    setTs(null);
    setBlock(null);

    try {
        const response = await axios.get(process.env.REACT_APP_TS_API_PATH + "?hash=" + hash);
        if (response && response.data && response.data.result) {
            if (response.data.result[0] && response.data.result[0].localBlockTime && response.data.result[0].localBlock) {
                setTs(response.data.result[0].localBlockTime);
                setBlock(response.data.result[0].localBlock);
            } else {
                setTs(0);
                setBlock(0);
            }
        } else {
            throw new Error("Can not get data from timestamp server");
        }
    }
    catch (error) {
        setTs(null);
        setBlock(null);
        message.error(error.message);
    }

}