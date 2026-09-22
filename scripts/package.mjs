// Builds plugin.zip for a GitHub release: the bundled entry point plus the
// manifest, README and licence at the archive root, as the registry expects.
// A minimal ZIP writer keeps the output identical on every OS.
//
// The same files are also copied to release/, a lightweight folder for
// "Plugins → Add Plugin" during development (Nuclear copies the whole folder,
// so installing the repository itself would drag node_modules along).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { deflateRawSync } from 'node:zlib';

const FILES = ['package.json', 'README.md', 'LICENSE', 'CHANGELOG.md', 'dist/index.js'];
const OUTPUT = 'plugin.zip';
const STAGE = 'release';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

// Fixed timestamp (2026-01-01 00:00) so rebuilding the same sources gives the same zip.
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

const locals = [];
const centrals = [];
let offset = 0;

for (const name of FILES) {
  const data = readFileSync(name);
  const compressed = deflateRawSync(data, { level: 9 });
  const nameBuffer = Buffer.from(name, 'utf8');
  const crc = crc32(data);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(0x0800, 6); // UTF-8 names
  local.writeUInt16LE(8, 8); // deflate
  local.writeUInt16LE(DOS_TIME, 10);
  local.writeUInt16LE(DOS_DATE, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBuffer.length, 26);
  local.writeUInt16LE(0, 28);
  locals.push(local, nameBuffer, compressed);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4); // version made by
  central.writeUInt16LE(20, 6); // version needed
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(8, 10);
  central.writeUInt16LE(DOS_TIME, 12);
  central.writeUInt16LE(DOS_DATE, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBuffer.length, 28);
  central.writeUInt32LE(offset, 42);
  centrals.push(central, nameBuffer);

  offset += local.length + nameBuffer.length + compressed.length;
}

const centralSize = centrals.reduce((sum, buffer) => sum + buffer.length, 0);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(FILES.length, 8);
end.writeUInt16LE(FILES.length, 10);
end.writeUInt32LE(centralSize, 12);
end.writeUInt32LE(offset, 16);

writeFileSync(OUTPUT, Buffer.concat([...locals, ...centrals, end]));
console.log(`Created ${OUTPUT} (${FILES.join(', ')})`);

rmSync(STAGE, { recursive: true, force: true });
for (const name of FILES) {
  mkdirSync(join(STAGE, dirname(name)), { recursive: true });
  cpSync(name, join(STAGE, name));
}
console.log(`Staged the same files in ${STAGE}/`);
