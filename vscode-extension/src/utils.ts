import * as path from 'path';

export function removeBOM(content: string): string {
  if (content && content.charCodeAt(0) === 0xFEFF) {
    return content.substring(1);
  }
  return content;
}

export function getFileName(filePath: string): string {
  if (!filePath) return '';
  return filePath.split(/[\\/]/).pop() || '';
}

export function getDirectory(filePath: string): string {
  if (!filePath) return '';
  const parts = filePath.split(/[\\/]/);
  parts.pop();
  return parts.join('/');
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function getExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}
