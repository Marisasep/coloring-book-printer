export type Emoji = {
  id: string;
  label: string;
  src: string;
};

export const EMOJIS: Emoji[] = [
  { id: "1F600", label: "😀", src: "/emoji/1F600.svg" },
  { id: "1F602", label: "😂", src: "/emoji/1F602.svg" },
  { id: "1F60D", label: "😍", src: "/emoji/1F60D.svg" },
  { id: "1F60E", label: "😎", src: "/emoji/1F60E.svg" },
  { id: "1F929", label: "🤩", src: "/emoji/1F929.svg" },
  { id: "1F914", label: "🤔", src: "/emoji/1F914.svg" },
  { id: "1F622", label: "😢", src: "/emoji/1F622.svg" },
  { id: "1F621", label: "😡", src: "/emoji/1F621.svg" },
  { id: "1F634", label: "😴", src: "/emoji/1F634.svg" },
  { id: "1F633", label: "😳", src: "/emoji/1F633.svg" },
  { id: "2764", label: "❤️", src: "/emoji/2764.svg" },
  { id: "1F495", label: "💕", src: "/emoji/1F495.svg" },
  { id: "1F494", label: "💔", src: "/emoji/1F494.svg" },
  { id: "1F44D", label: "👍", src: "/emoji/1F44D.svg" },
  { id: "270C", label: "✌️", src: "/emoji/270C.svg" },
  { id: "1F44B", label: "👋", src: "/emoji/1F44B.svg" },
  { id: "1F44F", label: "👏", src: "/emoji/1F44F.svg" },
  { id: "1F431", label: "🐱", src: "/emoji/1F431.svg" },
  { id: "1F436", label: "🐶", src: "/emoji/1F436.svg" },
  { id: "1F43B", label: "🐻", src: "/emoji/1F43B.svg" },
  { id: "1F430", label: "🐰", src: "/emoji/1F430.svg" },
  { id: "1F98B", label: "🦋", src: "/emoji/1F98B.svg" },
  { id: "2B50", label: "⭐", src: "/emoji/2B50.svg" },
  { id: "2728", label: "✨", src: "/emoji/2728.svg" },
  { id: "1F308", label: "🌈", src: "/emoji/1F308.svg" },
  { id: "2600", label: "☀️", src: "/emoji/2600.svg" },
  { id: "1F319", label: "🌙", src: "/emoji/1F319.svg" },
  { id: "1F389", label: "🎉", src: "/emoji/1F389.svg" },
  { id: "1F381", label: "🎁", src: "/emoji/1F381.svg" },
  { id: "1F3B5", label: "🎵", src: "/emoji/1F3B5.svg" },
  { id: "1F525", label: "🔥", src: "/emoji/1F525.svg" },
  { id: "1F4A5", label: "💥", src: "/emoji/1F4A5.svg" },
];

const cache = new Map<string, HTMLImageElement>();

export function loadEmojiImage(src: string): Promise<HTMLImageElement> {
  const cached = cache.get(src);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      cache.set(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

export function getEmojiImage(src: string): HTMLImageElement | null {
  return cache.get(src) ?? null;
}
