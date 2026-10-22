const DEFAULT_DISCLAIMER =
  'This is a best-guess diagnosis based on the details you provided. If anything seems unsafe or does not match what you see, stop and contact a qualified professional.';

const DEFAULT_STOP_IF = [
  'The problem gets worse while you are checking it',
  'You notice heat, smoke, burning smells, or signs of electrical risk',
  'A shutoff, breaker, or safety control does not respond as expected',
];

function normalizeSuitability(value) {
  const text = String(value || '').trim().toLowerCase();

  if (text === 'beginner-friendly') return 'Beginner-friendly';
  if (text === 'professional recommended') return 'Professional recommended';
  return 'Use caution';
}

export function getSuitabilityMeta(value, colors) {
  const suitability = normalizeSuitability(value);

  if (suitability === 'Beginner-friendly') {
    return {
      label: suitability,
      tone: 'calm',
      cardBackground: colors.cardHighlight,
      cardBorder: colors.border,
      titleColor: colors.text,
      accentColor: colors.primary,
      badgeBackground: colors.surfaceMuted,
      badgeBorder: colors.border,
      badgeText: colors.primary,
      summary:
        'This looks like a reasonable DIY project if the situation matches what you are seeing.',
      decisionHeading: 'This looks approachable for many homeowners',
      decisionText:
        'If you feel comfortable with the tools and the repair matches what you see, the guided steps are a good next move.',
      primaryTitle: "LET'S DO IT",
      secondaryTitle: 'Connect to a Pro',
      emphasizePro: false,
    };
  }

  if (suitability === 'Professional recommended') {
    return {
      label: suitability,
      tone: 'warning',
      cardBackground: colors.warningBackground,
      cardBorder: colors.warningBorder,
      titleColor: colors.warningText,
      accentColor: colors.warning,
      badgeBackground: colors.warningBackground,
      badgeBorder: colors.warningBorder,
      badgeText: colors.warningText,
      summary:
        'This issue may carry more risk or uncertainty than a typical DIY repair.',
      decisionHeading: 'Professional help is the safer next step here',
      decisionText:
        'If anything feels uncertain, unsafe, or beyond your comfort level, reaching out to a licensed professional is the better path.',
      primaryTitle: 'Connect to a Pro',
      secondaryTitle: "LET'S DO IT",
      emphasizePro: true,
    };
  }

  return {
    label: suitability,
    tone: 'balanced',
    cardBackground: '#FFF4DF',
    cardBorder: '#D9B06A',
    titleColor: '#74480B',
    accentColor: '#B57718',
    badgeBackground: '#FFE8B8',
    badgeBorder: '#C99843',
    badgeText: '#74480B',
    summary:
      'This may be manageable, but it is worth moving slowly and watching for signs to stop.',
    decisionHeading: 'A little extra caution makes sense here',
    decisionText:
      'You can continue with guided help, or choose professional support if the repair feels more involved than expected.',
    primaryTitle: "LET'S DO IT",
    secondaryTitle: 'Connect to a Pro',
    emphasizePro: false,
  };
}

export function getDisclaimerText(disclaimer) {
  return disclaimer || DEFAULT_DISCLAIMER;
}

export function getStopIfList(stopIf = []) {
  return Array.isArray(stopIf) && stopIf.length > 0 ? stopIf : DEFAULT_STOP_IF;
}
