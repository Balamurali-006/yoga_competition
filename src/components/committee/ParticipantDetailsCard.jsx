import React from "react";

const ParticipantDetailsCard = ({ data }) => {
  return (
    <div style={styles.card}>
      <h3 style={styles.name}>{data.name}</h3>

      <p><strong>Age Group:</strong> {data.ageGroup}</p>
      <p><strong>Category:</strong> {data.category}</p>
      <p><strong>Level:</strong> {data.level}</p>
      <p><strong>Institution:</strong> {data.institution}</p>

      <div style={styles.status}>
        {data.paymentStatus === "success" ? (
          <span style={styles.allowed}>✔ Allowed</span>
        ) : (
          <span style={styles.denied}>✖ Not Allowed</span>
        )}
      </div>
    </div>
  );
};

const styles = {
  card: {
    background: "#F7F2EE",
    padding: "20px",
    borderRadius: "12px",
    width: "350px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  },
  name: {
    margin: "0 0 10px 0",
    color: "#7B5E57",
  },
  status: {
    marginTop: "15px",
  },
  allowed: {
    color: "green",
    fontWeight: "700",
  },
  denied: {
    color: "red",
    fontWeight: "700",
  },
};

export default ParticipantDetailsCard;
