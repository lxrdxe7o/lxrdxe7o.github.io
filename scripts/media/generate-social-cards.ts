import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import sharp from 'sharp';

import {
  SOCIAL_CARD_HEIGHT,
  SOCIAL_CARD_WIDTH,
  socialCards,
  type SocialCardSpec,
} from '../../src/lib/seo/social-card.ts';

const OUT_DIR = resolve(process.cwd(), 'public/social');

const CARD_BG = '#0a0a0b';
const CARD_ACCENT = '#c2183a';
const CARD_TEXT = '#f5f4ef';
const CARD_MUTED = '#9a98a0';

function svgFor(spec: SocialCardSpec): string {
  const [primary, secondary = ''] = spec.label.split('—');
  return `<svg width="${SOCIAL_CARD_WIDTH}" height="${SOCIAL_CARD_HEIGHT}" viewBox="0 0 ${SOCIAL_CARD_WIDTH} ${SOCIAL_CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${CARD_BG}"/>
  <rect x="72" y="72" width="56" height="4" fill="${CARD_ACCENT}"/>
  <text x="72" y="330" fill="${CARD_TEXT}" font-family="system-ui, sans-serif" font-size="88" font-weight="700" letter-spacing="-2">${primary.trim()}</text>
  <text x="72" y="410" fill="${CARD_MUTED}" font-family="ui-monospace, monospace" font-size="34" letter-spacing="4">${secondary.trim()}</text>
  <text x="72" y="560" fill="${CARD_ACCENT}" font-family="ui-monospace, monospace" font-size="26" letter-spacing="3">lxrdxe7o.me</text>
</svg>`;
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  for (const spec of Object.values(socialCards)) {
    const svg = svgFor(spec);
    const outPath = resolve(OUT_DIR, spec.path.replace('/social/', ''));
    await mkdir(dirname(outPath), { recursive: true });
    await sharp(Buffer.from(svg), { density: 72 })
      .png({ compressionLevel: 9 })
      .toFile(outPath);
  }
  // The default card doubles as the generic fallback under `/social/home.png`.
  console.log(`Generated ${Object.keys(socialCards).length} social cards in public/social/`);
}

void main();
