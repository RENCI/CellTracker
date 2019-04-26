import React, { useRef, useState } from "react";

const SizeContainer = () => {
  const ref = useRef(null);
  const [size, setSize] = useState({width: 1, height: 1});

  useEffect(() => {
    const width = ref.current.clientWidth,
          height = ref.current.clientHeight;

    if (size.width !== width ||
        size.height !== height) {
      setSize({
        width: width, 
        height: height
      }); 
    }
  });

  return (
    <div ref={ref}>
      {React.cloneElement(this.props.children, size)}
    </div>
  );
}

export default SizeContainer;
