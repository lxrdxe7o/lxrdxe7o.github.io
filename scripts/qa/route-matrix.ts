/**
 * Route matrix: enumerates every public route against viewport and
 * preference combinations and prints a runnable checklist for manual QA.
 * Not a test — a planning aid consumed by the QA docs.
 */

export interface MatrixCell {
  route: string;
  viewport: string;
  preference: string;
}

const ROUTES = [
  '/',
  '/about',
  '/projects',
  '/projects/xero-dev',
  '/projects/krakenvim',
  '/projects/hachi',
  '/projects/mikeneko',
  '/projects/shiro-nekoo-115',
  '/projects/deaddrop',
  '/projects/dotfiles',
  '/projects/tora-neko-311',
  '/projects/kuro-nekoo-215',
  '/experience',
  '/skills',
  '/uses',
  '/writing',
  '/notes',
  '/now',
  '/archive',
  '/contact',
];

const VIEWPORTS = ['mobile-375', 'tablet-768', 'desktop-1440', 'zoom-200'];

const PREFERENCES = [
  'default',
  'reduced-motion',
  'reduced-data',
  'forced-colors',
  'no-javascript',
  'no-webgl',
];

export function routeMatrix(): MatrixCell[] {
  return ROUTES.flatMap((route) =>
    VIEWPORTS.flatMap((viewport) =>
      PREFERENCES.map((preference) => ({ route, viewport, preference })),
    ),
  );
}

export function printRouteMatrix(): void {
  const matrix = routeMatrix();
  console.log(`Route matrix: ${matrix.length} combinations`);
  console.log(`Routes: ${ROUTES.length} × Viewports: ${VIEWPORTS.length} × Preferences: ${PREFERENCES.length}`);
  for (const cell of matrix.slice(0, 12)) {
    console.log(`  ${cell.route} @ ${cell.viewport} (${cell.preference})`);
  }
  console.log('  …');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  printRouteMatrix();
}
