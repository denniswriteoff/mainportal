# Design System Documentation

This document describes the design system used in the Main Portal application.

## Design Principles

1. **Minimalism**: Clean, uncluttered interfaces with purposeful use of space
2. **Modularity**: Reusable components built with NextUI
3. **Consistency**: Unified visual language across all pages
4. **Accessibility**: WCAG compliant with keyboard navigation support
5. **Performance**: Optimized animations and lazy loading

## Technology Stack

- **NextUI v2**: Modern React UI library with built-in accessibility
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Smooth animations and transitions
- **Recharts**: Data visualization library

## Color Palette

### Primary (Soft Beige)
- 50: #fefef9 - Lightest tint
- 100: #fdfcf0
- 200: #faf8e0
- 300: #f5f3cc
- 400: #f0edb8
- **500: #E8E7BB - Primary** ⭐
- 600: #d4d299
- 700: #b8b676
- 800: #9c9a54
- 900: #7a783b - Darkest shade

This soft beige color provides a warm, calm, and professional aesthetic while maintaining excellent readability.

### Neutral
- **#1D1D1D**: Dark elements (sidebar, primary text)
- **#fafafa**: Main background (subtle off-white)
- **#ffffff**: Card backgrounds
- Gray-50 to Gray-900 for secondary text and borders

