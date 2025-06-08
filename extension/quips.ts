export function generateQuip(context: import('vscode').ExtensionContext): string {
  const userName = context.globalState.get<string>('userName') || 'Friend';
  const quips = [
    `Keep going, ${userName}!`,
    `${userName}, you're doing great!`,
    `Don't forget to take breaks, ${userName}.`,
    `One step at a time, ${userName}.`,
    `Did you remember to drink water, ${userName}?`,
    `Believe in yourself, ${userName}!`,
    `Every bug you squash is a victory, ${userName}!`,
    `Your code is poetry, ${userName}.`,
    `May your builds be green, ${userName}!`,
    `Happy coding, ${userName}!`,
    `You make the terminal a better place, ${userName}.`,
    `Keep those commits coming, ${userName}!`,
    `Debugging is just another word for problem-solving, ${userName}.`,
    `Your Wisp is proud of you, ${userName}!`,
    `Ship it, ${userName}!`,
    `One more line of code, ${userName}!`  
  ];
  return quips[Math.floor(Math.random() * quips.length)];
}
