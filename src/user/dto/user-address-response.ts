export interface UserAddressResponse {
  addressId: number;
  label: string;
  address: string;
  addressDetail: string | null;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

export interface UserAddressListResponse {
  addresses: UserAddressResponse[];
}

export interface DeleteUserAddressResponse {
  addressId: number;
}
