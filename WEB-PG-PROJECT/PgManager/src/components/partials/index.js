/**
 * UI Partial Components Index
 * 
 * This module exports all reusable UI components (partials) for consistent
 * rendering across all views. These components follow the application's
 * design system and provide consistent styling.
 * 
 * Usage:
 * import { StatCard, PageHeader, Card, DataTable, LoadingSpinner } from '@/components/partials';
 */

// Layout Components
export { default as StatCard, StatCardVariants } from './StatCard';
export { default as PageHeader, TabbedPageHeader } from './PageHeader';
export { default as Card, CardGrid, StatCardGrid } from './Card';
export { default as DataTable } from './DataTable';
export { default as LoadingSpinner, PageLoader, SkeletonLoader } from './LoadingSpinner';

// Re-export ConfirmationModal from parent (already exists)
export { default as ConfirmationModal } from '../ConfirmationModal';

// Common UI patterns
export * from './StatCard';
export * from './PageHeader';
export * from './Card';
export * from './DataTable';
export * from './LoadingSpinner';
