import React, { useState } from "react";

const EventForm = () => {
  const [event, setEvent] = useState({
    name: "",
    code: "",
    level: "",
    location: "",
    date: "",
  });

  const handleChange = (e) =>
    setEvent({ ...event, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Event Saved (Firebase Coming Soon)");
  };

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>➕ Create / Edit Event</h2>

      <form onSubmit={handleSubmit} style={styles.form}>
        <label>Event Name</label>
        <input name="name" onChange={handleChange} style={styles.input} />

        <label>Event Code</label>
        <input name="code" onChange={handleChange} style={styles.input} />

        <label>Level</label>
        <select name="level" onChange={handleChange} style={styles.input}>
          <option value="">Select Level</option>
          <option value="district">District</option>
          <option value="state">State</option>
          <option value="south">South India</option>
          <option value="national">National</option>
        </select>

        <label>Location</label>
        <input name="location" onChange={handleChange} style={styles.input} />

        <label>Date</label>
        <input type="date" name="date" onChange={handleChange} style={styles.input} />

        <button style={styles.button}>Save Event</button>
      </form>
    </div>
  );
};

const styles = {
  page: { padding: "30px" },
  heading: {
    color: "#7B5E57",
    marginBottom: "20px",
    fontSize: "26px",
    fontWeight: "700",
  },
  form: {
    background: "#FFF",
    borderRadius: "12px",
    padding: "25px",
    maxWidth: "400px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  input: {
    padding: "10px",
    marginBottom: "15px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    fontSize: "15px",
  },
  button: {
    width: "100%",
    padding: "12px",
    background: "#7B5E57",
    color: "#FFF",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: "700",
    marginTop: "10px",
  },
};

export default EventForm;
