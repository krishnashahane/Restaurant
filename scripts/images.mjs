import sharp from "sharp";
import fs from "node:fs";
const [src, map, out] = process.argv.slice(2);
const m = JSON.parse(fs.readFileSync(map, "utf8"));
for (const [zid, id] of Object.entries(m)) {
  await sharp(`${src}/${zid}.webp`).resize(640, 640, { fit: "cover" }).webp({ quality: 78 }).toFile(`${out}/${id}.webp`);
}
console.log("done", Object.keys(m).length);
