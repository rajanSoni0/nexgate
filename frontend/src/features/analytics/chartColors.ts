import { useEffect, useState } from 'react';
import { useTheme } from '@/theme/ThemeProvider';

export interface ChartColors {
  accent: string;
  success: string;
  danger: string;
  warning: string;
  grid: string;
  axis: string;
  surface: string;
  fg: string;
}

function read(): ChartColors {
  const style = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    accent: get('--app-accent', '#2f6feb'),
    success: get('--app-success', '#12a150'),
    danger: get('--app-danger', '#d93d42'),
    warning: get('--app-warning', '#d98e04'),
    grid: get('--app-line', '#e2e7ee'),
    axis: get('--app-fg-subtle', '#7a889d'),
    surface: get('--app-surface', '#ffffff'),
    fg: get('--app-fg', '#0f1b2d'),
  };
}

/** SVG presentation attributes can't use CSS variables reliably, so resolve them per theme. */
export function useChartColors(): ChartColors {
  const { resolved } = useTheme();
  const [colors, setColors] = useState(read);
  useEffect(() => setColors(read()), [resolved]);
  return colors;
}
