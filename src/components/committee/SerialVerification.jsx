import React, { useState } from "react";
import ParticipantDetailsCard from "./ParticipantDetailsCard";

const SerialVerification = () => {
  const [serial, setSerial] = useState("");
  const [participant, setParticipant] = useState(null);

  const handleSearch = () => {
    // Firebase search will come later
    setParticipant({
      name: "Sample Participant",
      ageGroup: "Under 14",
      category: "Forward",
      level: "District",
      institution: "CIT Coimbatore",
      paymentStatus: "success",
    });
  };

  return (
    <div style={styles.container}>
      <h2>Verify Participant</h2>

      <div style={styles.inputRow}>
        <input
          type="text"
          placeholder="Enter Serial Number"
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
          style={styles.input}
        />
        <button onClick={handleSearch} style={styles.button}>
          Search
        </button>
      </div>

      {participant && <ParticipantDetailsCard data={participant} />}
    </div>
  );
};

const styles = {
  container: {
    padding: "40px",
  },
  inputRow: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
  },
  input: {
    flex: 1,
    padding: "10px",
    fontSize: "16px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },
  button: {
    padding: "10px 20px",
    background: "#7B5E57",
    color: "white",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontWeight: "600",
  },
};

export default SerialVerification;
