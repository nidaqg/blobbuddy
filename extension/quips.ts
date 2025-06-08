// This module exports functions to retrieve random quips based on mood.
import { happyQuips } from './quips/happyQuips';
import { focusedQuips } from './quips/focusedQuips';
import { worriedQuips } from './quips/worriedQuips';
import * as vscode from 'vscode';

/**
 * Generates a random quip based on the provided mood.
 * @param context - The extension context (for retrieving userName)
 * @param mood - The current mood ('happy'|'focused'|'worried')
 */
export function generateQuip(
  context: import('vscode').ExtensionContext,
  mood: 'happy' | 'focused' | 'worried'
): string {
  const userName = context.globalState.get<string>('userName') || 'Friend';
  let quips: string[];
  switch (mood) {
    case 'focused':
      quips = focusedQuips.map(q => q.replace('{user}', userName));
      break;
    case 'worried':
      quips = worriedQuips.map(q => q.replace('{user}', userName));
      break;
    case 'happy':
    default:
      quips = happyQuips.map(q => q.replace('{user}', userName));
      break;
  }
  return quips[Math.floor(Math.random() * quips.length)];
}