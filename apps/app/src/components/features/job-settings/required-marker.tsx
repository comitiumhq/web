interface RequiredMarkerProps {
  show: boolean;
}

export function RequiredMarker({ show }: RequiredMarkerProps) {
  return show ? <span className="text-destructive">*</span> : null;
}
