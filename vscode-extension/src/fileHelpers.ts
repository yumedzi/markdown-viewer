import { getExtension, removeBOM } from './utils.js';

export const SUPPORTED_EXTENSIONS = {
  markdown: ['.md', '.markdown', '.mdown', '.mkd', '.mkdn'],
  mermaid: ['.mmd', '.mermaid'],
  omniware: ['.ow']
};

export function isMermaidFile(filePath: string): boolean {
  return SUPPORTED_EXTENSIONS.mermaid.includes(getExtension(filePath));
}

export function isOmniWareFile(filePath: string): boolean {
  return SUPPORTED_EXTENSIONS.omniware.includes(getExtension(filePath));
}

export function isMarkdownFile(filePath: string): boolean {
  const ext = getExtension(filePath);
  return SUPPORTED_EXTENSIONS.markdown.includes(ext) ||
         SUPPORTED_EXTENSIONS.mermaid.includes(ext) ||
         SUPPORTED_EXTENSIONS.omniware.includes(ext);
}

export function wrapMermaidContent(content: string, filePath: string): string {
  if (isMermaidFile(filePath)) {
    const trimmed = content.trim();
    if (trimmed.startsWith('```mermaid') || trimmed.startsWith('~~~mermaid')) {
      return content;
    }
    return '```mermaid\n' + content + '\n```';
  }
  return content;
}

export function wrapOmniWareContent(content: string, filePath: string): string {
  if (isOmniWareFile(filePath)) {
    const trimmed = content.trim();
    if (trimmed.startsWith('```omniware') || trimmed.startsWith('~~~omniware')) {
      return content;
    }
    return '```omniware\n' + content + '\n```';
  }
  return content;
}

export function prepareContent(content: string, filePath: string): string {
  let prepared = removeBOM(content);
  prepared = wrapMermaidContent(prepared, filePath);
  prepared = wrapOmniWareContent(prepared, filePath);
  return prepared;
}
