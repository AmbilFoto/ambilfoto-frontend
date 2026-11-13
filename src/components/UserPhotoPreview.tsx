import { useEffect, useRef, useState } from "react";
import { userService } from "@/services/api/user.service";

interface UserPhotoPreviewProps {
  photoId: string;
  alt: string;
  className?: string;
  lazy?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export const UserPhotoPreview = ({
  photoId,
  alt,
  className,
  lazy = false,
  onLoad,
  onError,
}: UserPhotoPreviewProps) => {
  const [src, setSrc] = useState<string>();
  const [visible, setVisible] = useState(!lazy);
  const imageRef = useRef<HTMLImageElement>(null);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!lazy || visible || !imageRef.current || !("IntersectionObserver" in window)) {
      if (!lazy || !("IntersectionObserver" in window)) setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    });
    observer.observe(imageRef.current);
    return () => observer.disconnect();
  }, [lazy, visible]);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    let objectURL = "";
    setSrc(undefined);

    userService.getPhotoPreviewBlob(photoId)
      .then((blob) => {
        objectURL = URL.createObjectURL(blob);
        if (active) setSrc(objectURL);
        else URL.revokeObjectURL(objectURL);
      })
      .catch(() => {
        if (active) onErrorRef.current?.();
      });

    return () => {
      active = false;
      if (objectURL) URL.revokeObjectURL(objectURL);
    };
  }, [photoId, visible]);

  return <img ref={imageRef} src={src} alt={alt} className={className} onLoad={onLoad} onError={onError} />;
};
