function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function getLatestAssistantTurn(turns = []) {
  const normalizedTurns = asArray(turns);
  for (let index = normalizedTurns.length - 1; index >= 0; index -= 1) {
    const turn = normalizedTurns[index];
    if (turn && turn.role === 'assistant') {
      return turn;
    }
  }
  return null;
}

export function getLatestAssistantTurnId(turns = []) {
  const latestAssistantTurn = getLatestAssistantTurn(turns);
  return String(latestAssistantTurn?.id || '').trim();
}

export function shouldScrollToAssistantTurn(latestAssistantTurnId, lastScrolledAssistantTurnId) {
  const nextId = String(latestAssistantTurnId || '').trim();
  const previousId = String(lastScrolledAssistantTurnId || '').trim();
  return Boolean(nextId) && nextId !== previousId;
}
