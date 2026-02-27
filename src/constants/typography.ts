import type { TextStyle } from 'react-native';

type TypographyMap = {
  H1: TextStyle;
  H2: TextStyle;
  H3: TextStyle;
  Body: TextStyle;
  Caption: TextStyle;
};

export const Typography: TypographyMap = {
  H1: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  H2: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  H3: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  Body: { fontSize: 16, fontWeight: '400', lineHeight: 22 },
  Caption: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
};
