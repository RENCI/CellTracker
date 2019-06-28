import React, { useEffect } from 'react';

const useTooltip = ref => {
  useEffect(() => {
    // Enable and hide tooltips
    const tooltips = $(ref.current).find("[data-toggle='tooltip']");
    tooltips.tooltip();
    tooltips.tooltip("hide");

    return () => {
      // Hide any open tooltips
      $(ref.current).find("[data-toggle='tooltip']").tooltip("hide");
    }
  });
}

export default useTooltip;