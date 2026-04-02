const fs = require('fs');
const path = require('path');

const PORTALS_DIR = path.join(__dirname, 'PORTALS');
const OUTPUT = path.join(__dirname, 'portals.json');
const IGNORE = ['__TEMPLATE__'];

const files = fs.readdirSync(PORTALS_DIR).filter(f =>
  f.endsWith('.json') && !IGNORE.includes(path.basename(f, '.json'))
);

const portals = files.map(f => {
  const data = JSON.parse(fs.readFileSync(path.join(PORTALS_DIR, f), 'utf8'));
  return { slug: path.basename(f, '.json'), ...data };
});

fs.writeFileSync(OUTPUT, JSON.stringify(portals, null, 2));
console.log(`Built portals.json with ${portals.length} portal(s)`);
