import React, { useState } from "react";

const CategoryForm = () => {
  const [cat, setCat] = useState({ name: "", eventId: "", description: "" });

  const handleChange = (e) =>
    setCat({ ...cat, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Category Saved");
  };

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>🧘 Add Yoga Category</h2>

      <form style={styles.form} onSubmit={handleSubmit}>
        <label>Category Name</label>
        <input name="name" onChange={handleChange} style={styles.input} />

        <label>Event ID</label>
        <input name="eventId" onChange={handleChange} style={styles.input} />

        <label>Description</label>
        <textarea
          name="description"
          rows="3"
          onChange={handleChange}
          style={styles.textarea}
        ></textarea>

        <button style={styles.button}>Save Category</button>
      </form>
    </div>
  );
};

const styles = {
  ...basicAdminStyles,
};

export default CategoryForm;

const basicAdminStyles = {
  page: { padding: "30px" },
  heading: {
    color: "#7B5E57",
    marginBottom: "20px",
    fontSize: "26px",
    fontWeight: "700",
  },
  form: {
    background: "#FFF",
    padding: "25px",
    borderRadius: "12px",
    maxWidth: "400px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  input: {
    padding: "10px",
    marginBottom: "15px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "15px",
  },
  textarea: {
    padding: "10px",
    marginBottom: "15px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "15px",
  },
  button: {
    width: "100%",
    padding: "12px",
    background: "#7B5E57",
    color: "white",
    borderRadius: "8px",
    fontWeight: "700",
    cursor: "pointer",
  },
};
