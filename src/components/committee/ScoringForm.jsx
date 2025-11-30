import React, { useState } from "react";

const ScoringForm = () => {
  const [form, setForm] = useState({
    asana1: "",
    asana2: "",
    asana3: "",
    asana4: "",
    asana5: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Scores submitted — Firebase integration coming soon!");
  };

  return (
    <div style={styles.container}>
      <h2>Enter Asana Scores</h2>

      <form onSubmit={handleSubmit} style={styles.form}>
        {Object.keys(form).map((field, index) => (
          <div key={index} style={styles.row}>
            <label>{`Asana ${index + 1}`}</label>
            <input
              type="number"
              name={field}
              value={form[field]}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
        ))}

        <button type="submit" style={styles.button}>
          Submit Scores
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    padding: "40px",
  },
  form: {
    maxWidth: "400px",
  },
  row: {
    marginBottom: "14px",
    display: "flex",
    flexDirection: "column",
  },
  input: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },
  button: {
    padding: "10px 20px",
    background: "#7B5E57",
    color: "white",
    marginTop: "20px",
    width: "100%",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontWeight: "600",
  },
};

export default ScoringForm;
