const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const UUID_HEX_PATTERN = /^[0-9a-f]{32}$/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function formatPublicReportId(uuid: string): string {
  const hex = uuid.replace(/-/g, "").toLowerCase();
  if (!UUID_HEX_PATTERN.test(hex)) return uuid;

  let value = BigInt(`0x${hex}`);
  let encoded = "";
  while (value > BigInt(0)) {
    const remainder = Number(value % BigInt(58));
    encoded = BASE58_ALPHABET[remainder] + encoded;
    value /= BigInt(58);
  }

  let leadingZeroBytes = 0;
  for (let index = 0; index < hex.length && hex.slice(index, index + 2) === "00"; index += 2) {
    leadingZeroBytes += 1;
  }

  return `RPT-${"1".repeat(leadingZeroBytes)}${encoded}`;
}

export function parsePublicReportId(value: string): string | null {
  const normalized = value.trim();
  if (UUID_PATTERN.test(normalized)) return normalized.toLowerCase();

  const match = normalized.match(/^RPT-(.+)$/i);
  if (!match) return null;

  const encoded = match[1];
  let decoded = BigInt(0);
  for (const character of encoded) {
    const digit = BASE58_ALPHABET.indexOf(character);
    if (digit < 0) return null;
    decoded = decoded * BigInt(58) + BigInt(digit);
  }

  let hex = decoded === BigInt(0) ? "" : decoded.toString(16);
  if (hex.length % 2) hex = `0${hex}`;

  let leadingZeroBytes = 0;
  while (encoded[leadingZeroBytes] === "1") leadingZeroBytes += 1;
  hex = `${"00".repeat(leadingZeroBytes)}${hex}`;
  if (!UUID_HEX_PATTERN.test(hex)) return null;

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
