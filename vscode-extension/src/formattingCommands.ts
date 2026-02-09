import * as vscode from 'vscode';

export function registerFormattingCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand('omnicore.toggleBold', (editor) => {
      toggleWrap(editor, '**');
    }),
    vscode.commands.registerTextEditorCommand('omnicore.toggleItalic', (editor) => {
      toggleWrap(editor, '*');
    }),
    vscode.commands.registerTextEditorCommand('omnicore.toggleCode', (editor) => {
      toggleCode(editor);
    }),
    vscode.commands.registerTextEditorCommand('omnicore.toggleList', (editor) => {
      toggleList(editor);
    }),
    vscode.commands.registerTextEditorCommand('omnicore.removeFormatting', (editor) => {
      removeFormatting(editor);
    })
  );
}

function toggleWrap(editor: vscode.TextEditor, wrapper: string): void {
  const { document, selection } = editor;
  const text = document.getText(selection);
  if (!text) return;

  editor.edit(editBuilder => {
    if (text.startsWith(wrapper) && text.endsWith(wrapper) && text.length > wrapper.length * 2) {
      // Remove wrapper
      editBuilder.replace(selection, text.slice(wrapper.length, -wrapper.length));
    } else {
      // Add wrapper
      editBuilder.replace(selection, wrapper + text + wrapper);
    }
  });
}

function toggleCode(editor: vscode.TextEditor): void {
  const { document, selection } = editor;
  const text = document.getText(selection);
  if (!text) return;

  const isMultiline = text.includes('\n');

  editor.edit(editBuilder => {
    if (isMultiline) {
      if (text.startsWith('```\n') && text.endsWith('\n```')) {
        editBuilder.replace(selection, text.slice(4, -4));
      } else {
        editBuilder.replace(selection, '```\n' + text + '\n```');
      }
    } else {
      if (text.startsWith('`') && text.endsWith('`') && text.length > 2) {
        editBuilder.replace(selection, text.slice(1, -1));
      } else {
        editBuilder.replace(selection, '`' + text + '`');
      }
    }
  });
}

function toggleList(editor: vscode.TextEditor): void {
  const { document, selection } = editor;
  const text = document.getText(selection);
  if (!text) return;

  editor.edit(editBuilder => {
    const lines = text.split('\n');
    const allListed = lines.every(line => !line.trim() || line.trimStart().startsWith('- '));

    const transformed = lines.map(line => {
      if (!line.trim()) return line;
      if (allListed) {
        return line.replace(/^(\s*)- /, '$1');
      } else {
        const indent = line.match(/^(\s*)/)?.[1] || '';
        const content = line.trimStart();
        return indent + '- ' + content;
      }
    }).join('\n');

    editBuilder.replace(selection, transformed);
  });
}

function removeFormatting(editor: vscode.TextEditor): void {
  const { document, selection } = editor;
  const text = document.getText(selection);
  if (!text) return;

  editor.edit(editBuilder => {
    let clean = text
      .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^```\n?/gm, '')
      .replace(/\n?```$/gm, '')
      .replace(/^- /gm, '')
      .replace(/^> /gm, '')
      .replace(/^#+\s/gm, '');
    editBuilder.replace(selection, clean);
  });
}
