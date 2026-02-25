import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface RecentFileEntry {
  path: string;
  name: string;
  timestamp: number;
}

const MAX_RECENT_FILES = 100;
const STORAGE_KEY = 'omnicoreRecentFiles';

export class RecentFilesProvider implements vscode.TreeDataProvider<RecentFileItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<RecentFileItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private context: vscode.ExtensionContext) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  addFile(filePath: string): void {
    let files = this.getFiles();
    files = files.filter(f => f.path !== filePath);
    files.unshift({
      path: filePath,
      name: path.basename(filePath),
      timestamp: Date.now()
    });
    files = files.slice(0, MAX_RECENT_FILES);
    this.context.globalState.update(STORAGE_KEY, files);
    this.refresh();
  }

  removeFile(filePath: string): void {
    let files = this.getFiles();
    files = files.filter(f => f.path !== filePath);
    this.context.globalState.update(STORAGE_KEY, files);
    this.refresh();
  }

  clearAll(): void {
    this.context.globalState.update(STORAGE_KEY, []);
    this.refresh();
  }

  private getFiles(): RecentFileEntry[] {
    return this.context.globalState.get<RecentFileEntry[]>(STORAGE_KEY) || [];
  }

  getTreeItem(element: RecentFileItem): vscode.TreeItem {
    return element;
  }

  getChildren(): RecentFileItem[] {
    return this.getFiles().map(entry => new RecentFileItem(entry));
  }
}

export class RecentFileItem extends vscode.TreeItem {
  constructor(public readonly entry: RecentFileEntry) {
    super(entry.name, vscode.TreeItemCollapsibleState.None);
    this.description = path.dirname(entry.path);
    this.tooltip = entry.path;
    this.contextValue = 'recentFile';

    this.command = {
      command: 'vscode.open',
      title: 'Open File',
      arguments: [vscode.Uri.file(entry.path)]
    };

    const exists = fs.existsSync(entry.path);
    if (!exists) {
      this.description += ' (missing)';
      this.iconPath = new vscode.ThemeIcon('warning');
    } else {
      this.iconPath = new vscode.ThemeIcon('file');
    }
  }
}
