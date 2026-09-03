import { UploadIcon, XIcon } from '@phosphor-icons/react';
import type { ChangeEvent, DragEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { cn } from '../lib/cn';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';

interface ImageUploaderProps {
  size?: string;
  label?: string;
  maxSize?: number;
  className?: string;
  disabled?: boolean;
  acceptedTypes?: string[];
  initialImage?: string | null;
  onImageChange?: (file: File | null) => void;
}

export const ImageUploader = ({
  size = 'size-32',
  label = 'Image',
  maxSize = 10 * 1024 * 1024,
  className = '',
  disabled = false,
  acceptedTypes = ['image/png', 'image/jpeg', 'image/svg+xml'],
  initialImage = null,
  onImageChange,
}: ImageUploaderProps) => {
  const [preview, setPreview] = useState<string | null>(initialImage);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  useEffect(() => {
    setPreview(initialImage);
    setError(null);
  }, [initialImage]);

  const handleFileSelect = useCallback(
    (file: File | null) => {
      if (!file) {
        return;
      }

      if (!acceptedTypes.includes(file.type)) {
        setError(`Use ${getSupportedFormats(acceptedTypes)}.`);

        return;
      }

      if (file.size === 0 || file.size > maxSize) {
        setError(`Image must be ${getMaxSizeLabel(maxSize)} or smaller.`);

        return;
      }

      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          setPreview(e.target.result as string);
        }
      };

      setError(null);
      reader.readAsDataURL(file);
      onImageChange?.(file);
    },
    [acceptedTypes, maxSize, onImageChange],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      if (disabled) {
        return;
      }

      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      handleFileSelect(file);
    },
    [handleFileSelect, disabled],
  );

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      if (disabled) {
        return;
      }

      setIsDragging(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      handleFileSelect(file);
      e.target.value = '';
    },
    [handleFileSelect],
  );

  const removeImage = useCallback(() => {
    setPreview(null);
    setError(null);
    onImageChange?.(null);
  }, [onImageChange]);

  const inputId = `file-upload-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const supportedFormats = getSupportedFormats(acceptedTypes);
  const maxSizeLabel = getMaxSizeLabel(maxSize);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        className={cn(
          'group relative aspect-square rounded-xl border border-dashed transition-all duration-200',
          size,
          getDropzoneClassName(disabled, isDragging),
          {
            'p-0': preview,
            'p-4': !preview,
          },
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {preview ? (
          <div className="relative group w-full h-full">
            <img src={preview} alt={label} className="w-full h-full object-cover rounded-xl" />
            {!disabled && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background opacity-0 transition-all duration-200 group-hover:opacity-60">
                <Button
                  type="button"
                  onClick={removeImage}
                  size="icon-sm"
                  className="rounded-full bg-background text-foreground opacity-0 shadow-sm transition-opacity duration-200 hover:scale-105 hover:bg-background group-hover:opacity-100"
                >
                  <XIcon />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center flex flex-col justify-center h-full">
            <UploadIcon
              className={cn('mx-auto mb-2 size-6 transition-colors', getUploadIconClassName(disabled, isDragging))}
            />
            <div className="text-label-14">
              <Label
                htmlFor={disabled ? undefined : inputId}
                className={cn('justify-self-center', {
                  'cursor-not-allowed': disabled,
                  'cursor-pointer': !disabled,
                })}
              >
                <span
                  className={cn('block text-label-12 transition-colors', getUploadTextClassName(disabled, isDragging))}
                >
                  Upload {label.toLowerCase()}
                </span>
              </Label>
              {!disabled && (
                <Input
                  id={inputId}
                  type="file"
                  className="sr-only"
                  accept={acceptedTypes.join(',')}
                  onChange={handleFileInput}
                  disabled={disabled}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <p className="text-label-12 text-muted-foreground">
        {supportedFormats} · up to {maxSizeLabel}
      </p>
      {error && (
        <p className="text-label-12 text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

function getSupportedFormats(acceptedTypes: string[]) {
  return [
    ...new Set(
      acceptedTypes.map((type) => {
        const ext = type.split('/')[1];

        if (ext === 'svg+xml') {
          return 'SVG';
        }

        if (ext === 'jpg') {
          return 'JPEG';
        }

        return ext.toUpperCase();
      }),
    ),
  ].join(', ');
}

function getMaxSizeLabel(maxSize: number) {
  return `${Math.round(maxSize / (1024 * 1024))} MB`;
}

function getDropzoneClassName(disabled: boolean, isDragging: boolean) {
  if (disabled) {
    return 'cursor-not-allowed opacity-50 border-input bg-input/30';
  }

  if (isDragging) {
    return 'border-primary bg-input/50';
  }

  return 'border-input bg-input/30 hover:border-ring hover:bg-input/50 cursor-pointer';
}

function getUploadIconClassName(disabled: boolean, isDragging: boolean) {
  if (disabled) {
    return 'text-muted-foreground';
  }

  if (isDragging) {
    return 'text-primary';
  }

  return 'text-muted-foreground';
}

function getUploadTextClassName(disabled: boolean, isDragging: boolean) {
  if (disabled) {
    return 'text-muted-foreground';
  }

  if (isDragging) {
    return 'text-primary';
  }

  return 'text-foreground';
}
