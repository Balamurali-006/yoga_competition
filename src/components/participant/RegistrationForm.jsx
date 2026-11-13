import React, { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";

const TEST_FORM_DATA = {
  name: "Aarav Kumar",
  dob: "2013-05-10",
  age: "12",
  institution: "Green Valley School",
  instructor: "Ravi Sharma",
  instructorPhone: "9876543210",
  email: "aarav.kumar@test.com",
  event: "district",
  category: "forward",
  level: "district",
};

const emptyForm = {
  name: "",
  dob: "",
  age: "",
  institution: "",
  instructor: "",
  instructorPhone: "",
  email: "",
  event: "",
  category: "",
  level: "",
};

const RegistrationForm = () => {
  const [form, setForm] = useState(() => {
    if (process.env.NODE_ENV === "development") {
      return TEST_FORM_DATA;
    }
    return emptyForm;
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const fillTestData = () => {
    setForm(TEST_FORM_DATA);
    setErrors({});
  };

  const clearForm = () => {
    setForm(emptyForm);
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }

    if (name === "dob" && value) {
      const today = new Date();
      const birthDate = new Date(value);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setForm((prev) => ({ ...prev, age: age.toString() }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.dob) newErrors.dob = "Date of birth is required";
    if (!form.age) newErrors.age = "Age is required";
    if (!form.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = "Email is invalid";
    if (!form.institution.trim()) newErrors.institution = "Institution is required";
    if (!form.instructor.trim()) newErrors.instructor = "Instructor name is required";
    if (!form.instructorPhone.trim()) newErrors.instructorPhone = "Phone is required";
    else if (!/^\d{10}$/.test(form.instructorPhone.replace(/\D/g, ""))) 
      newErrors.instructorPhone = "Phone must be 10 digits";
    if (!form.event) newErrors.event = "Please select an event";
    if (!form.category) newErrors.category = "Please select a category";
    if (!form.level) newErrors.level = "Please select a level";
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare participant data
      const participantData = {
        name: form.name,
        dob: form.dob,
        age: Number(form.age),
        institution: form.institution,
        instructor: form.instructor,
        instructorPhone: form.instructorPhone,
        email: form.email,
        event: form.event,
        category: form.category,
        level: form.level,
        paymentStatus: "pending",
        serialNumber: null,
        createdAt: serverTimestamp(),
      };

      // Save to Firestore collection "participants"
      const docRef = await addDoc(collection(db, "participants"), participantData);

      // Redirect user to payment page
      navigate(`/pay/${docRef.id}`);
    } catch (error) {
      console.error("Firestore Error:", error);
      alert("❌ Failed to save participant details.");
      setIsSubmitting(false);
    }
  };

  const inputClass = (fieldName) =>
    `w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none ${
      errors[fieldName]
        ? "border-red-400 focus:border-red-500 bg-red-50"
        : "border-gray-200 focus:border-purple-500 focus:bg-white"
    }`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-orange-500 rounded-full mb-4 shadow-lg">
            <span className="text-4xl">🧘</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-3">
            <span className="bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">
              Individual Registration
            </span>
          </h2>
          <p className="text-gray-600 text-lg">
            Join the Ekadhma Yoga Competition 2025
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 space-y-6">
          {process.env.NODE_ENV === "development" && (
            <div className="flex flex-wrap gap-3 justify-end">
              <button
                type="button"
                onClick={fillTestData}
                className="px-4 py-2 rounded-lg bg-purple-100 text-purple-700 font-medium hover:bg-purple-200 transition-colors"
              >
                Load Test Data
              </button>
              <button
                type="button"
                onClick={clearForm}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
              >
                Clear Form
              </button>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
              <span>👤</span>
              <span>Personal Information</span>
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className={inputClass("name")}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                    <span>⚠️</span>
                    <span>{errors.name}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  className={inputClass("email")}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                    <span>⚠️</span>
                    <span>{errors.email}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="dob"
                  value={form.dob}
                  onChange={handleChange}
                  className={inputClass("dob")}
                />
                {errors.dob && (
                  <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                    <span>⚠️</span>
                    <span>{errors.dob}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="age"
                  value={form.age}
                  onChange={handleChange}
                  placeholder="Auto-calculated"
                  className={inputClass("age")}
                  readOnly
                />
                {errors.age && (
                  <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                    <span>⚠️</span>
                    <span>{errors.age}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
              <span>🏫</span>
              <span>Institution Details</span>
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Institution Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="institution"
                value={form.institution}
                onChange={handleChange}
                placeholder="School / College / Institution"
                className={inputClass("institution")}
              />
              {errors.institution && (
                <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                  <span>⚠️</span>
                  <span>{errors.institution}</span>
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="instructor"
                  value={form.instructor}
                  onChange={handleChange}
                  placeholder="Yoga instructor"
                  className={inputClass("instructor")}
                />
                {errors.instructor && (
                  <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                    <span>⚠️</span>
                    <span>{errors.instructor}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructor Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="instructorPhone"
                  value={form.instructorPhone}
                  onChange={handleChange}
                  placeholder="10-digit number"
                  className={inputClass("instructorPhone")}
                />
                {errors.instructorPhone && (
                  <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                    <span>⚠️</span>
                    <span>{errors.instructorPhone}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
              <span>🏆</span>
              <span>Competition Details</span>
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="event"
                  value={form.event}
                  onChange={handleChange}
                  className={inputClass("event")}
                >
                  <option value="">Select Event</option>
                  <option value="district">🏘️ District Level</option>
                  <option value="state">🗺️ State Level</option>
                  <option value="national">🌏 National Level</option>
                </select>
                {errors.event && (
                  <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                    <span>⚠️</span>
                    <span>{errors.event}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Level <span className="text-red-500">*</span>
                </label>
                <select
                  name="level"
                  value={form.level}
                  onChange={handleChange}
                  className={inputClass("level")}
                >
                  <option value="">Select Level</option>
                  <option value="district">District</option>
                  <option value="state">State</option>
                  <option value="south-india">South India</option>
                  <option value="national">National</option>
                </select>
                {errors.level && (
                  <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                    <span>⚠️</span>
                    <span>{errors.level}</span>
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className={inputClass("category")}
              >
                <option value="">Select Category</option>
                <option value="forward">⬆️ Forward Bending</option>
                <option value="backward">⬇️ Backward Bending</option>
                <option value="twist">🔄 Twist</option>
                <option value="balance">⚖️ Balance</option>
                <option value="standing">🧍 Standing</option>
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                  <span>⚠️</span>
                  <span>{errors.category}</span>
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform ${
              isSubmitting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 hover:shadow-xl hover:scale-105"
            } text-white shadow-lg`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center space-x-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Submitting...</span>
              </span>
            ) : (
              "Submit Registration"
            )}
          </button>

          <p className="text-center text-sm text-gray-500">
            By submitting, you agree to our terms and conditions
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationForm;