import { restingPlace } from './scene-assets/resting-place.scene-asset.js';
import { AssetType, defineAssets } from '@iwsdk/core';
import { roomloomFirefly, roomloomGarden, roomloomMoth } from './scene-assets/roomloom.scene-asset.js';

const publicAssetUrl = (filePath: string): string =>
  `${import.meta.env.BASE_URL}${filePath.replace(/^\/+/, '')}`;

export default defineAssets({
  'attention': { url: publicAssetUrl('audio/attention.wav'), type: AssetType.Audio },
  'hop': { url: publicAssetUrl('audio/hop.wav'), type: AssetType.Audio },
  'arrival': { url: publicAssetUrl('audio/arrival.wav'), type: AssetType.Audio },
  'growth': { url: publicAssetUrl('audio/growth.wav'), type: AssetType.Audio },
  'roomloom-rest': restingPlace,
  'roomloom-garden': roomloomGarden,
  'roomloom-firefly': roomloomFirefly,
  'roomloom-moth': roomloomMoth,
  'roomloom-panel': {
    url: publicAssetUrl('ui/roomloom.uikitml'),
    type: AssetType.UIKitML,
    name: 'Roomloom Panel',
  },
});
