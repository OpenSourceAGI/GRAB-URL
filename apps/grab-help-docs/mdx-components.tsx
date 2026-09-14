import * as TabsComponents from 'fumadocs-ui/components/tabs';
import { File, Folder, Files } from 'fumadocs-ui/components/files';
import defaultComponents from 'fumadocs-ui/mdx';
import { APIPage } from '@/components/fumadocs/api/api-page';
import { StackBlitzExample } from '@/components/docs/stackblitz-example';
import {
  LoadingAnimationsDemo,
  LoadingSvgGallery,
  SpinnerVariants,
} from '@/components/docs/loading-animations-demo';
import { QuantumSpherePreview } from '@/components/docs/quantum-sphere-demo';
import type { MDXComponents } from 'mdx/types';
// make sure you can use it in MDX files


export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...TabsComponents,
    ...defaultComponents,
    // @ts-ignore
    APIPage,
    File,
    Folder,
    Files,
    StackBlitzExample,
    LoadingAnimationsDemo,
    LoadingSvgGallery,
    QuantumSpherePreview,
    SpinnerVariants,
    ...components,
  };
}
