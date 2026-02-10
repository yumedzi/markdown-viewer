import * as vscode from 'vscode';
import * as path from 'path';

export class ExportService {
  async saveCsv(content: string, defaultName: string): Promise<void> {
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(defaultName),
      filters: { 'CSV Files': ['csv'], 'All Files': ['*'] }
    });

    if (!uri) return;

    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
    vscode.window.showInformationMessage(`CSV exported: ${path.basename(uri.fsPath)}`);
  }

  async saveJson(content: string, defaultName: string): Promise<void> {
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(defaultName),
      filters: { 'JSON Files': ['json'], 'All Files': ['*'] }
    });

    if (!uri) return;

    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
    vscode.window.showInformationMessage(`JSON exported: ${path.basename(uri.fsPath)}`);
  }
}
