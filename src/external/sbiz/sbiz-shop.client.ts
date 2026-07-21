import { ShopDataProviderError } from '../../shop/errors/shop.error';

const DEFAULT_BASE_URL = 'https://apis.data.go.kr/B553077/api/open/sdsc2';

interface SbizHeader {
  resultCode?: string;
  resultMsg?: string;
}

export interface SbizShopItem {
  bizesId?: string;
  bizesNm?: string;
  indsSclsCd?: string;
  indsSclsNm?: string;
  ctprvnCd?: string;
  ctprvnNm?: string;
  signguCd?: string;
  signguNm?: string;
  adongCd?: string;
  adongNm?: string;
  lnoAdr?: string;
  rdnmAdr?: string;
  lon?: string;
  lat?: string;
}

interface SbizResponseBody {
  body?: {
    items?: SbizShopItem[] | { item?: SbizShopItem | SbizShopItem[] };
    totalCount?: number | string;
  };
  header?: SbizHeader;
}

interface SbizShopResponse extends SbizResponseBody {
  response?: SbizResponseBody;
}

export interface SbizShopPage {
  items: SbizShopItem[];
  totalCount: number;
}

export interface SbizShopClient {
  getShopsByIndustry(industryCode: string, pageNo: number, pageSize: number): Promise<SbizShopPage>;
}

export class HttpSbizShopClient implements SbizShopClient {
  private readonly serviceKey: string;
  private readonly baseUrl: string;

  constructor(serviceKey = process.env.SBIZ_SERVICE_KEY, baseUrl = process.env.SBIZ_API_BASE_URL) {
    if (!serviceKey) {
      throw new ShopDataProviderError({ reason: 'SBIZ_SERVICE_KEY is not set' });
    }

    this.serviceKey = serviceKey;
    this.baseUrl = baseUrl ?? DEFAULT_BASE_URL;
  }

  async getShopsByIndustry(
    industryCode: string,
    pageNo: number,
    pageSize: number,
  ): Promise<SbizShopPage> {
    const url = new URL(`${this.baseUrl}/storeListInUpjong`);
    url.searchParams.set('serviceKey', this.serviceKey);
    url.searchParams.set('divId', 'indsSclsCd');
    url.searchParams.set('key', industryCode);
    url.searchParams.set('pageNo', String(pageNo));
    url.searchParams.set('numOfRows', String(pageSize));
    url.searchParams.set('type', 'json');

    let response: Response;
    try {
      response = await fetch(url);
    } catch (error) {
      throw new ShopDataProviderError({ reason: 'network_error', cause: String(error) });
    }

    if (!response.ok) {
      throw new ShopDataProviderError({ status: response.status });
    }

    let payload: SbizShopResponse;
    try {
      payload = (await response.json()) as SbizShopResponse;
    } catch {
      throw new ShopDataProviderError({ reason: 'invalid_json' });
    }

    const apiResponse = payload.response ?? payload;

    if (apiResponse.header?.resultCode && apiResponse.header.resultCode !== '00') {
      throw new ShopDataProviderError({
        resultCode: apiResponse.header.resultCode,
        resultMessage: apiResponse.header.resultMsg,
      });
    }

    return {
      items: this.normalizeItems(apiResponse.body?.items),
      totalCount: Number(apiResponse.body?.totalCount ?? 0),
    };
  }

  private normalizeItems(
    items: SbizShopItem[] | { item?: SbizShopItem | SbizShopItem[] } | undefined,
  ): SbizShopItem[] {
    if (Array.isArray(items)) {
      return items as SbizShopItem[];
    }

    if (typeof items !== 'object' || items === null || !('item' in items)) {
      return [];
    }

    const item = (items as { item?: SbizShopItem | SbizShopItem[] }).item;
    return item ? (Array.isArray(item) ? item : [item]) : [];
  }
}
