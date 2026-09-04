import { useEffect, useState } from "react";
import { releaseAssetUrl, retainAssetUrl } from "@/lib/editor/image-db";
import { isLegacyDataUrl, isStaticImageSrc } from "@/lib/editor/images";

export function useAssetUrl(assetId?: string, fallbackSrc?: string) {
  const staticSrc = isStaticImageSrc(fallbackSrc) ? fallbackSrc : undefined;
  const legacySrc = isLegacyDataUrl(fallbackSrc) ? fallbackSrc : undefined;
  const [url, setUrl] = useState<string | undefined>(staticSrc ?? legacySrc);

  useEffect(() => {
    let cancelled = false;
    let retained = false;
    if (assetId) {
      void retainAssetUrl(assetId)
        .then((next) => {
          if (!cancelled) {
            retained = true;
            setUrl(next);
          } else releaseAssetUrl(assetId);
        })
        .catch(() => {
          if (!cancelled) setUrl(staticSrc ?? legacySrc);
        });
      return () => {
        cancelled = true;
        // Release only after retain resolves; otherwise an unmounted consumer leaks a ref.
        if (retained) releaseAssetUrl(assetId);
      };
    }
    setUrl(staticSrc ?? legacySrc);
    return () => {
      cancelled = true;
    };
  }, [assetId, staticSrc, legacySrc]);

  return url;
}
