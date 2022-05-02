import fetch from 'node-fetch';
import { ActivityTypes } from 'discord.js/typings/enums';
import { Client, MessageEmbed } from 'discord.js';

const requestOptions: { [p: string]: string } = {
  method: 'GET',
  redirect: 'follow',
};

const baseURL = 'https://api-mainnet.magiceden.dev/v2';

// Get stats of a collection
const getCollectionStats = async () => {
  const url = `${baseURL}/collections/${process.env.MAGICEDEN_COLLECTION_SYMBOL}/stats`;
  const res = await fetch(url, requestOptions);

  if (res.status !== 200) {
    throw new Error(`Couldn't retrieve collection stats: ${res.statusText}`);
  }

  const dataStr = await res.text();
  const data = await JSON.parse(dataStr);

  return {
    tradedVolume: (data.volumeAll / 1e9).toFixed(2),
    floorPrice: (data.floorPrice / 1e9).toFixed(2),
  };
};

// Get activities of a collection
const getCollectionActivities = async () => {
  const url = `${baseURL}/collections/${process.env.MAGICEDEN_COLLECTION_SYMBOL}/activities?offset=0&limit=100`;
  const res = await fetch(url, requestOptions);

  if (res.status !== 200) {
    throw new Error(`Couldn't retrieve collection activities: ${res.statusText}`);
  }

  const dataStr = await res.text();
  const data = await JSON.parse(dataStr);

  const sales: any[] = [];
  data.forEach((activity: any) => {
    if (activity.type === 'buyNow') {
      sales.push(activity);
    }
  });

  return sales;
};

// Get information of a token / NFT
const getTokenInfo = async (tokenMint: string) => {
  const url = `${baseURL}//tokens/${tokenMint}`;
  const res = await fetch(url, requestOptions);

  if (res.status !== 200) {
    throw new Error(`Couldn't retrieve token information: ${res.statusText}`);
  }

  const dataStr = await res.text();

  return await JSON.parse(dataStr);
};

export const showCollectionStats = async (client: Client) => {
  try {
    console.log(`fetch collection stats - ${Date.now()}`);
    const { floorPrice, tradedVolume } = await getCollectionStats();
    client.user!.setActivity(`FL: ${floorPrice} - VOL: ${tradedVolume}`, {
      type: ActivityTypes.WATCHING,
    });
  } catch (err) {
    console.log(err);
  }
};

export const showEvents = async (client: Client, salesCache: number[]) => {
  try {
    console.log(`fetch collection activities - ${Date.now()}`);
    const activities = await getCollectionActivities();

    activities.map(async (act) => {
      if (salesCache.includes(act.slot)) {
        return;
      } else {
        salesCache.push(act.slot);
        if (salesCache.length > 200) salesCache.shift();
      }

      const tokenInfo: any = await getTokenInfo(act.tokenMint);

      const embedMsg = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle(tokenInfo.name)
        .setURL(`https://magiceden.io/item-details/${act.tokenMint}`)
        .setDescription(`has just been sold for ${act.price}\u039E`)
        .setThumbnail(tokenInfo.image)
        .addField('From', `[${act.seller.slice(0, 8)}](https://etherscan.io/address/${act.seller})`, true)
        .addField('To', `[${act.buyer.slice(0, 8)}](https://etherscan.io/address/${act.buyer})`, true);

      client.channels
        .fetch(process.env.DISCORD_SALES_CHANNEL_ID!)
        .then((channel) => {
          // @ts-ignore
          channel.send({ embeds: [embedMsg] });
        })
        .catch((err) => console.log(err));
    });
  } catch (err) {
    console.log(err);
  }
};
