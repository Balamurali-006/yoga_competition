import React from "react";

const Footer = () => {
  return (
    <footer
      style={{
        background: "#7B5E57",
        color: "white",
        textAlign: "center",
        padding: "20px",
        marginTop: "50px"
      }}
    >
      © {new Date().getFullYear()} Ekadhma Yoga Association – All Rights Reserved
    </footer>
  );
};

export default Footer;
