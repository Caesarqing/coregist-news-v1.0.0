export type { NewsDataItem as NewsItem } from '~/features/news-data/model';
export { getDayDiff } from '~/features/news-data/model';
export { newsDataMock } from '~/features/news-data/mock';
export {
  NEWS_DATA_ITEMS_STORAGE_KEY,
  NEWS_MY_SPACE_STORAGE_KEY,
  getMySpaceIds,
  setMySpaceIds,
  getNewsDataItems,
  setNewsDataItems,
} from '~/features/news-data/storage';
