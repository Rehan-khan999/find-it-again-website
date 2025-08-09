import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
// Keep browser cache enabled to avoid repeated downloads across sessions
// env.useBrowserCache = true; // default is true

let extractorPromise: Promise<any> | null = null;

export const getImageExtractor = () => {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', 'Xenova/clip-vit-base-patch32', {
      device: 'webgpu',
    }).catch((e) => {
      // Fallback to CPU if WebGPU fails
      console.warn('WebGPU unavailable, falling back to CPU for embeddings.', e);
      return pipeline('feature-extraction', 'Xenova/clip-vit-base-patch32');
    });
  }
  return extractorPromise;
};

// Compute L2-normalized embedding for an image URL
export const embedImage = async (imageUrl: string): Promise<Float32Array> => {
  const extractor = await getImageExtractor();
  const output = await extractor(imageUrl, { pooling: 'mean', normalize: true });
  // transformers.js returns a Tensor-like object or nested array; normalize to Float32Array
  const arr = Array.isArray(output) ? output.flat(Infinity) as number[] : (output.data || []);
  return Float32Array.from(arr as number[]);
};

export const cosineSimilarity = (a: Float32Array, b: Float32Array): number => {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
};

export const computeImageSimilarity = async (imgA: string, imgB: string): Promise<number> => {
  try {
    const [ea, eb] = await Promise.all([embedImage(imgA), embedImage(imgB)]);
    // Map cosine [-1,1] to [0,1]
    const cos = cosineSimilarity(ea, eb);
    return (cos + 1) / 2;
  } catch (e) {
    console.error('AI similarity failed:', e);
    return 0;
  }
};
