/** Formats de numéros de téléphone par pays */
export const PHONE_FORMATS = {
  // Pays francophones principaux
  'FR': { mask: '_ __ __ __ __', length: 9, example: '7 77 77 77 77' },
  'BE': { mask: '___ __ __ __', length: 9, example: '123 45 67 89' },
  'CH': { mask: '__ ___ __ __', length: 9, example: '78 123 45 67' },
  'CA': { mask: '(___)___-____', length: 10, example: '(514)123-4567' },
  'MU': { mask: '__ __ __ __', length: 8, example: '57 12 34 56' },

  // Pays européens
  'GB': { mask: '____ ___ ____', length: 11, example: '0207 123 4567' },
  'DE': { mask: '__ ________', length: 11, example: '30 12345678' },
  'ES': { mask: '___ __ __ __', length: 9, example: '612 34 56 78' },
  'IT': { mask: '__ ____ ____', length: 10, example: '06 1234 5678' },
  'NL': { mask: '__ ________', length: 10, example: '20 12345678' },

  // Amérique du Nord (même format que CA)
  'US': { mask: '(___)___-____', length: 10, example: '(555)123-4567' },

  // Pays africains francophones
  'MA': { mask: '__-__-__-__-__', length: 10, example: '06-12-34-56-78' },
  'DZ': { mask: '__ __ __ __ __', length: 10, example: '05 12 34 56 78' },
  'TN': { mask: '__ ___ ___', length: 8, example: '21 123 456' },
  'SN': { mask: '__ ___ __ __', length: 9, example: '77 123 45 67' },
  'CI': { mask: '__ __ __ __ __', length: 10, example: '05 12 34 56 78' },
  'CM': { mask: '_ __ __ __ __', length: 9, example: '6 12 34 56 78' },

  // Asie
  'CN': { mask: '____ ____', length: 8, example: '1234 5678' }, // format mobile simplifié
  'IN': { mask: '____ ______', length: 10, example: '9876 543210' },
  'JP': { mask: '(__) ____-____', length: 10, example: '(03) 1234-5678' },

  // Format générique pour pays non spécifiés
  'DEFAULT': { mask: '__ __ __ __ __', length: 10, example: 'numéro local' }
} as const;

export type CountryCode = keyof typeof PHONE_FORMATS;

/**
 * Formatage d'un numéro selon le pays
 * @param number - Numéro brut (chiffres uniquement)
 * @param countryCode - Code pays (ex: 'FR', 'US')
 * @returns Numéro formaté avec espaces/tirets
 */
export function formatPhoneNumber(number: string, countryCode: string): string {
  const format = PHONE_FORMATS[countryCode as CountryCode] || PHONE_FORMATS.DEFAULT;
  const digits = number.replace(/\D/g, '');
  let formatted = '';
  let digitIndex = 0;

  for (const char of format.mask) {
    if (char === '_' && digitIndex < digits.length) {
      formatted += digits[digitIndex];
      digitIndex++;
    } else if (char !== '_') {
      formatted += char;
    }
  }

  return formatted;
}

/**
 * Validation d'un numéro selon le pays
 * @param number - Numéro brut (chiffres uniquement)
 * @param countryCode - Code pays
 * @returns true si le nombre de chiffres est correct
 */
export function validatePhoneNumber(number: string, countryCode: string): boolean {
  const format = PHONE_FORMATS[countryCode as CountryCode] || PHONE_FORMATS.DEFAULT;
  const digits = number.replace(/\D/g, '');
  return digits.length === format.length;
}

/**
 * Récupère le placeholder pour un pays
 * @param countryCode - Code pays
 * @returns Exemple formaté pour ce pays
 */
export function getPhonePlaceholder(countryCode: string): string {
  const format = PHONE_FORMATS[countryCode as CountryCode] || PHONE_FORMATS.DEFAULT;
  return format.example;
}