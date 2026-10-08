// Gera public/sounds/new-order.wav — um "ding-dong" curto em WAV puro
// (sem dependências / sem ffmpeg) para o aviso de pedido novo no painel.
// Correr com: npm run sound
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "sounds", "new-order.wav");

const SAMPLE_RATE = 44100;

function note(freq, start, duration) {
  return (t) => {
    if (t < start || t > start + duration) return 0;
    const local = t - start;
    const envelope = Math.min(1, local / 0.02) * Math.exp(-local * 3.2);
    return 0.5 * envelope * Math.sin(2 * Math.PI * freq * local);
  };
}

const total = 0.9;
const samples = new Int16Array(Math.floor(SAMPLE_RATE * total));
for (let i = 0; i < samples.length; i++) {
  const t = i / SAMPLE_RATE;
  // "Ding" (Mi 659 Hz) + "dong" (Dó 523 Hz) sobrepostos
  const v =
    note(659.25, 0.0, 0.45)(t) +
    note(523.25, 0.26, 0.55)(t);
  samples[i] = Math.round(Math.max(-1, Math.min(1, v)) * 32767);
}

const dataSize = samples.length * 2;
const buffer = Buffer.alloc(44 + dataSize);
buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20); // PCM
buffer.writeUInt16LE(1, 22); // mono
buffer.writeUInt32LE(SAMPLE_RATE, 24);
buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);
Buffer.from(samples.buffer).copy(buffer, 44);

mkdirSync(join(root, "public", "sounds"), { recursive: true });
writeFileSync(out, buffer);
console.log(`OK: ${out} (${(buffer.length / 1024).toFixed(1)} KB)`);