### Dark Elements
- **Sidebar**: #1D1D1D (dark black) with light icon hover states
- **Text**: #1D1D1D for headings and important text
- **Borders**: Light gray-100 (#f3f4f6) for subtle separation

### Contrast Philosophy
Inspired by professional accounting interfaces like [Writeoff](https://www.getwriteoff.com/) and modern SaaS dashboards:
- Dark sidebar (#1D1D1D) contrasts with light content area
- High contrast between text (#1D1D1D) and backgrounds
- Soft beige (#E8E7BB) for accents and interactive elements
- Clean, minimalistic approach with subtle shadows and borders

## Typography

### Font Family
- **Inter**: Primary font for all text
- System fonts as fallback: -apple-system, BlinkMacSystemFont, "Segoe UI"

### Font Sizes
- **xs**: 0.75rem (12px) - Small labels, captions
- **sm**: 0.875rem (14px) - Body text, descriptions
- **base**: 1rem (16px) - Default body text
- **lg**: 1.125rem (18px) - Large text
- **xl**: 1.25rem (20px) - Section titles
- **2xl**: 1.5rem (24px) - Page titles
- **3xl**: 1.875rem (30px) - Hero text

### Font Weights
- **normal**: 400 - Body text
- **medium**: 500 - Emphasized text
- **semibold**: 600 - Headings
- **bold**: 700 - Strong emphasis

## Components

### Sidebar
- **Width**: 64px (16 x 4px)
- **Background**: #1D1D1D (dark black)
- **Icons**: 20px (w-5 h-5)
- **Icon Colors**: Gray-400 (default), white (hover), primary text on beige (active)
- **Active state**: Primary beige background (#E8E7BB) with dark text
- **Hover state**: white/10 overlay for inactive icons
- **Logo**: Primary beige with dark text, elevated shadow

### Cards
- **Background**: White
- **Border**: 1px solid gray-100 (#f3f4f6)
- **Border Radius**: 12px (rounded-xl)
- **Shadow**: Subtle drop shadow (shadow-sm), elevates to shadow-md on hover
- **Padding**: 16-24px depending on content
- **Hover**: Smooth shadow transition for interactive feedback

### Buttons
- **Primary**: Soft beige background (#E8E7BB) with dark gray text
- **Secondary**: Light gray background
- **Sizes**: 
  - Small: 32px height
  - Medium: 40px height
  - Large: 48px height
- **Border Radius**: 8px (rounded-lg)

### Inputs
- **Variant**: Bordered (default)
- **Border**: 1px solid gray-300
- **Focus**: 2px primary border
- **Height**: 40px (default)
- **Border Radius**: 8px (rounded-lg)

### Charts
- **Height**: 280-300px
- **Bar Color**: Primary beige (#E8E7BB)
- **Border Radius**: 8px on top corners
- **Grid**: Light gray (#f0f0f0)
- **Axis**: Gray-400 (#94a3b8)

## Spacing Scale

Using Tailwind's default spacing scale (4px base):
- **1**: 4px - Micro spacing
- **2**: 8px - Tight spacing
- **3**: 12px - Small spacing
- **4**: 16px - Default spacing
- **5**: 20px - Medium spacing
- **6**: 24px - Large spacing
- **8**: 32px - Extra large spacing
- **12**: 48px - Section spacing

## Layout

### Container
- **Max Width**: 7xl (80rem/1280px)
- **Padding**: 24px (p-6)
- **Background**: Gray-50 (#f9fafb)

### Grid System
- **Columns**: 12-column grid
- **Gap**: 16px (gap-4) or 24px (gap-6)
- **Responsive**:
  - Mobile: 1 column
  - Tablet: 2 columns
  - Desktop: 3-4 columns

## Animations

### Transitions
- **Duration**: 200-300ms
- **Easing**: ease-out (default)
- **Properties**: background, color, transform, opacity

### Slide In Animation
```css
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## Icons

### Source
- Custom SVG icons
- Heroicons style (outline)
- **Size**: 20px (w-5 h-5) for navigation
- **Size**: 16px (w-4 h-4) for inline icons
- **Stroke Width**: 2px

## Responsive Breakpoints

- **sm**: 640px - Small devices
- **md**: 768px - Medium devices (tablets)
- **lg**: 1024px - Large devices (desktops)
- **xl**: 1280px - Extra large devices
- **2xl**: 1536px - 2X large devices

## Accessibility

### Color Contrast
- **Primary text (#1D1D1D)**: Exceeds WCAG AAA standard (contrast ratio > 7:1 on white)
- Large text: Exceeds 4.5:1 ratio
- Primary beige (#E8E7BB) with #1D1D1D text: High contrast, excellent readability
- Follows professional accounting UI standards for clarity and trust

### Focus States
- Visible focus ring (2px primary color)
- High contrast mode support
- Tab navigation optimized

### ARIA Labels
- All interactive elements labeled
- Screen reader friendly
- Semantic HTML structure

## Best Practices

### Component Structure
```tsx
// Clean, functional components
export default function ComponentName({ prop1, prop2 }: Props) {
  return (
    <Card>
      <CardBody>
        {/* Content */}
      </CardBody>
    </Card>
  );
}
```

### Styling Approach
1. Use NextUI components first
2. Add Tailwind utilities for spacing/sizing
3. Custom CSS only when necessary
4. Keep styles co-located with components

### Performance
- Lazy load charts and heavy components
- Use React.memo for expensive renders
- Optimize images (WebP format)
- Code splitting for routes

## Example Implementations

### Financial Card
```tsx
<Card className="border-none shadow-sm">
  <CardBody className="p-5">
    <span className="text-sm text-gray-600">Title</span>
    <div className="text-2xl font-bold">$1,234.56</div>
    <Chip color="success" size="sm">+12%</Chip>
  </CardBody>
</Card>
```

### Data Table Row
```tsx
<div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
  <Avatar size="sm" name="AB" />
  <div className="flex-1 px-3">
    <div className="text-sm font-medium">Name</div>
    <div className="text-xs text-gray-500">Detail</div>
  </div>
  <Chip size="sm" color="success">Status</Chip>
</div>
```

## Future Enhancements

- [ ] Dark mode support
- [ ] Theme customization
- [ ] Additional chart types
- [ ] Mobile-optimized layouts
- [ ] Animation library expansion
- [ ] Component documentation site

## Resources

- [NextUI Documentation](https://nextui.org)
- [Tailwind CSS](https://tailwindcss.com)
- [Framer Motion](https://www.framer.com/motion/)
- [Recharts](https://recharts.org)

