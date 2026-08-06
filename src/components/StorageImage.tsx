import { useEffect, useState } from "react";
import { resolveStorageUrl } from "@/lib/storageUrl";

type StorageImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
};

/**
 * Renders an image stored in a private Supabase bucket by resolving it to a
 * short-lived signed URL. External URLs pass through unchanged.
 */
export const StorageImage = ({ src, alt = "", ...props }: StorageImageProps) => {
  const [resolved, setResolved] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setResolved(null);
    resolveStorageUrl(src).then((url) => {
      if (active) setResolved(url);
    });
    return () => {
      active = false;
    };
  }, [src]);

  if (!resolved) {
    return <div className={props.className} aria-hidden="true" />;
  }

  return <img src={resolved} alt={alt} {...props} />;
};
