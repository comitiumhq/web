import { Button } from '@comitium/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { getImageUploadMaxSizeLabel, validateImageUpload } from '@comitium/ui/image-upload';
import { InitialsAvatar } from '@comitium/ui/initials-avatar';
import { Input } from '@comitium/ui/input';
import { Slider } from '@comitium/ui/slider';
import { CameraIcon, MinusIcon, PlusIcon } from '@phosphor-icons/react';
import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import type { MemberAvatarUpload } from '@/lib/api/orgs';

const ACCEPTED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

interface SelectedPhoto {
  file: File;
  previewUrl: string;
}

interface ProfilePhotoFieldProps {
  disabled?: boolean;
  imageSrc: string | null;
  maxSize: number;
  name: string | null;
  email: string | null;
  onChange: (upload: MemberAvatarUpload) => void;
}

export function ProfilePhotoField({ disabled, imageSrc, maxSize, name, email, onChange }: ProfilePhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<SelectedPhoto | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPhoto) {
      return;
    }

    return () => URL.revokeObjectURL(selectedPhoto.previewUrl);
  }, [selectedPhoto]);

  const closeEditor = useCallback(() => {
    setSelectedPhoto(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
  }, []);

  const handleFileInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';

      if (!file) {
        return;
      }

      const validationError = validateImageUpload(file, ACCEPTED_AVATAR_TYPES, maxSize);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      setSelectedPhoto({ file, previewUrl: URL.createObjectURL(file) });
    },
    [maxSize],
  );

  const handleCropComplete = useCallback((area: Area) => {
    setCroppedArea({
      x: area.x / 100,
      y: area.y / 100,
      width: area.width / 100,
      height: area.height / 100,
    });
  }, []);

  const applyCrop = useCallback(() => {
    if (!selectedPhoto || !croppedArea) {
      return;
    }

    onChange({ file: selectedPhoto.file, crop: croppedArea });
    closeEditor();
  }, [closeEditor, croppedArea, onChange, selectedPhoto]);

  const pickerLabel = imageSrc ? 'Change profile photo' : 'Upload profile photo';
  const maxSizeLabel = getImageUploadMaxSizeLabel(maxSize);

  return (
    <>
      <div className="flex min-w-0 items-center gap-4">
        <button
          type="button"
          aria-label={pickerLabel}
          className="group relative size-16 shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <InitialsAvatar
            identity={{ name, email }}
            imageSrc={imageSrc}
            imageAlt={imageSrc ? 'Profile photo' : ''}
            className="size-16 text-base ring-1 ring-border"
          />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
            <CameraIcon className="size-4" weight="fill" />
            <span className="sr-only">{pickerLabel}</span>
          </span>
        </button>

        <div className="min-w-0">
          <h2 className="font-medium">Profile photo</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">PNG, JPEG or WebP. Up to {maxSizeLabel}.</p>
          {error && (
            <p className="mt-1 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <Input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={ACCEPTED_AVATAR_TYPES.join(',')}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          onChange={handleFileInput}
        />
      </div>

      <Dialog open={Boolean(selectedPhoto)} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="gap-5 data-open:zoom-in-100 data-closed:zoom-out-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crop profile photo</DialogTitle>
            <DialogDescription>Move and zoom the image until it looks right in the circle.</DialogDescription>
          </DialogHeader>

          <div className="relative h-[min(52dvh,25rem)] min-h-64 w-full overflow-hidden rounded-2xl bg-black">
            {selectedPhoto && (
              <Cropper
                image={selectedPhoto.previewUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                objectFit="cover"
                maxZoom={3}
                roundCropAreaPixels
                disableAutomaticStylesInjection
                onCropChange={setCrop}
                onCropComplete={handleCropComplete}
                onZoomChange={setZoom}
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <MinusIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <Slider
              aria-label="Zoom photo"
              min={1}
              max={3}
              step={0.01}
              value={[zoom]}
              onValueChange={([value]) => setZoom(value ?? 1)}
            />
            <PlusIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeEditor}>
              Cancel
            </Button>
            <Button type="button" disabled={!croppedArea} onClick={applyCrop}>
              Save photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
