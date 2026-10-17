const REPORT_ID_PATTERN = /^SRP([A-Z]{3,5})-([0-9A-F]{5,16})$/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEGACY_BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const UUID_HEX_PATTERN = /^[0-9a-f]{32}$/i;

export function categoryCodeFromName(name: string | null | undefined): string {
  const letters = (name ?? "").toUpperCase().replace(/[^A-Z]/g, "");
  const knownCodes: Record<string, string> = {
    CONSUMERCOMPLAINT: "CONS",
    CYBERCRIME: "CYBR",
    FRAUD: "FRUD",
  };
  if (knownCodes[letters]) return knownCodes[letters];
  return letters.length >= 3 ? letters.slice(0, 5) : "OTHER";
}

export function formatPublicReportId(
  categoryCode: string | null | undefined,
  serial: string | number | bigint
): string {
  const code = /^[A-Z]{3,5}$/i.test(categoryCode ?? "")
    ? categoryCode!.toUpperCase()
    : "OTHER";
  const number = BigInt(serial);
  if (number < BigInt(0)) throw new Error("Report serial cannot be negative");
  return `SRP${code}-${number.toString(16).toUpperCase().padStart(5, "0")}`;
}

export function parsePublicReportId(value: string): {
  type: "public";
  categoryCode: string;
  serial: string;
} | { type: "uuid"; uuid: string } | null {
  const normalized = value.trim();
  if (UUID_PATTERN.test(normalized)) {
    return { type: "uuid", uuid: normalized.toLowerCase() };
  }

  const legacyMatch = normalized.match(/^RPT-([1-9A-HJ-NP-Za-km-z]{1,23})$/);
  if (legacyMatch) {
    let decoded = BigInt(0);
    for (const character of legacyMatch[1]) {
      const digit = LEGACY_BASE58_ALPHABET.indexOf(character);
      if (digit < 0) return null;
      decoded = decoded * BigInt(58) + BigInt(digit);
    }
    let hex = decoded.toString(16);
    if (hex.length % 2) hex = `0${hex}`;
    let leadingZeroBytes = 0;
    while (legacyMatch[1][leadingZeroBytes] === "1") leadingZeroBytes += 1;
    hex = `${"00".repeat(leadingZeroBytes)}${hex}`;
    if (!UUID_HEX_PATTERN.test(hex)) return null;
    const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    return { type: "uuid", uuid };
  }

  const match = normalized.match(REPORT_ID_PATTERN);
  if (!match) return null;

  const serial = BigInt(`0x${match[2]}`);
  if (serial < BigInt(1)) return null;

  return {
    type: "public",
    categoryCode: match[1].toUpperCase(),
    serial: serial.toString(),
  };
}
