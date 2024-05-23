import axios from "axios";
import {
    message
  } from 'antd';
  
export default async function getTs(hash, setTs, setBlock, predicate) {
    setTs(null);
    setBlock(null);

    try {
        const response = await axios.get(`${import.meta.env.VITE_APP_API_PATH}/timestamp/${hash}@unknown`);
        if (response?.data) {
            // Filter entries
            let entries = response.data.chains || [];
            if (predicate) {
                entries = entries.filter(predicate);
            }

            // Sort by age ascending
            entries.sort((a, b) => b.block - a.block);

            // Use the youngest entry
            if (entries.length && entries[0].block && entries[0].time) {
                setTs(entries[0].time);
                setBlock(entries[0].block);
            } else {
                setTs(0);
                setBlock(0);
            }
        } else {
            throw new Error("Can not get data from timestamp server");
        }
    }
    catch (error) {
        if (error.message === "Request failed with status code 404") {
            setTs(0);
            setBlock(0);
            return;
        }
        setTs(null);
        setBlock(null);
        message.error(error.message);
    }

}