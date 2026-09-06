export function getSupportedImageFormats(acceptedTypes: string[]) {
  return [
    ...new Set(
      acceptedTypes.map((type) => {
        const extension = type.split('/')[1];

        if (extension === 'svg+xml') {
          return 'SVG';
        }

        if (extension === 'jpg') {
          return 'JPEG';
        }

        return extension.toUpperCase();
      }),
    ),
  ].join(', ');
}

export function getImageUploadMaxSizeLabel(maxSize: number) {
  return `${Math.round(maxSize / (1024 * 1024))} MB`;
}

export function validateImageUpload(file: File, acceptedTypes: string[], maxSize: number): string | null {
  if (!acceptedTypes.includes(file.type)) {
    return `Use ${getSupportedImageFormats(acceptedTypes)}.`;
  }

  if (file.size === 0 || file.size > maxSize) {
    return `Image must be ${getImageUploadMaxSizeLabel(maxSize)} or smaller.`;
  }

  return null;
}
