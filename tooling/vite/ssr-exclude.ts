import type { Plugin } from 'vite';

/** Replace browser-only modules with lightweight stubs during SSR builds. */
const CLIENT_ONLY_MODULES = ['pdfjs-dist', 'react-pdf'];

function isClientOnlyModule(id: string) {
  return CLIENT_ONLY_MODULES.some((moduleId) => id === moduleId || id.startsWith(`${moduleId}/`));
}

export function ssrExclude(): Plugin {
  return {
    name: 'ssr-exclude-client-only',
    enforce: 'pre',
    resolveId(id, _importer, options) {
      if (options?.ssr && isClientOnlyModule(id)) {
        return { id: `\0empty:${id}`, moduleSideEffects: false };
      }
    },
    load(id) {
      if (!id.startsWith('\0empty:')) {
        return;
      }

      if (id.endsWith('.css')) {
        return '';
      }

      const noop = 'const noop = () => null;';
      const obj = 'const obj = { GlobalWorkerOptions: {} };';

      return [
        noop,
        obj,
        'export { noop as Document, noop as Page, obj as pdfjs };',
        'export { obj as GlobalWorkerOptions, noop as getDocument };',
        'export default obj;',
      ].join('\n');
    },
  };
}
