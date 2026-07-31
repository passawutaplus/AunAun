declare module "thai-address-database" {
  export type AddressObject = {
    district: string;
    amphoe: string;
    province: string;
    zipcode: number | string;
  };

  export function searchAddressByProvince(
    searchStr: string,
    maxResult?: number,
  ): AddressObject[];
  export function searchAddressByAmphoe(
    searchStr: string,
    maxResult?: number,
  ): AddressObject[];
  export function searchAddressByDistrict(
    searchStr: string,
    maxResult?: number,
  ): AddressObject[];
  export function searchAddressByZipcode(
    searchStr: string | number,
    maxResult?: number,
  ): AddressObject[];
}
