import { UploadIcon, XIcon } from '@phosphor-icons/react';
import type { ChangeEvent, DragEvent } from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { getImageUploadMaxSizeLabel, getSupportedImageFormats, validateImageUpload } from '../lib/image-upload';
import { Button } from './button';
import { Input } from './input';

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
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
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

      const validationError = validateImageUpload(file, acceptedTypes, maxSize);
      if (validationError) {
        setError(validationError);

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

  const openFilePicker = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const supportedFormats = getSupportedImageFormats(acceptedTypes);
  const maxSizeLabel = getImageUploadMaxSizeLabel(maxSize);
  const pickerLabel = `${preview ? 'Change' : 'Upload'} ${label.toLowerCase()}`;

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
          <>
            <img src={preview} alt={label} className="size-full rounded-xl object-cover" />
            {!disabled && (
              <>
                <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 rounded-xl bg-background/70 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                  <UploadIcon className="size-5" />
                  <span className="text-label-12">Change</span>
                </div>
                <Button
                  type="button"
                  onClick={removeImage}
                  size="icon-xs"
                  variant="outline"
                  aria-label={`Remove ${label.toLowerCase()}`}
                  className="absolute right-2 top-2 z-30 rounded-full bg-background shadow-sm hover:bg-background"
                >
                  <XIcon />
                </Button>
              </>
            )}
          </>
        ) : (
          <div className="pointer-events-none flex h-full flex-col justify-center text-center">
            <UploadIcon
              className={cn('mx-auto mb-2 size-6 transition-colors', getUploadIconClassName(disabled, isDragging))}
            />
            <span className={cn('text-label-12 transition-colors', getUploadTextClassName(disabled, isDragging))}>
              Upload {label.toLowerCase()}
            </span>
          </div>
        )}

        <button
          type="button"
          aria-controls={inputId}
          aria-label={pickerLabel}
          className="absolute inset-0 z-20 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed"
          disabled={disabled}
          onClick={openFilePicker}
        />
        <Input
          ref={inputRef}
          id={inputId}
          type="file"
          className="sr-only"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
        />
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
