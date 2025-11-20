// Initialize Bootstrap JavaScript components
export const initBootstrap = () => {
  if (typeof window !== 'undefined') {
    // Bootstrap will auto-initialize components with data attributes
    // But we can manually initialize if needed
    import('bootstrap').then((bootstrap) => {
      // Initialize tooltips and popovers if needed
      const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
      tooltipTriggerList.map((tooltipTriggerEl: any) => {
        return new bootstrap.Tooltip(tooltipTriggerEl);
      });

      const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
      popoverTriggerList.map((popoverTriggerEl: any) => {
        return new bootstrap.Popover(popoverTriggerEl);
      });
    });
  }
};

