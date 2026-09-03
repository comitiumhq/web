/** Browser IANA timezone, used as the default in timezone inputs. */
export const BROWSER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** All IANA timezone identifiers with the browser timezone first. */
export const ALL_TIMEZONES: readonly string[] = [
  BROWSER_TZ,
  ...Intl.supportedValuesOf('timeZone').filter((timezone) => timezone !== BROWSER_TZ),
];
