export interface LogoVariant {
  id: 'a' | 'b' | 'c';
  name: string;
  note: string;
  viewBox: string;
  letters: string;
  tail: string;
}

export const logoVariants: LogoVariant[] = [
  {
    id: 'a',
    name: 'Geometric',
    note: 'Circle and two half-circles on a shared baseline. Calm, closest to the Geist letterforms.',
    viewBox: '0 0 290 220',
    letters:
      'M50 100 A40 40 0 0 0 90 60 A40 40 0 0 0 50 20 A40 40 0 0 0 10 60 A40 40 0 0 0 50 100 L140 100 A20 20 0 0 0 160 80 A20 20 0 0 0 140 60 A20 20 0 0 1 120 40 A20 20 0 0 1 140 20 L170 20',
    tail: 'M170 20 L226 20 A34 34 0 0 1 260 54 L260 220',
  },
  {
    id: 'b',
    name: 'Trace',
    note: 'Chosen. Straight segments with rounded corners, like a circuit trace or a plotter drawing. The S is as wide as the O.',
    viewBox: '0 0 290 220',
    letters:
      'M50 100 L74 100 Q90 100 90 84 L90 36 Q90 20 74 20 L26 20 Q10 20 10 36 L10 84 Q10 100 26 100 L176 100 Q192 100 192 84 L192 76 Q192 60 176 60 L136 60 Q120 60 120 44 L120 36 Q120 20 136 20 L192 20',
    tail: 'M192 20 L246 20 Q270 20 270 44 L270 220',
  },
  {
    id: 'c',
    name: 'Thread',
    note: 'The same idea drawn freehand with soft curves: the O flows into the S and the line falls away in a loose arc. Most alive, least strict.',
    viewBox: '0 0 290 220',
    letters:
      'M48 102 C68 102 82 82 82 60 C82 36 66 18 48 18 C28 18 14 38 14 60 C14 84 28 102 48 102 C76 102 104 104 128 102 C150 100 160 88 156 76 C152 64 138 62 132 60 C120 56 114 44 120 33 C127 20 148 18 164 24',
    tail: 'M164 24 C206 38 232 64 232 110 L232 220',
  },
];

export const logo = logoVariants.find((v) => v.id === 'b')!;

export const LOGO_BOX = { x: 10, y: 20, width: 182, height: 80 };

export const logoMark = {
  d: logo.letters,
  viewBox: `${LOGO_BOX.x - 6} ${LOGO_BOX.y - 6} ${LOGO_BOX.width + 12} ${LOGO_BOX.height + 12}`,
};
