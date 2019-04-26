import React, { useEffect } from 'react';

const useTooltip = ref => {
  useEffect(() => {
    // Enable tooltips
    $(ref.current).find("[data-toggle='tooltip']").tooltip();

    return () => {
      // Hide any open tooltips
      $(ref.current).find("[data-toggle='tooltip']").tooltip("hide");
    }
  }, []);
}

export default useTooltip;