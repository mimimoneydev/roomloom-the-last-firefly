import { AssetType, defineAssets } from '@iwsdk/core';
import { roomloomFirefly, roomloomGarden } from './scene-assets/roomloom.scene-asset.js';

const publicAssetUrl = (filePath: string): string =>
  `${import.meta.env.BASE_URL}${filePath.replace(/^\/+/, '')}`;

export default defineAssets({
  'roomloom-garden': roomloomGarden,
  'roomloom-firefly': roomloomFirefly,
  'roomloom-panel': {
    url: publicAssetUrl('ui/roomloom.uikitml'),
    type: AssetType.UIKitML,
    name: 'Roomloom Panel',
  },
});
