// Invoke the supplied callback whenever the iframe changes width, which
// accounts for scrollbars being added/removed.
// Adapted from: https://gist.github.com/AdamMcCormick/d5f718d2e9569acdf7def25e8266bb2a

import React, { useRef, useEffect } from "react";
import PropTypes from "prop-types";

const style = {
  height: 0,
  margin: 0,
  padding: 0,
  overflow: "hidden",
  borderWidth: 0,
  position: "absolute",
  backgroundColor: "transparent",
  width: "100%"
};

const ResizeListener = props => {
  const ref = useRef(null);

  useEffect(() => {
    ref.current.contentWindow.addEventListener("resize", props.onResize, false);

    return () => {
      ref.current.contentWindow.removeEventListener("resize", props.onResize);
    }
  }, []);

  return <iframe ref={ref} style={style} />
}

ResizeListener.propTypes = {
  onResize: PropTypes.func.isRequired
};

export default ResizeListener;