import fetch from 'node-fetch';
import { ActivityTypes } from 'discord.js/typings/enums';
import { Client, MessageEmbed } from 'discord.js';

const getCollectionStats = async () => {
  const settings = {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-API-KEY': process.env.OPEN_SEA_API_KEY!,
    },
  };
  const url = `https://api.opensea.io/api/v1/collection/${process.env.OPEN_SEA_COLLECTION_NAME}/stats`;

  const res = await fetch(url, settings);

  if (res.status === 404 || res.status === 400) {
    throw new Error('Error retrieving collection stats');
  }

  if (res.status !== 200) {
    throw new Error(`Couldn't retrieve metadata: ${res.statusText}`);
  }

  const data = await res.json();

  return {
    tradedVolume: (data.stats.total_volume / 1000).toFixed(1),
    floorPrice: data.stats.floor_price.toFixed(1),
  };
};

const getCollectionEvents = async () => {
  const settings = {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-API-KEY': process.env.OPEN_SEA_API_KEY!,
    },
  };
  const url: string = `https://api.opensea.io/api/v1/events?only_opensea=false&collection_slug=${process.env.OPEN_SEA_COLLECTION_NAME}&event_type=successful&limit=50`;

  const res = await fetch(url, settings);

  if (res.status !== 200) {
    throw new Error(`Couldn't retrieve events: ${res.statusText}`);
  }

  const data = await res.json();

  return data.asset_events ? data.asset_events : [];
};

export const showCollectionStats = async (client: Client) => {
  try {
    console.log(`fetch collection stats - ${Date.now()}`);
    const { floorPrice, tradedVolume } = await getCollectionStats();
    client.user!.setActivity(`FL: ${floorPrice} - VOL: ${tradedVolume}K`, {
      type: ActivityTypes.WATCHING,
    });
  } catch (err) {
    console.log(err);
  }
};

export const showEvents = async (client: Client, salesCache: string[]) => {
  try {
    console.log(`fetch events - ${Date.now()}`);
    const data = await getCollectionEvents();

    data.forEach(function (event: any) {
      if (event.asset) {
        if (salesCache.includes(event.id)) {
          return;
        } else {
          salesCache.push(event.id);
          if (salesCache.length > 200) salesCache.shift();
        }

        const embedMsg = new MessageEmbed()
          .setColor('#0099ff')
          .setTitle(event.asset.name)
          .setURL(event.asset.permalink)
          .setDescription(`has just been sold for ${event.total_price / 1e18}\u039E`)
          .setThumbnail(event.asset.image_url)
          .addField(
            'From',
            `[${event.seller.user?.username || event.seller.address.slice(0, 8)}](https://etherscan.io/address/${
              event.seller.address
            })`,
            true,
          )
          .addField(
            'To',
            `[${
              event.winner_account.user?.username || event.winner_account.address.slice(0, 8)
            }](https://etherscan.io/address/${event.winner_account.address})`,
            true,
          );

        client.channels
          .fetch(process.env.DISCORD_SALES_CHANNEL_ID!)
          .then((channel) => {
            // @ts-ignore
            channel.send({ embeds: [embedMsg] });
          })
          .catch((err) => console.log(err));
      }
    });
  } catch (err) {
    console.log(err);
  }
};
