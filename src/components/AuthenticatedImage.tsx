import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import type { ImgHTMLAttributes, SyntheticEvent } from 'react';
import { API_BASE_URL } from '@/services/api/api.config';

type Props = ImgHTMLAttributes<HTMLImageElement> & { onLoadError?: () => void };

const isGatewayImage = (src: string) =>
  src.startsWith(`${API_BASE_URL}/`) || src.startsWith('/api/');

export const AuthenticatedImage = ({ src, alt = '', className, loading, onLoadError, ...props }: Props) => {
  const placeholderRef = useRef<HTMLDivElement>(null);
  const onLoadErrorRef = useRef(onLoadError);
  onLoadErrorRef.current = onLoadError;
  const [visible, setVisible] = useState(loading === 'eager');
  const [blobURL, setBlobURL] = useState<string>();
  const [failed, setFailed] = useState(false);
  const imageLoading = loading ?? 'lazy';

  useEffect(() => {
    if (loading === 'eager' || !isGatewayImage(src ?? '')) {
      setVisible(true);
      return;
    }

    const element = placeholderRef.current;
    if (!element || !('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '100px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [loading, src]);

  useEffect(() => {
    if (!src || !isGatewayImage(src) || !visible) {
      setBlobURL(undefined);
      setFailed(false);
      return;
    }

    const controller = new AbortController();
    let objectURL: string | undefined;
    const token = localStorage.getItem('auth_token');
    axios.get<Blob>(src, {
      responseType: 'blob',
      timeout: 60000,
      signal: controller.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }).then(({ data }) => {
      objectURL = URL.createObjectURL(data);
      setBlobURL(objectURL);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        console.error('Unable to load authenticated photo preview', error);
        setFailed(true);
        onLoadErrorRef.current?.();
      }
    });

    return () => {
      controller.abort();
      if (objectURL) URL.revokeObjectURL(objectURL);
    };
  }, [src, visible]);

  const handleImageError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    props.onError?.(event);
    onLoadErrorRef.current?.();
  };

  if (!src) {
    return <div className={className} role="img" aria-label={alt} />;
  }
  if (!isGatewayImage(src)) {
    return <img src={src} alt={alt} className={className} loading={imageLoading} {...props} onError={handleImageError} />;
  }
  if (failed) {
    return (
      <div className={className} role="img" aria-label={alt || 'Foto tidak dapat dimuat'}>
        <span className="sr-only">Foto tidak dapat dimuat</span>
      </div>
    );
  }
  if (!blobURL) {
    return <div ref={placeholderRef} className={className} aria-busy="true" role="img" aria-label={alt} />;
  }
  return <img src={blobURL} alt={alt} className={className} loading={imageLoading} {...props} onError={handleImageError} />;
};
