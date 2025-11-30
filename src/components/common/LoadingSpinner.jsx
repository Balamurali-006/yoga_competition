import React from "react";

const LoadingSpinner = () => {
  return (
    <div style={styles.wrapper}>
      <div style={styles.spinner}></div>
    </div>
  );
};

const styles = {
  wrapper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "30px",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #ccc",
    borderTop: "4px solid #7B5E57",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
};

// Add this in App.css or index.css
// @keyframes spin {
//     from { transform: rotate(0deg); }
//     to { transform: rotate(360deg); }
// }

export default LoadingSpinner;
