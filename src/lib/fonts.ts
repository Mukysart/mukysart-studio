import fontData from './fonts.json';

export type LocalFontVariant = {
    weight: number;
    style: 'normal' | 'italic';
    url: string;
};

export type LocalFont = {
    family: string;
    variants: LocalFontVariant[];
};

export const googleFonts: string[] = fontData.googleFonts;
export const localFonts: LocalFont[] = fontData.localFonts;

export const allFontFamilies: string[] = [
    ...googleFonts.map(font => font.split(':')[0].replace(/\+/g, ' ')),
    ...localFonts.map(font => font.family)
].sort();

export function getGoogleFontUrl(): string {
    const families = googleFonts.map(font => `family=${font}`).join('&');
    return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
