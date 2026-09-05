export type PhoneCountry = {
  iso: string;
  dial: string;
  name: string;
};

/** ITU calling codes used by hiring contact phones. Thailand stays first. */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: "TH", dial: "66", name: "ไทย" },
  { iso: "LA", dial: "856", name: "ลาว" },
  { iso: "KH", dial: "855", name: "กัมพูชา" },
  { iso: "MM", dial: "95", name: "เมียนมา" },
  { iso: "VN", dial: "84", name: "เวียดนาม" },
  { iso: "MY", dial: "60", name: "มาเลเซีย" },
  { iso: "SG", dial: "65", name: "สิงคโปร์" },
  { iso: "ID", dial: "62", name: "อินโดนีเซีย" },
  { iso: "PH", dial: "63", name: "ฟิลิปปินส์" },
  { iso: "BN", dial: "673", name: "บรูไน" },
  { iso: "JP", dial: "81", name: "ญี่ปุ่น" },
  { iso: "KR", dial: "82", name: "เกาหลีใต้" },
  { iso: "CN", dial: "86", name: "จีน" },
  { iso: "HK", dial: "852", name: "ฮ่องกง" },
  { iso: "MO", dial: "853", name: "มาเก๊า" },
  { iso: "TW", dial: "886", name: "ไต้หวัน" },
  { iso: "IN", dial: "91", name: "อินเดีย" },
  { iso: "BD", dial: "880", name: "บังกลาเทศ" },
  { iso: "PK", dial: "92", name: "ปากีสถาน" },
  { iso: "LK", dial: "94", name: "ศรีลังกา" },
  { iso: "NP", dial: "977", name: "เนปาล" },
  { iso: "AU", dial: "61", name: "ออสเตรเลีย" },
  { iso: "NZ", dial: "64", name: "นิวซีแลนด์" },
  { iso: "US", dial: "1", name: "สหรัฐอเมริกา" },
  { iso: "CA", dial: "1", name: "แคนาดา" },
  { iso: "MX", dial: "52", name: "เม็กซิโก" },
  { iso: "BR", dial: "55", name: "บราซิล" },
  { iso: "GB", dial: "44", name: "สหราชอาณาจักร" },
  { iso: "IE", dial: "353", name: "ไอร์แลนด์" },
  { iso: "DE", dial: "49", name: "เยอรมนี" },
  { iso: "FR", dial: "33", name: "ฝรั่งเศส" },
  { iso: "IT", dial: "39", name: "อิตาลี" },
  { iso: "ES", dial: "34", name: "สเปน" },
  { iso: "NL", dial: "31", name: "เนเธอร์แลนด์" },
  { iso: "BE", dial: "32", name: "เบลเยียม" },
  { iso: "CH", dial: "41", name: "สวิตเซอร์แลนด์" },
  { iso: "AT", dial: "43", name: "ออสเตรีย" },
  { iso: "SE", dial: "46", name: "สวีเดน" },
  { iso: "NO", dial: "47", name: "นอร์เวย์" },
  { iso: "DK", dial: "45", name: "เดนมาร์ก" },
  { iso: "FI", dial: "358", name: "ฟินแลนด์" },
  { iso: "PT", dial: "351", name: "โปรตุเกส" },
  { iso: "PL", dial: "48", name: "โปแลนด์" },
  { iso: "CZ", dial: "420", name: "เช็กเกีย" },
  { iso: "RU", dial: "7", name: "รัสเซีย" },
  { iso: "TR", dial: "90", name: "ตุรกี" },
  { iso: "AE", dial: "971", name: "สหรัฐอาหรับเอมิเรตส์" },
  { iso: "SA", dial: "966", name: "ซาอุดีอาระเบีย" },
  { iso: "QA", dial: "974", name: "กาตาร์" },
  { iso: "IL", dial: "972", name: "อิสราเอล" },
  { iso: "ZA", dial: "27", name: "แอฟริกาใต้" },
  { iso: "EG", dial: "20", name: "อียิปต์" },
  { iso: "NG", dial: "234", name: "ไนจีเรีย" },
  { iso: "KE", dial: "254", name: "เคนยา" },
];

const PREFERRED_ISO_FOR_DIAL: Record<string, string> = {
  "1": "US",
  "7": "RU",
  "66": "TH",
};

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0];

export function phoneCountryFlag(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));
}

export function findPhoneCountry(iso: string): PhoneCountry {
  return PHONE_COUNTRIES.find((c) => c.iso === iso) ?? DEFAULT_PHONE_COUNTRY;
}

export function composeHiringPhone(iso: string, national: string): string {
  const country = findPhoneCountry(iso);
  const digits = national.replace(/\D/g, "");
  return digits ? `+${country.dial} ${digits}` : `+${country.dial} `;
}

export function parseHiringPhone(raw: string): { iso: string; national: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { iso: DEFAULT_PHONE_COUNTRY.iso, national: "" };

  const plus = trimmed.startsWith("+") ? trimmed.slice(1) : trimmed;
  const compact = plus.replace(/[^\d\s-]/g, "");
  const allDigits = compact.replace(/\D/g, "");

  const matches = PHONE_COUNTRIES.filter((c) => allDigits.startsWith(c.dial)).sort(
    (a, b) => b.dial.length - a.dial.length,
  );
  const longest = matches[0]?.dial.length ?? 0;
  const sameLength = matches.filter((c) => c.dial.length === longest);
  const preferredIso = sameLength[0] ? PREFERRED_ISO_FOR_DIAL[sameLength[0].dial] : undefined;
  const country =
    sameLength.find((c) => c.iso === preferredIso) ??
    sameLength[0] ??
    DEFAULT_PHONE_COUNTRY;

  const rest = allDigits.startsWith(country.dial) ? allDigits.slice(country.dial.length) : allDigits;
  return { iso: country.iso, national: rest };
}
