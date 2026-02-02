/**
 * CSS Module Type Declarations
 * Provides TypeScript support for CSS imports
 */

// CSS Modules (.module.css)
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// Regular CSS files
declare module '*.css' {
  const content: string;
  export default content;
}

// SCSS Modules
declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// Regular SCSS files
declare module '*.scss' {
  const content: string;
  export default content;
}

// LESS Modules
declare module '*.module.less' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// Regular LESS files
declare module '*.less' {
  const content: string;
  export default content;
}
